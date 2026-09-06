export const prerender = false;

import type { APIRoute } from "astro";
import { parseDocument } from "yaml";
import { authenticateRequest, verifyCsrfToken } from "@/lib/admin/auth";
import { loadTextFile, saveTextFile } from "@/lib/admin/store";
import { slugify, uniqueSlug } from "@/lib/admin/slug";

const TESTIMONIALS_PATH = "src/data/testimonials.yaml";

const NO_CACHE_HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store" };

function unauthorized() {
  return new Response(JSON.stringify({ error: "Accès non autorisé." }), { status: 401, headers: NO_CACHE_HEADERS });
}

export const GET: APIRoute = async ({ request }) => {
  const { session } = authenticateRequest(request);
  if (!session) return unauthorized();

  try {
    const yamlContent = await loadTextFile(TESTIMONIALS_PATH);
    const testimonials = parseDocument(yamlContent).toJS() || {};
    return new Response(JSON.stringify({ testimonials }), { status: 200, headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Erreur de lecture." }), { status: 500, headers: NO_CACHE_HEADERS });
  }
};

function sanitizeTestimonialData(input: any): Record<string, unknown> {
  const required = (field: string, label: string) => {
    const v = String(input[field] || "").trim();
    if (!v) throw new Error(`Le champ "${label}" est obligatoire.`);
    return v;
  };

  const href = String(input.href || "").trim();
  const linkText = String(input.linkText || "").trim();
  if (href && !linkText) throw new Error('Le champ "Texte du lien" est obligatoire si un lien est renseigné.');
  if (linkText && !href) throw new Error('Le champ "Lien" est obligatoire si un texte de lien est renseigné.');

  return {
    quote: required("quote", "Citation"),
    author: required("author", "Auteur"),
    role: required("role", "Fonction / rôle"),
    source: required("source", "Source"),
    badge: required("badge", "Badge"),
    ...(href ? { href, linkText } : {}),
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

    const yamlContent = await loadTextFile(TESTIMONIALS_PATH);
    const doc = parseDocument(yamlContent);
    const testimonials: Record<string, any> = doc.toJS() || {};

    let commitMessage: string;

    if (action === "delete") {
      const id = String(body.id || "");
      if (!testimonials[id]) throw new Error("Témoignage introuvable.");
      doc.delete(id);
      commitMessage = `Supprime le témoignage de "${testimonials[id].author}" (admin)`;
    } else if (action === "create") {
      const data = sanitizeTestimonialData(body.testimonial || {});
      const id = uniqueSlug(slugify(String(data.author)), Object.keys(testimonials));
      doc.set(id, data);
      commitMessage = `Ajoute le témoignage de "${data.author}" (admin)`;
    } else if (action === "update") {
      const originalId = String(body.originalId || "");
      if (!testimonials[originalId]) throw new Error("Témoignage introuvable.");
      const data = sanitizeTestimonialData(body.testimonial || {});
      doc.set(originalId, data);
      commitMessage = `Modifie le témoignage de "${data.author}" (admin)`;
    } else {
      throw new Error("Action inconnue.");
    }

    const result = await saveTextFile(TESTIMONIALS_PATH, doc.toString(), commitMessage);
    return new Response(JSON.stringify({ success: true, ...result }), { status: 200, headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Erreur lors de l'enregistrement." }), { status: 400, headers: NO_CACHE_HEADERS });
  }
};
