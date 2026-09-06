export const prerender = false;

import type { APIRoute } from "astro";
import { parseDocument } from "yaml";
import { authenticateRequest, verifyCsrfToken } from "@/lib/admin/auth";
import { loadTextFile, saveTextFile } from "@/lib/admin/store";
import { slugify, uniqueSlug } from "@/lib/admin/slug";

const PRODUCTS_PATH = "src/data/products.yaml";
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
    const [productsYaml, pricesYaml] = await Promise.all([loadTextFile(PRODUCTS_PATH), loadTextFile(PRICES_PATH)]);
    const products = parseDocument(productsYaml).toJS() || [];
    const priceRefs = collectPriceRefs(parseDocument(pricesYaml).toJS() || {});
    return new Response(JSON.stringify({ products, priceRefs }), { status: 200, headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Erreur de lecture." }), { status: 500, headers: NO_CACHE_HEADERS });
  }
};

function sanitizeProduct(input: any, generatedId?: string): Record<string, unknown> {
  const id = String(input.id || generatedId || "").trim();
  if (!id) throw new Error("L'identifiant (id) est obligatoire.");
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error("L'identifiant ne doit contenir que des minuscules, chiffres et tirets.");

  const required = (field: string) => {
    const v = String(input[field] || "").trim();
    if (!v) throw new Error(`Le champ "${field}" est obligatoire.`);
    return v;
  };

  const width = Number(input.photo?.width);
  const height = Number(input.photo?.height);
  if (!Number.isFinite(width) || width <= 0) throw new Error("La largeur de la photo doit être un nombre positif.");
  if (!Number.isFinite(height) || height <= 0) throw new Error("La hauteur de la photo doit être un nombre positif.");

  const photoSrc = String(input.photo?.src || "").trim();
  if (!photoSrc) throw new Error("Le chemin de la photo est obligatoire.");
  const photoAlt = String(input.photo?.alt || "").trim();
  if (!photoAlt) throw new Error("Le texte alternatif de la photo est obligatoire.");

  const availability = input.availability === "Vendue" ? "Vendue" : "Disponible";

  return {
    id,
    title: required("title"),
    character: required("character"),
    ...(input.pinyin ? { pinyin: String(input.pinyin).trim() } : {}),
    frenchMeaning: required("frenchMeaning"),
    category: required("category"),
    ...(input.style ? { style: String(input.style).trim() } : {}),
    photo: { src: photoSrc, width, height, alt: photoAlt },
    description: required("description"),
    ...(input.extendedDescription ? { extendedDescription: String(input.extendedDescription).trim() } : {}),
    price_ref: required("price_ref"),
    availability,
    technique: required("technique"),
    medium: required("medium"),
    artist: required("artist"),
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

    const yamlContent = await loadTextFile(PRODUCTS_PATH);
    const doc = parseDocument(yamlContent);
    const products: any[] = doc.toJS() || [];

    let commitMessage: string;

    if (action === "delete") {
      const id = String(body.id || "");
      const index = products.findIndex((p) => p.id === id);
      if (index === -1) throw new Error("Œuvre introuvable.");
      const removed = products[index];
      doc.deleteIn([index]);
      commitMessage = `Supprime l'œuvre "${removed.title}" (admin)`;
    } else if (action === "create") {
      let id = String(body.product?.id || "").trim();
      if (!id) {
        const pinyin = String(body.product?.pinyin || "").trim();
        const frenchMeaning = String(body.product?.frenchMeaning || "").trim();
        const title = String(body.product?.title || "").trim();
        const rawBase = pinyin ? `${pinyin} ${frenchMeaning || title}` : (frenchMeaning || title);
        const baseSlug = slugify(rawBase).slice(0, 50).replace(/-+$/, "") || "oeuvre";
        const existingIds = products.map((p: any) => p.id);
        id = uniqueSlug(baseSlug, existingIds);
      }
      const product = sanitizeProduct(body.product || {}, id);
      if (products.some((p: any) => p.id === product.id)) {
        throw new Error(`Une œuvre avec l'identifiant "${product.id}" existe déjà.`);
      }
      doc.add(product);
      commitMessage = `Ajoute l'œuvre "${product.title}" (admin)`;
    } else if (action === "update") {
      const originalId = String(body.originalId || "");
      const index = products.findIndex((p: any) => p.id === originalId);
      if (index === -1) throw new Error("Œuvre introuvable.");
      const product = sanitizeProduct(body.product || {}, originalId);
      if (product.id !== originalId && products.some((p: any) => p.id === product.id)) {
        throw new Error(`Une œuvre avec l'identifiant "${product.id}" existe déjà.`);
      }
      doc.setIn([index], product);
      commitMessage = `Modifie l'œuvre "${product.title}" (admin)`;
    } else {
      throw new Error("Action inconnue.");
    }

    const result = await saveTextFile(PRODUCTS_PATH, doc.toString(), commitMessage);
    return new Response(JSON.stringify({ success: true, ...result }), { status: 200, headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Erreur lors de l'enregistrement." }), { status: 400, headers: NO_CACHE_HEADERS });
  }
};
