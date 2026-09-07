export const prerender = false;

import type { APIRoute } from 'astro';
import { parseDocument, Scalar } from 'yaml';
import { authenticateRequest, verifyCsrfToken } from '@/lib/admin/auth';
import { resolvePage, resolvePageLive } from '@/lib/pages/discover';
import { loadPageFile, savePageFile, deletePageFile, PageConflictError } from '@/lib/pages/store';
import { splitFrontmatter, rebuildFile } from '@/lib/pages/frontmatter';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export const GET: APIRoute = async ({ request, url }) => {
  const { session } = authenticateRequest(request);
  if (!session) return json({ error: 'Non autorisé' }, 401);

  const collection = url.searchParams.get('collection') || '';
  const slug = url.searchParams.get('slug') || '';
  if (!collection || !slug || slug.includes('..')) {
    return json({ error: 'Paramètres invalides.' }, 400);
  }

  const resolved = (await resolvePage(collection, slug)) || (await resolvePageLive(collection, slug));
  if (!resolved) return json({ error: 'Page introuvable.' }, 404);

  try {
    const { content, version } = await loadPageFile(resolved.filePath);

    let frontmatterText: string;
    let body: string;
    try {
      ({ frontmatterText, body } = splitFrontmatter(content));
    } catch (splitErr: any) {
      return json({ error: splitErr.message }, 422);
    }

    let data: any = {};
    try {
      data = parseDocument(frontmatterText).toJS() || {};
    } catch (parseErr: any) {
      return json({ error: `Frontmatter YAML invalide : ${parseErr.message}` }, 422);
    }

    const frontmatter = {
      title: data.title ?? '',
      snippet: data.snippet ?? '',
      category: data.category ?? '',
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      publishDate: data.publishDate != null ? String(data.publishDate) : '',
      author: data.author ?? '',
      draft: Boolean(data.draft),
      showRelated: data.showRelated === undefined ? null : Boolean(data.showRelated),
      imageSrc: data.image?.src ?? '',
      imageAlt: data.image?.alt ?? '',
    };

    return json({
      success: true,
      collection,
      collectionLabel: resolved.col.label,
      slug,
      file: resolved.filePath,
      url: `/${slug}/`,
      frontmatter,
      body,
      version,
    });
  } catch (err: any) {
    return json({ error: err.message || 'Erreur lors de la lecture de la page.' }, 500);
  }
};

