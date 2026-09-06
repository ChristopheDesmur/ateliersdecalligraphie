// Regroupement des institutions par mot-clé de tête, utilisé à la fois par
// /admin/institutions (accordéons) et /admin/events (options du <select>
// Lieu). Avec ~80 institutions, un tri alphabétique brut reste dominé par
// "Centre…" et "École…" (plus de 60 % des noms) : ces catégories dérivées
// du nom lui-même restent bien plus lisibles.
export const INSTITUTION_CATEGORIES: { label: string; test: (name: string) => boolean }[] = [
  { label: "Écoles & collèges", test: (n) => /^(École|Écoles|Collège|ISTIL|SEES)/.test(n) },
  { label: "Centres, salles & lieux culturels", test: (n) => /^(Centre|Bibliothèque|Médiathèque|Artothèque|MJC|Chapelle|Dojo|Maison du Tao|Boutique)/.test(n) },
  { label: "Villes & lieux génériques", test: (n) => /^(Lyon|Rive-de-Gier|Chaponost|Neuville-sur-Saône|Saint-Genis-Laval|Saint-Romain-le-Puy|Virieu|Mercredis de Lyon)\b/.test(n) },
  { label: "Autres organismes & événements", test: () => true },
];

export function institutionCategoryFor(name: string): string {
  const plain = name.replace(/<[^>]+>/g, "");
  return (INSTITUTION_CATEGORIES.find((c) => c.test(plain)) ?? INSTITUTION_CATEGORIES[INSTITUTION_CATEGORIES.length - 1]).label;
}

export function slugifyLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
