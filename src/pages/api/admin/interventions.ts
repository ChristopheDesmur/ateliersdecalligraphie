export const prerender = false;

import type { APIRoute } from "astro";
import { parseDocument } from "yaml";
import { authenticateRequest, verifyCsrfToken } from "@/lib/admin/auth";
import { loadTextFile, saveTextFile } from "@/lib/admin/store";
import { slugify, uniqueSlug } from "@/lib/admin/slug";

const INTERVENTIONS_PATH = "src/data/interventions.yaml";
const PRICES_PATH = "src/data/prices.yaml";

const NO_CACHE_HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store" };

function unauthorized() {
  return new Response(JSON.stringify({ error: "Accès non autorisé." }), { status: 401, headers: NO_CACHE_HEADERS });
}

/** Aplatit prices.yaml en liste de chemins pointés ("a.b.c") pour peupler le sélecteur de price_ref du formulaire. */
function collectPriceRefs(node: unknown, prefix: string[] = []): string[] {
  if (node && typeof node === "object" && !Array.isArray(node)) {
    return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) => collectPriceRefs(value, [...prefix, key]));
  }
  return [prefix.join(".")];
}

export const GET: APIRoute = async ({ request }) => {
  const { session } = authenticateRequest(request);
  if (!session) return unauthorized();

  try {
    const [interventionsYaml, pricesYaml] = await Promise.all([loadTextFile(INTERVENTIONS_PATH), loadTextFile(PRICES_PATH)]);
    const interventions = parseDocument(interventionsYaml).toJS() || {};
    const priceRefs = collectPriceRefs(parseDocument(pricesYaml).toJS() || {});
    return new Response(JSON.stringify({ interventions, priceRefs }), { status: 200, headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Erreur de lecture." }), { status: 500, headers: NO_CACHE_HEADERS });
  }
};

function sanitizeInterventionData(input: any): Record<string, unknown> {
  const required = (field: string, label: string) => {
    const v = String(input[field] || "").trim();
    if (!v) throw new Error(`Le champ "${label}" est obligatoire.`);
    return v;
  };

  return {
    eyebrow: required("eyebrow", "Sur-titre"),
    title: required("title", "Titre"),
    description: required("description", "Description"),
    href: required("href", "Lien de la page"),
    price_ref: required("price_ref", "Référence de prix"),
  };
}

export const POST: APIRoute = async ({ request }) => {
  const { session, sessionToken } = authenticateRequest(request);
  if (!session || !sessionToken) return unauthorized();

  const csrfHeader = request.headers.get("x-csrf-token");
  if (!verifyCsrfToken(csrfHeader, sessionToken)) {
    return new Response(JSON.stringify({ error: "Jeton CSRF invalide. Rechargez la page." }), { status: 403, headers: NO_CACHE_HEADERS });
  }

  try {
    const body = await request.json();
    const action = body?.action;

    const yamlContent = await loadTextFile(INTERVENTIONS_PATH);
    const doc = parseDocument(yamlContent);
    const interventions: Record<string, any> = doc.toJS() || {};

    let commitMessage: string;

    if (action === "delete") {
      const id = String(body.id || "");
      if (!interventions[id]) throw new Error("Format introuvable.");
      doc.delete(id);
      commitMessage = `Supprime le format d'atelier "${interventions[id].title}" (admin)`;
    } else if (action === "create") {
      const data = sanitizeInterventionData(body.intervention || {});
      const id = uniqueSlug(slugify(String(data.title)), Object.keys(interventions));
      doc.set(id, data);
      commitMessage = `Ajoute le format d'atelier "${data.title}" (admin)`;
    } else if (action === "update") {
      const originalId = String(body.originalId || "");
      if (!interventions[originalId]) throw new Error("Format introuvable.");
      const data = sanitizeInterventionData(body.intervention || {});
      doc.set(originalId, data);
      commitMessage = `Modifie le format d'atelier "${data.title}" (admin)`;
    } else {
      throw new Error("Action inconnue.");
    }

    const result = await saveTextFile(INTERVENTIONS_PATH, doc.toString(), commitMessage);
    return new Response(JSON.stringify({ success: true, ...result }), { status: 200, headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Erreur lors de l'enregistrement." }), { status: 400, headers: NO_CACHE_HEADERS });
  }
};