export const POST: APIRoute = async ({ request }) => {
  const { session, sessionToken } = authenticateRequest(request);
  if (!session || !sessionToken) {
    return json({ error: 'Session expirée ou non autorisée' }, 401);
  }

  const csrfHeader = request.headers.get('x-csrf-token') || '';
  if (!csrfHeader || !verifyCsrfToken(csrfHeader, sessionToken)) {
    return json({ error: 'Jeton CSRF invalide. Rechargez la page.' }, 403);
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Requête invalide.' }, 400);
  }

  const { collection, slug, expectedVersion, frontmatter, body } = payload || {};
  if (!collection || !slug || typeof slug !== 'string' || slug.includes('..')) {
    return json({ error: 'Paramètres invalides.' }, 400);
  }
  if (typeof body !== 'string') {
    return json({ error: 'Le contenu de la page est invalide.' }, 400);
  }
  if (!frontmatter || typeof frontmatter !== 'object') {
    return json({ error: 'Le frontmatter est invalide.' }, 400);
  }
  if (!String(frontmatter.title || '').trim()) {
    return json({ error: 'Le titre ne peut pas être vide.' }, 400);
  }
  if (!String(frontmatter.imageSrc || '').trim()) {
    return json({ error: "L'image est obligatoire pour cette collection." }, 400);
  }
  if (!expectedVersion || typeof expectedVersion !== 'string') {
    return json({ error: "Version manquante. Rechargez la page avant d'enregistrer." }, 400);
  }

  const resolved = (await resolvePage(collection, slug)) || (await resolvePageLive(collection, slug));
  if (!resolved) return json({ error: 'Page introuvable.' }, 404);

  try {
    // Re-read the live file and mutate its parsed frontmatter document in
    // place: every key this editor doesn't know about (and any comment or
    // ordering around it) survives untouched, because we only ever call
    // .set()/.delete() on the specific known fields below rather than
    // rebuilding the frontmatter from the submitted object. We also skip
    // .set() entirely for a field whose value didn't actually change —
    // yaml's Document#set() always creates a brand-new node, which resets
    // that field's own formatting (quote style, line wrapping) to the
    // library's defaults even when the value is identical.
    const { content: currentContent } = await loadPageFile(resolved.filePath);
    const { frontmatterText } = splitFrontmatter(currentContent);
    const doc = parseDocument(frontmatterText);
    const before: any = doc.toJS() || {};

    const setIfChanged = (key: string, value: unknown, forceQuoted = false) => {
      const current = before[key];
      const unchanged =
        Array.isArray(value) && Array.isArray(current)
          ? value.length === current.length && value.every((v, i) => v === current[i])
          : current === value;
      if (unchanged) return;
      if (forceQuoted && typeof value === 'string') {
        // Astro's frontmatter parser is js-yaml, whose default schema
        // resolves an unquoted date-like scalar (e.g. `2026-09-07`) to a
        // native Date, which then fails this collection's
        // `publishDate: z.string()...` schema at build time. The `yaml`
        // package used here doesn't share that implicit-resolution
        // behavior, so it won't auto-quote it — force it explicitly.
        const node = doc.createNode(value);
        node.type = Scalar.QUOTE_DOUBLE;
        doc.set(key, node);
      } else {
        doc.set(key, value);
      }
    };

    setIfChanged('title', String(frontmatter.title).trim());
    setIfChanged('snippet', String(frontmatter.snippet ?? '').trim());
    setIfChanged('category', String(frontmatter.category ?? '').trim());
    setIfChanged('draft', Boolean(frontmatter.draft));

    const author = String(frontmatter.author ?? '').trim();
    if (author) setIfChanged('author', author);

    const publishDate = String(frontmatter.publishDate ?? '').trim();
    if (publishDate) setIfChanged('publishDate', publishDate, true);

    if (frontmatter.showRelated === true || frontmatter.showRelated === false) {
      setIfChanged('showRelated', frontmatter.showRelated);
    } else if (before.showRelated !== undefined) {
      doc.delete('showRelated');
    }

    const tags = Array.isArray(frontmatter.tags)
      ? frontmatter.tags.map((t: unknown) => String(t).trim()).filter(Boolean)
      : [];
    const currentTags = Array.isArray(before.tags) ? before.tags : [];
    if (tags.length !== currentTags.length || tags.some((t, i) => t !== currentTags[i])) {
      doc.set('tags', doc.createNode(tags, { flow: true } as any));
    }

    // image is required by this collection's schema — always present.
    const imageSrc = String(frontmatter.imageSrc ?? '').trim();
    const imageAlt = String(frontmatter.imageAlt ?? '').trim();
    if (before.image?.src !== imageSrc || before.image?.alt !== imageAlt) {
      doc.set('image', doc.createNode({ src: imageSrc, alt: imageAlt }));
    }

    const newContent = rebuildFile(doc.toString({ lineWidth: 0 }), String(body));
    const commitMessage = `content(pages): mise à jour de « ${String(frontmatter.title).trim()} » (${resolved.filePath})`;

    const result = await savePageFile(resolved.filePath, newContent, expectedVersion, commitMessage);

    return json({
      success: true,
      message: 'Page enregistrée sur GitHub. Le déploiement Vercel se lance automatiquement.',
      commitSha: result.commitSha,
      commitUrl: result.commitUrl,
      version: result.version,
    });
  } catch (err: any) {
    if (err instanceof PageConflictError) {
      return json({ error: err.message, conflict: true }, 409);
    }
    return json({ error: err.message || "Erreur lors de l'enregistrement de la page." }, 500);
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  const { session, sessionToken } = authenticateRequest(request);
  if (!session || !sessionToken) {
    return json({ error: 'Session expirée ou non autorisée' }, 401);
  }

  const csrfHeader = request.headers.get('x-csrf-token') || '';
  if (!csrfHeader || !verifyCsrfToken(csrfHeader, sessionToken)) {
    return json({ error: 'Jeton CSRF invalide. Rechargez la page.' }, 403);
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Requête invalide.' }, 400);
  }

  const { collection, slug, expectedVersion } = payload || {};
  if (!collection || !slug || typeof slug !== 'string' || slug.includes('..')) {
    return json({ error: 'Paramètres invalides.' }, 400);
  }
  if (!expectedVersion || typeof expectedVersion !== 'string') {
    return json({ error: 'Version manquante. Rechargez la page avant de la supprimer.' }, 400);
  }

  const resolved = (await resolvePage(collection, slug)) || (await resolvePageLive(collection, slug));
  if (!resolved) return json({ error: 'Page introuvable.' }, 404);

  try {
    const title = String(resolved.entry.data.title || slug);
    const commitMessage = `content(pages): suppression de « ${title} » (${resolved.filePath})`;

    const result = await deletePageFile(resolved.filePath, expectedVersion, commitMessage);

    return json({
      success: true,
      message: 'Page supprimée sur GitHub. Le déploiement Vercel se lance automatiquement.',
      commitSha: result.commitSha,
      commitUrl: result.commitUrl,
    });
  } catch (err: any) {
    if (err instanceof PageConflictError) {
      return json({ error: err.message, conflict: true }, 409);
    }
    return json({ error: err.message || 'Erreur lors de la suppression de la page.' }, 500);
  }
};
