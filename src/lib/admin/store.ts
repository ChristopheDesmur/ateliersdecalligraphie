import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const GITHUB_OWNER = process.env.GITHUB_OWNER || "ChristopheDesmur";
const GITHUB_REPO = process.env.GITHUB_REPO || "ateliersdecalligraphie";
const GIT_AUTHOR = { name: "Admin ateliersdecalligraphie.com", email: "admin@ateliersdecalligraphie.com" };

function isServerless(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

function getGitHubToken(): string | undefined {
  return process.env.GITHUB_TOKEN?.trim();
}

interface GitHubTarget {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

function getGitHubTarget(): GitHubTarget {
  const token = getGitHubToken();
  if (!token) {
    throw new Error(
      "GITHUB_TOKEN n'est pas configuré. Ajoutez un jeton d'accès personnel GitHub (permission Contents: Read and write) dans les variables d'environnement Vercel pour permettre l'enregistrement."
    );
  }
  return {
    token,
    owner: process.env.GITHUB_OWNER || GITHUB_OWNER,
    repo: process.env.GITHUB_REPO || GITHUB_REPO,
    branch: process.env.GITHUB_BRANCH || "main",
  };
}

async function githubRequest(target: GitHubTarget, endpoint: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`https://api.github.com${endpoint}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${target.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "admin-content-store",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let detail = text;
    try {
      detail = JSON.parse(text).message || text;
    } catch {
      /* keep raw text */
    }
    const err = new Error(`Erreur GitHub API (${res.status}) sur ${endpoint} : ${detail}`);
    (err as any).status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

/** Lit un fichier texte du dépôt, depuis GitHub en environnement serverless, sinon depuis le disque local. */
export async function loadTextFile(relativePath: string): Promise<string> {
  const cleanPath = relativePath.replace(/^\/+/, "");

  if (isServerless() || getGitHubToken()) {
    try {
      const target = getGitHubTarget();
      const data = await githubRequest(
        target,
        `/repos/${target.owner}/${target.repo}/contents/${cleanPath}?ref=${encodeURIComponent(target.branch)}`
      );
      return Buffer.from(data.content, "base64").toString("utf8");
    } catch (err) {
      if (isServerless()) throw err;
      // En local sans token valide, on retombe sur le disque.
    }
  }

  const fullPath = path.join(process.cwd(), cleanPath);
  if (fs.existsSync(fullPath)) return fs.readFileSync(fullPath, "utf8");
  throw new Error(`Fichier introuvable : ${cleanPath}`);
}

export interface SaveResult {
  mode: "github" | "local";
  commitUrl?: string;
  commitSha?: string;
}

/** Écrit et publie un fichier texte : commit direct sur GitHub en serverless/production, ou écriture + commit git local en développement. */
export async function saveTextFile(relativePath: string, rawContent: string, commitMessage: string): Promise<SaveResult> {
  const cleanPath = relativePath.replace(/^\/+/, "");
  // La suppression d'un élément de séquence YAML entrecoupé de lignes vides
  // laisse une ligne vide orpheline (artefact du sérialiseur) ; on la
  // resserre pour garder le fichier lisible au fil des éditions successives.
  const content = rawContent.replace(/\n{3,}/g, "\n\n");

  if (isServerless() || getGitHubToken()) {
    const target = getGitHubTarget();
    const headers = { "Content-Type": "application/json" };

    const refData = await githubRequest(
      target,
      `/repos/${target.owner}/${target.repo}/git/ref/heads/${encodeURIComponent(target.branch)}`
    );
    const latestCommitSha = refData.object.sha;

    const commitData = await githubRequest(target, `/repos/${target.owner}/${target.repo}/git/commits/${latestCommitSha}`);
    const baseTreeSha = commitData.tree.sha;

    const treeData = await githubRequest(target, `/repos/${target.owner}/${target.repo}/git/trees`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: [{ path: cleanPath, mode: "100644", type: "blob", content }],
      }),
    });

    const now = new Date().toISOString();
    const newCommitData = await githubRequest(target, `/repos/${target.owner}/${target.repo}/git/commits`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        message: commitMessage,
        tree: treeData.sha,
        parents: [latestCommitSha],
        author: { ...GIT_AUTHOR, date: now },
        committer: { ...GIT_AUTHOR, date: now },
      }),
    });
    const newCommitSha = newCommitData.sha;

    await githubRequest(target, `/repos/${target.owner}/${target.repo}/git/refs/heads/${encodeURIComponent(target.branch)}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ sha: newCommitSha, force: false }),
    });

    return {
      mode: "github",
      commitSha: newCommitSha,
      commitUrl: `https://github.com/${target.owner}/${target.repo}/commit/${newCommitSha}`,
    };
  }

  const fullPath = path.join(process.cwd(), cleanPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf8");

  try {
    execFileSync("git", ["add", cleanPath], { cwd: process.cwd() });
    execFileSync("git", ["commit", "-m", commitMessage], { cwd: process.cwd() });
  } catch (err: any) {
    console.warn("[saveTextFile] commit git local ignoré :", err.message);
  }

  return { mode: "local" };
}

/** Écrit et publie un fichier binaire (image) : commit direct sur GitHub en serverless/production, ou écriture + commit git local en développement. */
export async function saveBinaryFile(relativePath: string, buffer: Buffer, commitMessage: string): Promise<SaveResult> {
  const cleanPath = relativePath.replace(/^\/+/, "");

  if (isServerless() || getGitHubToken()) {
    const target = getGitHubTarget();
    const headers = { "Content-Type": "application/json" };

    const blobData = await githubRequest(target, `/repos/${target.owner}/${target.repo}/git/blobs`, {
      method: "POST",
      headers,
      body: JSON.stringify({ content: buffer.toString("base64"), encoding: "base64" }),
    });

    const refData = await githubRequest(
      target,
      `/repos/${target.owner}/${target.repo}/git/ref/heads/${encodeURIComponent(target.branch)}`
    );
    const latestCommitSha = refData.object.sha;

    const commitData = await githubRequest(target, `/repos/${target.owner}/${target.repo}/git/commits/${latestCommitSha}`);
    const baseTreeSha = commitData.tree.sha;

    const treeData = await githubRequest(target, `/repos/${target.owner}/${target.repo}/git/trees`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: [{ path: cleanPath, mode: "100644", type: "blob", sha: blobData.sha }],
      }),
    });

    const now = new Date().toISOString();
    const newCommitData = await githubRequest(target, `/repos/${target.owner}/${target.repo}/git/commits`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        message: commitMessage,
        tree: treeData.sha,
        parents: [latestCommitSha],
        author: { ...GIT_AUTHOR, date: now },
        committer: { ...GIT_AUTHOR, date: now },
      }),
    });
    const newCommitSha = newCommitData.sha;

    await githubRequest(target, `/repos/${target.owner}/${target.repo}/git/refs/heads/${encodeURIComponent(target.branch)}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ sha: newCommitSha, force: false }),
    });

    return {
      mode: "github",
      commitSha: newCommitSha,
      commitUrl: `https://github.com/${target.owner}/${target.repo}/commit/${newCommitSha}`,
    };
  }

  const fullPath = path.join(process.cwd(), cleanPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, buffer);

  try {
    execFileSync("git", ["add", cleanPath], { cwd: process.cwd() });
    execFileSync("git", ["commit", "-m", commitMessage], { cwd: process.cwd() });
  } catch (err: any) {
    console.warn("[saveBinaryFile] commit git local ignoré :", err.message);
  }

  return { mode: "local" };
}
