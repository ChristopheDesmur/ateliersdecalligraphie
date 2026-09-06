export const prerender = false;

import type { APIRoute } from "astro";
import { parseDocument } from "yaml";
import { authenticateRequest, verifyCsrfToken } from "@/lib/admin/auth";
import { loadTextFile, saveTextFile } from "@/lib/admin/store";
import { slugify, uniqueSlug } from "@/lib/admin/slug";

const VENUES_PATH = "src/data/venues.yaml";

const NO_CACHE_HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store" };

function unauthorized() {
  return new Response(JSON.stringify({ error: "Accès non autorisé." }), { status: 401, headers: NO_CACHE_HEADERS });
}

export const GET: APIRoute = async ({ request }) => {
  const { session } = authenticateRequest(request);
  if (!session) return unauthorized();

  try {
    const yamlContent = await loadTextFile(VENUES_PATH);
    const venues = parseDocument(yamlContent).toJS() || {};
    return new Response(JSON.stringify({ venues }), { status: 200, headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Erreur de lecture." }), { status: 500, headers: NO_CACHE_HEADERS });
  }
};

function sanitizeVenueData(input: any): Record<string, unknown> {
  const required = (field: string, label: string) => {
    const v = String(input[field] || "").trim();
    if (!v) throw new Error(`Le champ "${label}" est obligatoire.`);
    return v;
  };

  const timeStart = required("time_start", "Heure de début");
  const timeEnd = required("time_end", "Heure de fin");
  if (!/^\d{2}:\d{2}$/.test(timeStart)) throw new Error('L\'heure de début doit être au format HH:MM.');
  if (!/^\d{2}:\d{2}$/.test(timeEnd)) throw new Error('L\'heure de fin doit être au format HH:MM.');

  const district = String(input.district || "").trim();
  const mapQuery = String(input.map_query || "").trim();
  const mapEmbed = String(input.map_embed || "").trim();

  return {
    name: required("name", "Nom"),
    address: required("address", "Adresse"),
    day: required("day", "Jour"),
    time_start: timeStart,
    time_end: timeEnd,
    ...(district ? { district } : {}),
    ...(mapQuery ? { map_query: mapQuery } : {}),
    ...(mapEmbed ? { map_embed: mapEmbed } : {}),
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

    const yamlContent = await loadTextFile(VENUES_PATH);
    const doc = parseDocument(yamlContent);
    const venues: Record<string, any> = doc.toJS() || {};

    let commitMessage: string;

    if (action === "delete") {
      const id = String(body.id || "");
      if (!venues[id]) throw new Error("Lieu introuvable.");
      doc.delete(id);
      commitMessage = `Supprime le lieu "${venues[id].name}" (admin)`;
    } else if (action === "create") {
      const data = sanitizeVenueData(body.venue || {});
      const id = uniqueSlug(slugify(String(data.name)), Object.keys(venues));
      doc.set(id, data);
      commitMessage = `Ajoute le lieu "${data.name}" (admin)`;
    } else if (action === "update") {
      const originalId = String(body.originalId || "");
      if (!venues[originalId]) throw new Error("Lieu introuvable.");
      const data = sanitizeVenueData(body.venue || {});
      doc.set(originalId, data);
      commitMessage = `Modifie le lieu "${data.name}" (admin)`;
    } else {
      throw new Error("Action inconnue.");
    }

    const result = await saveTextFile(VENUES_PATH, doc.toString(), commitMessage);
    return new Response(JSON.stringify({ success: true, ...result }), { status: 200, headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Erreur lors de l'enregistrement." }), { status: 400, headers: NO_CACHE_HEADERS });
  }
};
