export const prerender = false;

import type { APIRoute } from "astro";
import { parseDocument, YAMLSeq } from "yaml";
import { authenticateRequest, verifyCsrfToken } from "@/lib/admin/auth";
import { loadTextFile, saveTextFile } from "@/lib/admin/store";

const EVENTS_PATH = "src/content/ateliers.yaml";

const NO_CACHE_HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store" };

function unauthorized() {
  return new Response(JSON.stringify({ error: "Accès non autorisé." }), { status: 401, headers: NO_CACHE_HEADERS });
}

function yearFromDate(dateStr: string): string {
  const match = /^(\d{4})-/.exec(dateStr.trim());
  if (!match) throw new Error(`Date invalide : "${dateStr}". Format attendu : AAAA-MM-JJ HH:mm.`);
  return match[1];
}

/**
 * Seuls les événements de l'année en cours (ou d'une année future) se
 * verrouillent une fois leur date de fin dépassée. Les archives des années
 * précédentes restent toujours modifiables : ce sont des registres
 * historiques, pas des créneaux d'agenda actifs, et beaucoup utilisent une
 * plage sur toute l'année ("AAAA-01-01" à "AAAA-12-31") en simple
 * approximation plutôt qu'une date réelle d'intervention.
 */
function isLockedPastEvent(year: string, toDate: string): boolean {
  if (Number(year) < new Date().getFullYear()) return false;
  const parsed = new Date(String(toDate).trim().replace(" ", "T"));
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() < Date.now();
}

function sanitizeEvent(input: any): { year: string; event: Record<string, unknown> } {
  const required = (field: string, label: string) => {
    const v = String(input[field] || "").trim();
    if (!v) throw new Error(`Le champ "${label}" est obligatoire.`);
    return v;
  };

  const from = required("from", "Début");
  const to = required("to", "Fin");
  const titre = required("titre", "Titre");
  const lieu = required("lieu", "Lieu");
  const details = String(input.details || "").trim();
  const href = String(input.href || "").trim();

  const event: Record<string, unknown> = { from, to, titre, lieu };
  if (details) event.details = details;
  if (href) event.href = href;

  return { year: yearFromDate(from), event };
}

export const GET: APIRoute = async ({ request }) => {
  const { session } = authenticateRequest(request);
  if (!session) return unauthorized();

  try {
    const yamlContent = await loadTextFile(EVENTS_PATH);
    const data = parseDocument(yamlContent).toJS() || {};
    return new Response(JSON.stringify({ years: data }), { status: 200, headers: NO_CACHE_HEADERS });
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
    const action = body?.action;

    const yamlContent = await loadTextFile(EVENTS_PATH);
    const doc = parseDocument(yamlContent);
    const data: Record<string, any[]> = doc.toJS() || {};

    let commitMessage: string;

    // Retire une année devenue vide de l'arbre YAML plutôt que de laisser
    // trainer une clé "AAAA: []" après la suppression de son dernier événement.
    const pruneIfEmpty = (year: string) => {
      const remaining = doc.getIn([year]) as unknown as { items?: unknown[] } | undefined;
      if (remaining && Array.isArray((remaining as any).items) && (remaining as any).items.length === 0) {
        doc.delete(year);
      }
    };

    if (action === "delete") {
      const year = String(body.year || "");
      const index = Number(body.index);
      const list = data[year];
      if (!list || !list[index]) throw new Error("Événement introuvable.");
      const removed = list[index];
      if (isLockedPastEvent(year, removed.to)) {
        throw new Error("Cet événement est passé et ne peut plus être supprimé.");
      }
      doc.deleteIn([year, index]);
      pruneIfEmpty(year);
      commitMessage = `Supprime l'événement "${removed.titre}" — ${removed.from} (admin)`;
    } else if (action === "create") {
      const { year, event } = sanitizeEvent(body.event || {});
      if (!doc.has(year)) doc.set(year, new YAMLSeq());
      doc.addIn([year], event);
      commitMessage = `Ajoute l'événement "${event.titre}" — ${event.from} (admin)`;
    } else if (action === "update") {
      const originalYear = String(body.originalYear || "");
      const originalIndex = Number(body.originalIndex);
      const existingList = data[originalYear];
      if (!existingList || !existingList[originalIndex]) throw new Error("Événement introuvable.");
      if (isLockedPastEvent(originalYear, existingList[originalIndex].to)) {
        throw new Error("Cet événement est passé et ne peut plus être modifié.");
      }

      const { year: newYear, event } = sanitizeEvent(body.event || {});

      if (newYear === originalYear) {
        doc.setIn([originalYear, originalIndex], event);
      } else {
        doc.deleteIn([originalYear, originalIndex]);
        pruneIfEmpty(originalYear);
        if (!doc.has(newYear)) doc.set(newYear, new YAMLSeq());
        doc.addIn([newYear], event);
      }
      commitMessage = `Modifie l'événement "${event.titre}" — ${event.from} (admin)`;
    } else {
      throw new Error("Action inconnue.");
    }

    const result = await saveTextFile(EVENTS_PATH, doc.toString(), commitMessage);
    return new Response(JSON.stringify({ success: true, ...result }), { status: 200, headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Erreur lors de l'enregistrement." }), { status: 400, headers: NO_CACHE_HEADERS });
  }
};
