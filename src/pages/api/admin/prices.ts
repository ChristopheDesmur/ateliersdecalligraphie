export const prerender = false;

import type { APIRoute } from "astro";
import { parseDocument } from "yaml";
import { authenticateRequest, verifyCsrfToken } from "@/lib/admin/auth";
import { loadTextFile, saveTextFile } from "@/lib/admin/store";

const PRICES_PATH = "src/data/prices.yaml";

// Chaque champ modifiable du formulaire, avec son chemin dans le YAML, son
// type et le groupe sous lequel il s'affiche. "readOnly" (réduction d'impôt)
// reste affiché pour information mais n'est pas saisi par l'admin : seul le
// prix réel (ttc_heure) s'édite, le prix net affiché aux visiteurs est
// recalculé automatiquement à partir des deux.
export const PRICE_FIELDS = [
  { path: ["cours_collectifs", "trimestre"], label: "Tarif par trimestre", type: "number", group: "Cours collectifs", unit: "€" },
  { path: ["cours_collectifs", "seances"], label: "Nombre de séances incluses", type: "number", group: "Cours collectifs" },
  { path: ["cours_individuel_domicile", "ttc_heure"], label: "Prix réel, TTC / heure", type: "number", group: "Cours individuel à domicile", unit: "€" },
  { path: ["cours_individuel_domicile", "reduction_impot_pct"], label: "Réduction d'impôt", type: "number", group: "Cours individuel à domicile", unit: "%", readOnly: true },
  { path: ["interventions", "ht_heure_standard"], label: "Écoles, retraites…", type: "number", group: "Interventions", unit: "€ HT / h" },
  { path: ["interventions", "ht_heure_entreprises"], label: "Entreprises / CSE", type: "number", group: "Interventions", unit: "€ HT / h" },
  { path: ["galerie", "sur_demande"], label: "Libellé du prix sur demande", type: "string", group: "Galerie" },
] as const;

const NO_CACHE_HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store" };

function unauthorized() {
  return new Response(JSON.stringify({ error: "Accès non autorisé." }), { status: 401, headers: NO_CACHE_HEADERS });
}

export const GET: APIRoute = async ({ request }) => {
  const { session } = authenticateRequest(request);
  if (!session) return unauthorized();

  try {
    const yamlContent = await loadTextFile(PRICES_PATH);
    const doc = parseDocument(yamlContent);
    const values: Record<string, unknown> = {};
    for (const field of PRICE_FIELDS) {
      values[field.path.join(".")] = doc.getIn(field.path);
    }
    return new Response(JSON.stringify({ fields: PRICE_FIELDS, values }), { status: 200, headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Erreur de lecture." }), { status: 500, headers: NO_CACHE_HEADERS });
  }
};

export const POST: APIRoute = async ({ request }) => {
  const { session, sessionToken } = authenticateRequest(request);
  if (!session || !sessionToken) return unauthorized();

  const csrfHeader = request.headers.get("x-csrf-token");
  if (!verifyCsrfToken(csrfHeader, sessionToken)) {
    return new Response(JSON.stringify({ error: "Jeton CSRF invalide. Rechargez la page." }), { status: 403, headers: NO_CACHE_HEADERS });
  }

  try {
    const body = await request.json();
    const values = body?.values || {};

    const yamlContent = await loadTextFile(PRICES_PATH);
    const doc = parseDocument(yamlContent);

    for (const field of PRICE_FIELDS) {
      const key = field.path.join(".");
      if (!(key in values)) continue;
      const raw = values[key];
      const value = field.type === "number" ? Number(raw) : String(raw);
      if (field.type === "number" && !Number.isFinite(value)) {
        throw new Error(`Valeur numérique invalide pour "${field.label}".`);
      }
      doc.setIn(field.path, value);
    }

    const result = await saveTextFile(PRICES_PATH, doc.toString(), "Mise à jour des tarifs (admin)");
    return new Response(JSON.stringify({ success: true, ...result }), { status: 200, headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Erreur lors de l'enregistrement." }), { status: 400, headers: NO_CACHE_HEADERS });
  }
};
