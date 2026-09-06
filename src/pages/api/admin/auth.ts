export const prerender = false;

import type { APIRoute } from "astro";
import {
  authenticateRequest,
  checkRateLimit,
  clearSessionCookie,
  createCsrfToken,
  createSessionToken,
  getClientIp,
  isAdminConfigured,
  resetRateLimit,
  serializeSessionCookie,
  verifyPassword,
} from "@/lib/admin/auth";

const NO_CACHE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

export const GET: APIRoute = async ({ request }) => {
  const { session, sessionToken } = authenticateRequest(request);
  if (!session || !sessionToken) {
    return new Response(JSON.stringify({ authenticated: false }), { status: 200, headers: NO_CACHE_HEADERS });
  }
  return new Response(
    JSON.stringify({ authenticated: true, csrfToken: createCsrfToken(sessionToken) }),
    { status: 200, headers: NO_CACHE_HEADERS }
  );
};

export const POST: APIRoute = async ({ request }) => {
  if (!isAdminConfigured()) {
    return new Response(
      JSON.stringify({ error: "L'administration n'est pas configurée (ADMIN_PASSWORD manquant)." }),
      { status: 503, headers: NO_CACHE_HEADERS }
    );
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({ error: "Trop de tentatives. Veuillez réessayer dans 15 minutes." }),
      { status: 429, headers: NO_CACHE_HEADERS }
    );
  }

  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  if (!password || !verifyPassword(password)) {
    return new Response(
      JSON.stringify({ error: "Mot de passe incorrect.", remainingAttempts: rateLimit.remaining }),
      { status: 401, headers: NO_CACHE_HEADERS }
    );
  }

  resetRateLimit(ip);
  const sessionToken = createSessionToken();
  const csrfToken = createCsrfToken(sessionToken);

  return new Response(JSON.stringify({ success: true, csrfToken }), {
    status: 200,
    headers: { ...NO_CACHE_HEADERS, "Set-Cookie": serializeSessionCookie(sessionToken, request) },
  });
};

export const DELETE: APIRoute = async ({ request }) => {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...NO_CACHE_HEADERS, "Set-Cookie": clearSessionCookie(request) },
  });
};
