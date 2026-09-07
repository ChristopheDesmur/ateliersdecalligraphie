export const prerender = false;

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { Document, Scalar } from 'yaml';
import { authenticateRequest, verifyCsrfToken } from '@/lib/admin/auth';
import { getPageCollection, DEDICATED_PAGE_SLUGS } from '@/lib/pages/collections';
import { createPageFile, PageAlreadyExistsError } from '@/lib/pages/store';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const POST: APIRoute = async ({ request }) => {
  const { session, sessionToken } = authenticateRequest(request);
  if (!session || !sessionToken) return json({ error: 'Session expirée ou non autorisée' }, 401);

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

  const collectionId = String(payload?.collection || '');
  const title = String(payload?.title || '').trim();
  const requestedSlug = String(payload?.slug || '').trim();
  const imageSrc = String(payload?.imageSrc || '').trim();
  const imageAlt = String(payload?.imageAlt || '').trim();

  const col = getPageCollection(collectionId);
  if (!col) return json({ error: 'Rubrique invalide.' }, 400);
  if (!title) return json({ error: 'Le titre ne peut pas être vide.' }, 400);
  if (!imageSrc) return json({ error: "L'image est obligatoire pour cette collection." }, 400);

  const slug = slugify(requestedSlug || title);
  if (!slug || slug.includes('..') || slug.includes('/')) {
    return json({ error: 'Slug invalide. Utilisez uniquement lettres, chiffres et tirets.' }, 400);
  }
  if (DEDICATED_PAGE_SLUGS.has(slug)) {
    return json({ error: `Ce slug est réservé à une page dédiée du site et ne peut pas être utilisé ici.` }, 409);
  }

  try {
    const entries = await getCollection(collectionId as any);
    if ((entries as any[]).some((e) => e.id.replace(/\.(md|mdx)$/, '') === slug)) {
      return json({ error: `Une page avec le slug « ${slug} » existe déjà dans « ${col.label} ».` }, 409);
    }

    const filePath = `${col.dir}/${slug}.md`;

    // Built via a Document (rather than a plain object → stringify) so
    // publishDate can be forced to a double-quoted scalar: Astro's actual
    // frontmatter parser is js-yaml, whose default schema resolves an
    // unquoted date-like scalar (e.g. `2026-09-07`) to a native Date —
    // which then fails the collection's `publishDate: z.string()...`
    // schema at build time. The `yaml` package used here to write the
    // file doesn't share that implicit-resolution behavior, so quoting
    // must be forced explicitly.
    const today = new Date().toISOString().slice(0, 10);
    const doc = new Document({});
    doc.set('title', title);
    doc.set('draft', true);
    doc.set('snippet', '');
    doc.set('image', doc.createNode({ src: imageSrc, alt: imageAlt }));
    const dateNode = doc.createNode(today);
    dateNode.type = Scalar.QUOTE_DOUBLE;
    doc.set('publishDate', dateNode);
    doc.set('category', '');
    doc.set('tags', doc.createNode([], { flow: true } as any));

    const frontmatterYaml = doc.toString({ lineWidth: 0 });
    const body = 'Contenu à rédiger…\n';
    const content = `---\n${frontmatterYaml}---\n\n${body}`;

    const commitMessage = `content(pages): ajout de « ${title} » (${filePath})`;
    const result = await createPageFile(filePath, content, commitMessage);

    return json({
      success: true,
      message: 'Page créée sur GitHub. Le déploiement Vercel se lance automatiquement.',
      collection: collectionId,
      slug,
      commitSha: result.commitSha,
      commitUrl: result.commitUrl,
    });
  } catch (err: any) {
    if (err instanceof PageAlreadyExistsError) {
      return json({ error: err.message }, 409);
    }
    return json({ error: err.message || 'Erreur lors de la création de la page.' }, 500);
  }
};
