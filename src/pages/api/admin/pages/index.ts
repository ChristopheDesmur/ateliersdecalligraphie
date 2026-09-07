export const prerender = false;

import type { APIRoute } from 'astro';
import { authenticateRequest } from '@/lib/admin/auth';
import { listPages } from '@/lib/pages/discover';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export const GET: APIRoute = async ({ request }) => {
  const { session } = authenticateRequest(request);
  if (!session) return json({ error: 'Non autorisé' }, 401);

  try {
    const { pages, errors } = await listPages();
    return json({ success: true, pages, errors });
  } catch (err: any) {
    return json({ error: err.message || 'Erreur lors du chargement des pages.' }, 500);
  }
};
