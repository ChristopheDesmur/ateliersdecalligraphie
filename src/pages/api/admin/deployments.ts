export const prerender = false;

import type { APIRoute } from "astro";
import { authenticateRequest } from "@/lib/admin/auth";

const NO_CACHE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

export const GET: APIRoute = async ({ request, url }) => {
  const { session } = authenticateRequest(request);
  if (!session) {
    return new Response(JSON.stringify({ error: "Accès non autorisé." }), {
      status: 401,
      headers: NO_CACHE_HEADERS,
    });
  }

  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "20", 10), 5), 50);

  const token =
    process.env.VERCEL_TOKEN ||
    process.env.VERCEL_API_TOKEN ||
    process.env.VERCEL_ACCESS_TOKEN ||
    process.env.VERCEL_AUTH_TOKEN;

  const projectId =
    process.env.VERCEL_PROJECT_ID ||
    process.env.PROJECT_ID ||
    process.env.VERCEL_GIT_REPO_ID ||
    "ateliersdecalligraphie";

  const teamId =
    process.env.VERCEL_TEAM_ID ||
    process.env.TEAM_ID ||
    process.env.VERCEL_TEAM_SLUG;

  const vercelDashboardUrl = "https://vercel.com/*/~/deployments";

  if (!token) {
    return new Response(
      JSON.stringify({
        configured: false,
        error:
          "Le jeton d'accès Vercel (VERCEL_TOKEN) n'est pas configuré. Veuillez définir la variable d'environnement VERCEL_TOKEN dans les paramètres de votre projet Vercel.",
        projectId,
        vercelDashboardUrl,
        deployments: [],
      }),
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const endpoint = new URL("https://api.vercel.com/v6/deployments");
  endpoint.searchParams.set("projectId", projectId);
  endpoint.searchParams.set("limit", String(limit));
  if (teamId) endpoint.searchParams.set("teamId", teamId);

  try {
    const res = await fetch(endpoint.toString(), { headers });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg =
        errData?.error?.message ||
        errData?.message ||
        (res.status === 401
          ? "Jeton d'accès Vercel non valide ou expiré."
          : res.status === 403
          ? "Accès refusé à l'API Vercel pour ce projet ou cette équipe."
          : `Erreur API Vercel (${res.status})`);

      return new Response(
        JSON.stringify({
          configured: true,
          error: msg,
          status: res.status,
          projectId,
          vercelDashboardUrl,
          deployments: [],
        }),
        { status: 200, headers: NO_CACHE_HEADERS }
      );
    }

    const data = await res.json();
    const rawDeployments = Array.isArray(data?.deployments) ? data.deployments : [];

    const deployments = rawDeployments.map((d: any) => ({
      uid: d.uid,
      name: d.name,
      url: d.url ? `https://${d.url}` : null,
      created: d.created,
      state: d.state,
      target: d.target || "preview",
      inspectorUrl: d.inspectorUrl || null,
      commit: {
        message: d.meta?.githubCommitMessage || d.meta?.commitMessage || null,
        ref: d.meta?.githubCommitRef || d.meta?.branch || "main",
        sha: d.meta?.githubCommitSha || d.meta?.commitSha || null,
        author: d.meta?.githubCommitAuthorName || d.creator?.username || d.creator?.email || "Vercel",
      },
      creator: {
        username: d.creator?.username || null,
        email: d.creator?.email || null,
      },
    }));

    return new Response(
      JSON.stringify({
        configured: true,
        projectId,
        vercelDashboardUrl,
        deployments,
      }),
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        configured: true,
        error: err?.message || "Erreur de connexion aux serveurs Vercel.",
        projectId,
        vercelDashboardUrl,
        deployments: [],
      }),
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  }
};
