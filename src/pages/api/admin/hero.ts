export const prerender = false;

import type { APIRoute } from "astro";
import { parseDocument } from "yaml";
import { authenticateRequest, verifyCsrfToken } from "@/lib/admin/auth";
import { loadTextFile, saveTextFile } from "@/lib/admin/store";

const HERO_PATH = "src/data/hero.yaml";
const NO_CACHE_HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store" };

function unauthorized() {
  return new Response(JSON.stringify({ error: "Accès non autorisé." }), { status: 401, headers: NO_CACHE_HEADERS });
}

export const GET: APIRoute = async ({ request }) => {
  const { session } = authenticateRequest(request);
  if (!session) return unauthorized();

  try {
    const yamlContent = await loadTextFile(HERO_PATH);
    const doc = parseDocument(yamlContent);
    return new Response(JSON.stringify({ hero: doc.toJSON() }), { status: 200, headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Erreur de lecture de l'En-tête." }), { status: 500, headers: NO_CACHE_HEADERS });
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
    const heroInput = body?.hero;
    if (!heroInput || typeof heroInput !== "object") {
      throw new Error("Données de l'En-tête invalides.");
    }

    const eyebrow = String(heroInput.eyebrow ?? "").trim();
    const title = String(heroInput.title ?? "").trim();
    const intro = String(heroInput.intro ?? "").trim();

    if (!eyebrow) throw new Error("Le sur-titre ne peut pas être vide.");
    if (!title) throw new Error("Le titre ne peut pas être vide.");
    if (!intro) throw new Error("Le texte d'introduction ne peut pas être vide.");

    const primary_cta = {
      label: String(heroInput.primary_cta?.label ?? "").trim(),
      url: String(heroInput.primary_cta?.url ?? "").trim(),
    };
    const secondary_cta = {
      label: String(heroInput.secondary_cta?.label ?? "").trim(),
      url: String(heroInput.secondary_cta?.url ?? "").trim(),
    };

    const imageInput = heroInput.image;
    let imageObj: Record<string, unknown> | null = null;
    if (imageInput && typeof imageInput === "object" && String(imageInput.src ?? "").trim()) {
      imageObj = {
        src: String(imageInput.src).trim(),
        alt: String(imageInput.alt ?? "").trim(),
        caption: String(imageInput.caption ?? "").trim(),
        location: String(imageInput.location ?? "").trim(),
        width: Number(imageInput.width) || 1536,
        height: Number(imageInput.height) || 1024,
      };
    }

    const yamlContent = await loadTextFile(HERO_PATH);
    const doc = parseDocument(yamlContent);

    doc.set("eyebrow", eyebrow);
    doc.set("title", title);
    doc.set("intro", intro);
    doc.set("primary_cta", primary_cta);
    doc.set("secondary_cta", secondary_cta);

    if (imageObj) {
      doc.set("image", imageObj);
    } else {
      doc.delete("image");
    }

    const result = await saveTextFile(HERO_PATH, doc.toString(), "Mise à jour de l'En-tête de la page d'accueil (admin)");
    return new Response(JSON.stringify({ success: true, hero: doc.toJSON(), ...result }), { status: 200, headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Erreur lors de l'enregistrement de l'En-tête." }), { status: 400, headers: NO_CACHE_HEADERS });
  }
};
