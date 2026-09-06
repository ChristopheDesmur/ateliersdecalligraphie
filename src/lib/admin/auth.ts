import crypto from "node:crypto";

export const SESSION_COOKIE_NAME = "admin_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 jours

interface AuthSession {
  role: "admin";
  iat: number;
  exp: number;
}

// Limite les tentatives de connexion par IP : 5 essais / 15 min, en mémoire du
// process serverless (best-effort — une nouvelle instance froide réinitialise
// le compteur, mais dissuade largement le bruteforce en pratique).
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function getAdminPassword(): string | undefined {
  const raw = process.env.ADMIN_PASSWORD;
  return raw ? raw.trim() : undefined;
}

/** Récupère le secret de signature des sessions. Dérivé du mot de passe admin
 * à défaut d'un secret dédié, pour éviter d'exiger une deuxième variable
 * d'environnement obligatoire. */
function getSigningSecret(): string {
  const dedicated = process.env.ADMIN_SESSION_SECRET?.trim();
  if (dedicated) return dedicated;
  const password = getAdminPassword();
  if (password) return `session-secret:${password}`;
  throw new Error("ADMIN_PASSWORD n'est pas configuré.");
}

/** Comparaison en temps constant pour éviter les attaques par timing. */
export function verifyPassword(provided: string): boolean {
  const expected = getAdminPassword();
  if (!expected || !provided) return false;
  const providedHash = crypto.createHash("sha256").update(provided, "utf8").digest();
  const expectedHash = crypto.createHash("sha256").update(expected, "utf8").digest();
  return crypto.timingSafeEqual(providedHash, expectedHash);
}

export function isAdminConfigured(): boolean {
  return Boolean(getAdminPassword());
}

export function checkRateLimit(ip: string, maxAttempts = 5, windowMs = 15 * 60 * 1000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1 };
  }
  if (record.count >= maxAttempts) return { allowed: false, remaining: 0 };
  record.count += 1;
  return { allowed: true, remaining: maxAttempts - record.count };
}

export function resetRateLimit(ip: string): void {
  rateLimitMap.delete(ip);
}

export function createSessionToken(durationSeconds = SESSION_DURATION_SECONDS): string {
  const secret = getSigningSecret();
  const now = Date.now();
  const session: AuthSession = { role: "admin", iat: now, exp: now + durationSeconds * 1000 };
  const payloadBase64 = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payloadBase64).digest("base64url");
  return `${payloadBase64}.${signature}`;
}

export function verifySessionToken(token: string | null | undefined): AuthSession | null {
  if (!token) return null;
  const parts = token.trim().split(".");
  if (parts.length !== 2) return null;
  const [payloadBase64, signature] = parts;

  let secret: string;
  try {
    secret = getSigningSecret();
  } catch {
    return null;
  }

  const expectedSig = crypto.createHmac("sha256", secret).update(payloadBase64).digest("base64url");
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSig);
  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const session: AuthSession = JSON.parse(Buffer.from(payloadBase64, "base64url").toString("utf8"));
    if (session.role !== "admin" || typeof session.exp !== "number") return null;
    if (Date.now() > session.exp) return null;
    return session;
  } catch {
    return null;
  }
}

export function createCsrfToken(sessionToken: string): string {
  const secret = getSigningSecret();
  return crypto.createHmac("sha256", secret).update(`csrf:${sessionToken}`).digest("base64url");
}

export function verifyCsrfToken(csrfToken: string | null | undefined, sessionToken: string): boolean {
  if (!csrfToken) return false;
  const expected = createCsrfToken(sessionToken);
  const a = Buffer.from(csrfToken);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function parseCookieHeader(header: string | null | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    try {
      cookies[key] = decodeURIComponent(val);
    } catch {
      cookies[key] = val;
    }
  }
  return cookies;
}

export function authenticateRequest(request: Request): { session: AuthSession | null; sessionToken: string | null } {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  const token = cookies[SESSION_COOKIE_NAME] || null;
  const session = verifySessionToken(token);
  return session ? { session, sessionToken: token } : { session: null, sessionToken: null };
}

function isSecureRequest(request: Request): boolean {
  return request.url.startsWith("https:") || process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}

export function serializeSessionCookie(token: string, request: Request, durationSeconds = SESSION_DURATION_SECONDS): string {
  const flags = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    `Max-Age=${durationSeconds}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (isSecureRequest(request)) flags.push("Secure");
  return flags.join("; ");
}

export function clearSessionCookie(request: Request): string {
  const flags = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (isSecureRequest(request)) flags.push("Secure");
  return flags.join("; ");
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "127.0.0.1";
}
