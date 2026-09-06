export const prerender = false;

import type { APIRoute } from "astro";
import { parseDocument } from "yaml";
import { authenticateRequest, verifyCsrfToken } from "@/lib/admin/auth";
import { loadTextFile, saveTextFile } from "@/lib/admin/store";

const INSTITUTIONS_PATH = "src/data/institutions.yaml";
const EVENTS_PATH = "src/content/ateliers.yaml";

const NO_CACHE_HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store" };

function unauthorized() {
  return new Response(JSON.stringify({ error: "Accès non autorisé." }), { status: 401, headers: NO_CACHE_HEADERS });
}

export const GET: APIRoute = async ({ request }) => {
  const { session } = authenticateRequest(request);
  if (!session) return unauthorized();

  try {
    const yamlContent = await loadTextFile(INSTITUTIONS_PATH);
    const institutions = parseDocument(yamlContent).toJS() || {};
    return new Response(JSON.stringify({ institutions }), { status: 200, headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Erreur de lecture." }), { status: 500, headers: NO_CACHE_HEADERS });
  }
};

function sanitizeInstitution(input: any): { id: string; data: Record<string, unknown> } {
  const id = String(input.id || "").trim();
  if (!id) throw new Error("L'identifiant est obligatoire.");
  if (!/^[a-z0-9_-]+$/.test(id)) throw new Error("L'identifiant ne doit contenir que des minuscules, chiffres, tirets et underscores.");

  const name = String(input.name || "").trim();
  if (!name) throw new Error("Le nom est obligatoire.");

  const short_name = String(input.short_name || "").trim();

  const documents: Record<string, string> = {};
  for (const row of Array.isArray(input.documents) ? input.documents : []) {
    const key = String(row?.key || "").trim();
    const url = String(row?.url || "").trim();
    if (!key && !url) continue;
    if (!key) throw new Error("Chaque document doit avoir une clé.");
    if (!/^[a-z0-9_-]+$/.test(key)) throw new Error(`La clé de document "${key}" ne doit contenir que des minuscules, chiffres, tirets et underscores.`);
    if (!url) throw new Error(`Le document "${key}" doit avoir une URL.`);
    documents[key] = url;
  }

  const data: Record<string, unknown> = { name };
  if (short_name) data.short_name = short_name;
  if (Object.keys(documents).length) data.documents = documents;
  return { id, data };
}

/** Vérifie si un événement de content/ateliers.yaml référence encore cette institution ("@institution:<id>[:<document>]"). */
async function isInstitutionReferenced(id: string): Promise<boolean> {
  const yamlContent = await loadTextFile(EVENTS_PATH);
  const pattern = new RegExp(`@institution:${id}(:[\\w-]+)?"`);
  return pattern.test(yamlContent);
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

    const yamlContent = await loadTextFile(INSTITUTIONS_PATH);
    const doc = parseDocument(yamlContent);
    const institutions: Record<string, any> = doc.toJS() || {};

    let commitMessage: string;

    if (action === "delete") {
      const id = String(body.id || "");
      if (!institutions[id]) throw new Error("Institution introuvable.");
      if (await isInstitutionReferenced(id)) {
        throw new Error("Cette institution est encore référencée par au moins un événement et ne peut pas être supprimée.");
      }
      doc.delete(id);
      commitMessage = `Supprime l'institution "${institutions[id].name}" (admin)`;
    } else if (action === "create") {
      const { id, data } = sanitizeInstitution(body.institution || {});
      if (institutions[id]) throw new Error(`Une institution avec l'identifiant "${id}" existe déjà.`);
      doc.set(id, data);
      commitMessage = `Ajoute l'institution "${data.name}" (admin)`;
    } else if (action === "update") {
      const originalId = String(body.originalId || "");
      if (!institutions[originalId]) throw new Error("Institution introuvable.");
      const { id, data } = sanitizeInstitution(body.institution || {});
      if (id !== originalId) {
        if (institutions[id]) throw new Error(`Une institution avec l'identifiant "${id}" existe déjà.`);
        if (await isInstitutionReferenced(originalId)) {
          throw new Error("Cette institution est encore référencée par au moins un événement : son identifiant ne peut pas être changé.");
        }
        doc.delete(originalId);
      }
      doc.set(id, data);
      commitMessage = `Modifie l'institution "${data.name}" (admin)`;
    } else {
      throw new Error("Action inconnue.");
    }

    const result = await saveTextFile(INSTITUTIONS_PATH, doc.toString(), commitMessage);
    return new Response(JSON.stringify({ success: true, ...result }), { status: 200, headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Erreur lors de l'enregistrement." }), { status: 400, headers: NO_CACHE_HEADERS });
  }
};
