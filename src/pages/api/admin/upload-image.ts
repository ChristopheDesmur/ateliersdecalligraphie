export const prerender = false;

import type { APIRoute } from "astro";
import sharp from "sharp";
import { authenticateRequest, verifyCsrfToken } from "@/lib/admin/auth";
import { saveBinaryFile } from "@/lib/admin/store";

const NO_CACHE_HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 Mo avant traitement
const MAX_DIMENSION = 2400; // px, plus grand côté — jamais agrandi, seulement réduit

function unauthorized() {
  return new Response(JSON.stringify({ error: "Accès non autorisé." }), { status: 401, headers: NO_CACHE_HEADERS });
}

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export const POST: APIRoute = async ({ request }) => {
  const { session, sessionToken } = authenticateRequest(request);
  if (!session || !sessionToken) return unauthorized();

  const csrfHeader = request.headers.get("x-csrf-token");
  if (!verifyCsrfToken(csrfHeader, sessionToken)) {
    return new Response(JSON.stringify({ error: "Jeton CSRF invalide. Rechargez la page." }), { status: 403, headers: NO_CACHE_HEADERS });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const nameHint = String(formData.get("nameHint") || "photo");

    if (!(file instanceof File)) throw new Error("Aucun fichier reçu.");
    if (!file.type.startsWith("image/")) throw new Error("Le fichier doit être une image.");
    if (file.size > MAX_UPLOAD_BYTES) throw new Error("Image trop volumineuse (15 Mo maximum).");

    const inputBuffer = Buffer.from(await file.arrayBuffer());

    const image = sharp(inputBuffer, { failOn: "none" }).rotate(); // rotate() applique l'orientation EXIF
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) throw new Error("Image illisible ou corrompue.");

    const resized =
      metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION
        ? image.resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
        : image;

    const webpBuffer = await resized.webp({ quality: 82 }).toBuffer();
    const finalMeta = await sharp(webpBuffer).metadata();

    const slug = slugify(nameHint) || "photo";
    const uniqueSuffix = Date.now().toString(36);
    const filename = `${slug}-${uniqueSuffix}.webp`;
    const repoPath = `public/assets/${filename}`;

    const result = await saveBinaryFile(repoPath, webpBuffer, `Ajoute la photo "${filename}" (admin)`);

    return new Response(
      JSON.stringify({ success: true, path: `/assets/${filename}`, width: finalMeta.width, height: finalMeta.height, ...result }),
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Erreur lors du téléversement." }), { status: 400, headers: NO_CACHE_HEADERS });
  }
};
