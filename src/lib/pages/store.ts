/**
 * Read/write for a single Pages (MD/MDX) file, layered on top of the
 * existing generic text-file GitHub publisher in `@/lib/admin/store`. This
 * module adds optimistic-concurrency conflict detection, required so that
 * two admins (or an admin and a direct GitHub edit) can't silently clobber
 * one another's changes.
 */
import crypto from 'node:crypto';
import { loadTextFile, saveTextFile, deleteTextFile } from '../admin/store';

export function computeVersion(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex').slice(0, 12);
}

export async function loadPageFile(relativePath: string): Promise<{ content: string; version: string }> {
  const content = await loadTextFile(relativePath);
  return { content, version: computeVersion(content) };
}

/** True if a file already exists at this path. loadTextFile throws on a missing file. */
export async function pageFileExists(relativePath: string): Promise<boolean> {
  try {
    await loadTextFile(relativePath);
    return true;
  } catch {
    return false;
  }
}

export class PageConflictError extends Error {
  latestContent: string;
  constructor(message: string, latestContent: string) {
    super(message);
    this.name = 'PageConflictError';
    this.latestContent = latestContent;
  }
}

export class PageAlreadyExistsError extends Error {
  constructor(relativePath: string) {
    super(`Une page existe déjà à cet emplacement : ${relativePath}`);
    this.name = 'PageAlreadyExistsError';
  }
}

/**
 * Re-reads the file right before writing and refuses to overwrite it if its
 * content has changed since the editor loaded `expectedVersion` — closing
 * (for all practical admin-UI purposes) the race between "load" and "save".
 */
export async function savePageFile(
  relativePath: string,
  newContent: string,
  expectedVersion: string,
  commitMessage: string
): Promise<{ commitSha?: string; commitUrl?: string; version: string }> {
  const { content: currentContent } = await loadPageFile(relativePath);
  const currentVersion = computeVersion(currentContent);
  if (currentVersion !== expectedVersion) {
    throw new PageConflictError(
      "Cette page a été modifiée sur GitHub depuis que vous l'avez ouverte. Rechargez la dernière version avant d'enregistrer.",
      currentContent
    );
  }

  const result = await saveTextFile(relativePath, newContent, commitMessage);
  return { commitSha: result.commitSha, commitUrl: result.commitUrl, version: computeVersion(newContent) };
}

/** Creates a brand-new file. Refuses to clobber one that already exists there. */
export async function createPageFile(
  relativePath: string,
  content: string,
  commitMessage: string
): Promise<{ commitSha?: string; commitUrl?: string; version: string }> {
  if (await pageFileExists(relativePath)) {
    throw new PageAlreadyExistsError(relativePath);
  }
  const result = await saveTextFile(relativePath, content, commitMessage);
  return { commitSha: result.commitSha, commitUrl: result.commitUrl, version: computeVersion(content) };
}

/** Same conflict check as savePageFile, but removes the file instead of writing it. */
export async function deletePageFile(
  relativePath: string,
  expectedVersion: string,
  commitMessage: string
): Promise<{ commitSha?: string; commitUrl?: string }> {
  const { content: currentContent } = await loadPageFile(relativePath);
  const currentVersion = computeVersion(currentContent);
  if (currentVersion !== expectedVersion) {
    throw new PageConflictError(
      "Cette page a été modifiée sur GitHub depuis que vous l'avez ouverte. Rechargez la dernière version avant de la supprimer.",
      currentContent
    );
  }

  const result = await deleteTextFile(relativePath, commitMessage);
  return { commitSha: result.commitSha, commitUrl: result.commitUrl };
}
