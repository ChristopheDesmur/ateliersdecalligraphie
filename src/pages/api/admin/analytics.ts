export const prerender = false;

import type { APIRoute } from "astro";
import { authenticateRequest } from "@/lib/admin/auth";

const NO_CACHE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

export const GET: APIRoute = async ({ request, url }) => {
  const { session } = authenticateRequest(request);
  if (!session) {
    return new Response(JSON.stringify({ error: "Accès non autorisé." }), {
      status: 401,
      headers: NO_CACHE_HEADERS,
    });
  }

  const range = url.searchParams.get("range") || "30d";
  const now = new Date();
  const until = now.toISOString();
  const sinceDate = new Date(now);
  let granularity: "hour" | "day" = "day";

  if (range === "24h") {
    sinceDate.setHours(now.getHours() - 24);
    granularity = "hour";
  } else if (range === "7d") {
    sinceDate.setDate(now.getDate() - 7);
    granularity = "day";
  } else if (range === "90d") {
    sinceDate.setDate(now.getDate() - 90);
    granularity = "day";
  } else {
    // Default: 30 days
    sinceDate.setDate(now.getDate() - 30);
    granularity = "day";
  }
  const since = sinceDate.toISOString();

  // Read Vercel credentials strictly from server environment (never exposed to client)
  const token =
    process.env.VERCEL_TOKEN ||
    process.env.VERCEL_API_TOKEN ||
    process.env.VERCEL_ACCESS_TOKEN ||
    process.env.VERCEL_AUTH_TOKEN;

  const projectId =
    process.env.VERCEL_PROJECT_ID ||
    process.env.PROJECT_ID ||
    process.env.VERCEL_GIT_REPO_ID ||
    "ateliersdecalligraphie";

  const teamId =
    process.env.VERCEL_TEAM_ID ||
    process.env.TEAM_ID ||
    process.env.VERCEL_TEAM_SLUG;

  if (!token) {
    return new Response(
      JSON.stringify({
        configured: false,
        error:
          "Le jeton d'accès Vercel (VERCEL_TOKEN) n'est pas configuré. Veuillez définir la variable d'environnement VERCEL_TOKEN dans les paramètres de votre projet Vercel.",
        projectId,
        range,
        since,
        until,
        granularity,
      }),
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const base = "https://api.vercel.com/v1/query/web-analytics/visits";

  const buildUrl = (endpoint: string, params: Record<string, string | number>) => {
    const u = new URL(endpoint);
    u.searchParams.set("projectId", projectId);
    if (teamId) u.searchParams.set("teamId", teamId);
    for (const [k, v] of Object.entries(params)) {
      u.searchParams.set(k, String(v));
    }
    return u.toString();
  };

  try {
    const [countsRes, timeseriesRes, pagesRes, referrersRes, countriesRes, devicesRes] =
      await Promise.all([
        fetch(buildUrl(`${base}/count`, { since, until }), { headers }),
        fetch(buildUrl(`${base}/aggregate`, { by: granularity, since, until, limit: 100 }), { headers }),
        fetch(buildUrl(`${base}/aggregate`, { by: "requestPath", since, until, limit: 15 }), { headers }),
        fetch(buildUrl(`${base}/aggregate`, { by: "referrerHostname", since, until, limit: 15 }), { headers }),
        fetch(buildUrl(`${base}/aggregate`, { by: "country", since, until, limit: 15 }), { headers }),
        fetch(buildUrl(`${base}/aggregate`, { by: "deviceType", since, until, limit: 10 }), { headers }),
      ]);

    if (!countsRes.ok) {
      const errData = await countsRes.json().catch(() => ({}));
      const msg =
        errData?.error?.message ||
        errData?.message ||
        (countsRes.status === 401
          ? "Jeton d'accès Vercel non valide ou expiré."
          : countsRes.status === 403
          ? "Accès refusé à l'API Vercel Analytics pour ce projet ou cette équipe."
          : `Erreur API Vercel (${countsRes.status})`);

      return new Response(
        JSON.stringify({
          configured: true,
          error: msg,
          status: countsRes.status,
          projectId,
          range,
          since,
          until,
        }),
        { status: 200, headers: NO_CACHE_HEADERS }
      );
    }

    const countsData = await countsRes.json();
    const timeseriesData = timeseriesRes.ok ? await timeseriesRes.json() : { data: [] };
    const pagesData = pagesRes.ok ? await pagesRes.json() : { data: [] };
    const referrersData = referrersRes.ok ? await referrersRes.json() : { data: [] };
    const countriesData = countriesRes.ok ? await countriesRes.json() : { data: [] };
    const devicesData = devicesRes.ok ? await devicesRes.json() : { data: [] };

    return new Response(
      JSON.stringify({
        configured: true,
        projectId,
        range,
        since,
        until,
        granularity,
        summary: {
          pageviews: Number(countsData?.data?.pageviews || 0),
          visitors: Number(countsData?.data?.visitors || 0),
        },
        timeseries: Array.isArray(timeseriesData?.data) ? timeseriesData.data : [],
        pages: Array.isArray(pagesData?.data) ? pagesData.data : [],
        referrers: Array.isArray(referrersData?.data) ? referrersData.data : [],
        countries: Array.isArray(countriesData?.data) ? countriesData.data : [],
        devices: Array.isArray(devicesData?.data) ? devicesData.data : [],
      }),
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        configured: true,
        error: err?.message || "Erreur de connexion aux serveurs Vercel Analytics.",
        projectId,
        range,
        since,
        until,
      }),
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  }
};
