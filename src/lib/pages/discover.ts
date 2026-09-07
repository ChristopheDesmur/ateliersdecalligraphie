import { getCollection } from 'astro:content';
import { PAGE_COLLECTIONS, getPageCollection, DEDICATED_PAGE_SLUGS, type PageCollectionConfig } from './collections.ts';

export interface DiscoveredPage {
  collection: string;
  collectionLabel: string;
  slug: string;
  file: string;
  title: string;
  snippet: string;
  category: string;
  draft: boolean;
  publishDate: string;
  url: string;
}

/**
 * Astro's content entries don't reliably carry their file extension on
 * `id` (confirmed empirically here via .astro/data-store.json: a real
 * "blog" entry has id "calligraphie-zen" but filePath
 * "src/content/blog/calligraphie-zen.md") — building a GitHub path from
 * `${dir}/${id}` silently breaks for every entry. `filePath` (relative to
 * the project root) is the reliable source; the slug used by THIS admin is
 * derived from filePath's own basename too, so it never depends on
 * whichever id/slug format a given collection type happens to expose.
 */
function resolveFilePath(col: PageCollectionConfig, entry: { id: string; filePath?: string }): string {
  if (entry.filePath) {
    const normalized = entry.filePath.replace(/\\/g, '/');
    const marker = 'src/content/';
    const idx = normalized.indexOf(marker);
    return idx >= 0 ? normalized.slice(idx) : normalized;
  }
  return `${col.dir}/${entry.id}`;
}

function slugFromFilePath(filePath: string): string {
  const basename = filePath.split('/').pop() || filePath;
  return basename.replace(/\.(md|mdx)$/, '');
}

/**
 * Lists every editable page across the configured content collections, via
 * Astro's own content layer cache — no GitHub calls, safe to call on every
 * admin Pages list render. Entries whose slug is in DEDICATED_PAGE_SLUGS
 * are skipped (see that constant for why). A single broken collection is
 * skipped rather than failing the whole list.
 */
export async function listPages(): Promise<{ pages: DiscoveredPage[]; errors: string[] }> {
  const pages: DiscoveredPage[] = [];
  const errors: string[] = [];

  for (const col of PAGE_COLLECTIONS) {
    try {
      const entries = await getCollection(col.id as any);
      for (const entry of entries as any[]) {
        const filePath = resolveFilePath(col, entry);
        const slug = slugFromFilePath(filePath);
        if (DEDICATED_PAGE_SLUGS.has(slug)) continue;

        const publishDate = entry.data.publishDate;
        pages.push({
          collection: col.id,
          collectionLabel: col.label,
          slug,
          file: filePath,
          title: entry.data.title || slug,
          snippet: entry.data.snippet || '',
          category: entry.data.category || '',
          draft: Boolean(entry.data.draft),
          publishDate: publishDate instanceof Date ? publishDate.toISOString() : String(publishDate || ''),
          url: `/${slug}/`,
        });
      }
    } catch (err: any) {
      errors.push(`${col.label} : ${err.message || 'erreur de chargement'}`);
    }
  }

  pages.sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  return { pages, errors };
}

export interface ResolvedPage {
  col: PageCollectionConfig;
  entry: { id: string; data: Record<string, any>; filePath?: string };
  filePath: string;
}

/**
 * Resolves a (collection, slug) pair to a real content entry — also the
 * security boundary: a caller can only ever reach a file that is (a)
 * inside an allowlisted collection and (b) already known to Astro's
 * content layer as one of that collection's real entries. There is no
 * path concatenation from client input anywhere else, so path traversal
 * and arbitrary-repo-file access are not reachable. Dedicated-page slugs
 * are refused here too, for the same reason they're excluded from the list.
 */
export async function resolvePage(collectionId: string, slug: string): Promise<ResolvedPage | null> {
  if (DEDICATED_PAGE_SLUGS.has(slug)) return null;
  const col = getPageCollection(collectionId);
  if (!col) return null;
  const entries = await getCollection(collectionId as any);
  for (const entry of entries as any[]) {
    const filePath = resolveFilePath(col, entry);
    if (slugFromFilePath(filePath) === slug) {
      return { col, entry, filePath };
    }
  }
  return null;
}
