/** Translitère et met en forme un nom en identifiant url-safe ("École Truc, Lyon 7e" -> "ecole-truc-lyon-7e"). */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function uniqueSlug(base: string, existingIds: Iterable<string>): string {
  const taken = new Set(existingIds);
  if (!taken.has(base)) return base || "item";
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}
