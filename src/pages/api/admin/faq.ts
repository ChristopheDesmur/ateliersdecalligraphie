export const prerender = false;

import type { APIRoute } from "astro";
import { parseDocument } from "yaml";
import { authenticateRequest, verifyCsrfToken } from "@/lib/admin/auth";
import { loadTextFile, saveTextFile } from "@/lib/admin/store";
import { slugify, uniqueSlug } from "@/lib/admin/slug";

const FAQ_PATH = "src/data/faq.yaml";

const NO_CACHE_HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store" };

function unauthorized() {
  return new Response(JSON.stringify({ error: "Accès non autorisé." }), { status: 401, headers: NO_CACHE_HEADERS });
}

export const GET: APIRoute = async ({ request }) => {
  const { session } = authenticateRequest(request);
  if (!session) return unauthorized();

  try {
    const yamlContent = await loadTextFile(FAQ_PATH);
    const faqs = parseDocument(yamlContent).toJS() || {};
    const categories = Array.from(new Set(Object.values(faqs).map((f: any) => f?.category).filter(Boolean)));
    return new Response(JSON.stringify({ faqs, categories }), { status: 200, headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Erreur de lecture." }), { status: 500, headers: NO_CACHE_HEADERS });
  }
};

function sanitizeFaqData(input: any): Record<string, unknown> {
  const required = (field: string, label: string) => {
    const v = String(input[field] || "").trim();
    if (!v) throw new Error(`Le champ "${label}" est obligatoire.`);
    return v;
  };

  const category = required("category", "Catégorie");
  const question = required("question", "Question");
  const answer = required("answer", "Réponse");

  const rawOrder = input.order;
  let order: number | undefined = undefined;
  if (rawOrder !== undefined && rawOrder !== null && String(rawOrder).trim() !== "") {
    const parsed = Number(rawOrder);
    if (!Number.isNaN(parsed)) order = parsed;
  }

  const showOnHome = Boolean(input.show_on_home);
  const homeQuestion = String(input.home_question || "").trim();
  const homeAnswer = String(input.home_answer || "").trim();

  return {
    category,
    question,
    answer,
    ...(order !== undefined ? { order } : {}),
    ...(showOnHome ? { show_on_home: true } : {}),
    ...(homeQuestion ? { home_question: homeQuestion } : {}),
    ...(homeAnswer ? { home_answer: homeAnswer } : {}),
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

    const yamlContent = await loadTextFile(FAQ_PATH);
    const doc = parseDocument(yamlContent);
    const faqs: Record<string, any> = doc.toJS() || {};

    let commitMessage: string;

    if (action === "delete") {
      const id = String(body.id || "");
      if (!faqs[id]) throw new Error("Question FAQ introuvable.");
      const questionText = faqs[id].question || id;
      doc.delete(id);
      commitMessage = `Supprime la question FAQ "${questionText}" (admin)`;
    } else if (action === "create") {
      const data = sanitizeFaqData(body.faq || {});
      if (data.order === undefined) {
        // Auto-assign order at the end of this category
        const categoryItems = Object.values(faqs).filter((f: any) => f?.category === data.category);
        const maxOrder = categoryItems.reduce((max: number, f: any) => Math.max(max, Number(f?.order || 0)), 0);
        data.order = maxOrder + 1;
      }
      const baseSlug = slugify(String(data.question)).slice(0, 50) || "faq";
      const id = uniqueSlug(baseSlug, Object.keys(faqs));
      doc.set(id, data);
      commitMessage = `Ajoute la question FAQ "${data.question}" (admin)`;
    } else if (action === "update") {
      const originalId = String(body.originalId || "");
      if (!faqs[originalId]) throw new Error("Question FAQ introuvable.");
      const data = sanitizeFaqData(body.faq || {});
      if (data.order === undefined && faqs[originalId].order !== undefined) {
        data.order = faqs[originalId].order;
      }
      doc.set(originalId, data);
      commitMessage = `Modifie la question FAQ "${data.question}" (admin)`;
    } else if (action === "reorder") {
      const items = Array.isArray(body.items) ? body.items : [];
      if (items.length === 0) throw new Error("Aucun élément à réordonner.");
      for (const item of items) {
        const id = String(item.id || "");
        const order = Number(item.order);
        if (faqs[id] && !Number.isNaN(order)) {
          const current = doc.get(id) as any;
          if (current && typeof current.set === "function") {
            current.set("order", order);
          } else if (faqs[id]) {
            faqs[id].order = order;
            doc.set(id, faqs[id]);
          }
        }
      }
      commitMessage = "Réordonne les questions FAQ (admin)";
    } else {
      throw new Error("Action inconnue.");
    }

    const result = await saveTextFile(FAQ_PATH, doc.toString(), commitMessage);
    return new Response(JSON.stringify({ success: true, ...result }), { status: 200, headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Erreur lors de l'enregistrement." }), { status: 400, headers: NO_CACHE_HEADERS });
  }
};
