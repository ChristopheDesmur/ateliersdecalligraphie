import fs from "node:fs";
import yaml from "js-yaml";

export interface Institution {
  name: string;
  short_name?: string;
  documents?: Record<string, string>;
}

export const institutions = yaml.load(
  fs.readFileSync("./src/data/institutions.yaml", "utf8")
) as Record<string, Institution>;

const LIEU_REF = /^@institution:([\w-]+)(?::([\w-]+))?$/;

// content/ateliers.yaml référence une institution via "@institution:<id>[:<document>]"
// au lieu de dupliquer son nom et son lien dans le champ lieu de chaque événement.
// Les autres valeurs de lieu (texte libre) passent inchangées.
export function resolveLieu(lieu?: string): string {
  if (!lieu) return "";
  const match = LIEU_REF.exec(lieu);
  if (!match) return lieu;
  const [, id, documentKey] = match;
  const institution = institutions[id];
  if (!institution) return lieu;
  const url = documentKey ? institution.documents?.[documentKey] : undefined;
  if (!url) return institution.name;
  const label = institution.short_name ?? institution.name;
  return `${institution.name} (<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 dark:text-indigo-400 hover:underline">${label}</a>)`;
}
