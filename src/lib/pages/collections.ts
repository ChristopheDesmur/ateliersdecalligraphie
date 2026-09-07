/**
 * Content collections exposed through the Admin → Pages MDX/MD editor.
 * This site has a single collection, `blog` (see src/content/config.ts).
 */
export interface PageCollectionConfig {
  id: string;
  label: string;
  dir: string;
}

export const PAGE_COLLECTIONS: PageCollectionConfig[] = [
  { id: 'blog', label: 'Blog', dir: 'src/content/blog' },
];

export function getPageCollection(id: string): PageCollectionConfig | undefined {
  return PAGE_COLLECTIONS.find((c) => c.id === id);
}

export function stripExt(entryId: string): string {
  return entryId.replace(/\.(md|mdx)$/, '');
}

/**
 * Filename-based slugs for `blog` entries whose PUBLISHED URL is actually
 * served by a dedicated, hand-written page (e.g. src/pages/shodo-voie-pinceau.astro)
 * rather than by the generic src/pages/[slug].astro collection route — see
 * the `dedicatedSlugs` set there. Editing one of these entries through this
 * admin would silently have no visible effect on the live site (the
 * dedicated page wins the route), so they're excluded from the Pages list
 * entirely rather than offering a misleading editor for dead content. Keep
 * this in sync with src/pages/[slug].astro if that list ever changes.
 */
export const DEDICATED_PAGE_SLUGS = new Set<string>([
  'formats-atelier-pour-les-lycees',
  'universites-et-grandes-ecoles',
  'atelier-de-groupe',
  'traductions',
  'cours-de-chinois',
  'cours-individuel-a-domicile',
  'shodo-voie-pinceau',
  'calligraphie-zen',
]);
