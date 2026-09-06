export const prerender = false;

import type { APIRoute } from "astro";
import { parseDocument } from "yaml";
import { authenticateRequest, verifyCsrfToken } from "@/lib/admin/auth";
import { loadTextFile, saveTextFile } from "@/lib/admin/store";

const CONTACT_PATH = "src/data/contact.yaml";

export const CONTACT_FIELDS = [
  { key: "mobile", label: "Téléphone mobile" },
  { key: "landline", label: "Téléphone fixe" },
  { key: "email", label: "E-mail" },
  { key: "coop_a_dom_agrement", label: "Numéro d'agrément Coop A Dom" },
] as const;

const NO_CACHE_HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store" };

function unauthorized() {
  return new Response(JSON.stringify({ error: "Accès non autorisé." }), { status: 401, headers: NO_CACHE_HEADERS });
}

export const GET: APIRoute = async ({ request }) => {
  const { session } = authenticateRequest(request);
  if (!session) return unauthorized();

  try {
    const yamlContent = await loadTextFile(CONTACT_PATH);
    const doc = parseDocument(yamlContent);
    const values: Record<string, unknown> = {};
    for (const field of CONTACT_FIELDS) {
      values[field.key] = doc.get(field.key);
    }
    return new Response(JSON.stringify({ fields: CONTACT_FIELDS, values }), { status: 200, headers: NO_CACHE_HEADERS });
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

    const yamlContent = await loadTextFile(CONTACT_PATH);
    const doc = parseDocument(yamlContent);

    for (const field of CONTACT_FIELDS) {
      if (!(field.key in values)) continue;
      const value = String(values[field.key] ?? "").trim();
      if (!value) throw new Error(`Le champ "${field.label}" ne peut pas être vide.`);
      if (field.key === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        throw new Error("L'adresse e-mail n'est pas valide.");
      }
      doc.set(field.key, value);
    }

    const result = await saveTextFile(CONTACT_PATH, doc.toString(), "Mise à jour des coordonnées de contact (admin)");
    return new Response(JSON.stringify({ success: true, ...result }), { status: 200, headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Erreur lors de l'enregistrement." }), { status: 400, headers: NO_CACHE_HEADERS });
  }
};
