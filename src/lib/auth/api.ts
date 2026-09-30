import { authUrl, env } from "@/lib/env";
import { aliasEmailFor, e164For } from "@/lib/auth/mobile";
import { clearSession, loadSession, saveSession, type Session } from "@/lib/auth/session";

export class AuthError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: number;
  user: { id: string; email?: string | null; phone?: string | null };
}

function baseHeaders(): HeadersInit {
  return {
    apikey: env.anonKey,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

function toSession(body: TokenResponse): Session {
  const expiresAt =
    typeof body.expires_at === "number"
      ? body.expires_at * 1000
      : Date.now() + (body.expires_in ?? 3600) * 1000;
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt,
    user: {
      id: body.user.id,
      email: body.user.email ?? null,
      phone: body.user.phone ?? null,
    },
  };
}

async function readAuthError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as Record<string, unknown>;
    const code = String(body.error_code ?? body.error ?? "");
    const msg = String(body.msg ?? body.error_description ?? body.message ?? "");
    if (code === "invalid_credentials" || code === "invalid_grant" || /invalid login/i.test(msg)) {
      return "Wrong mobile number or password.";
    }
    if (/rate limit|too many/i.test(msg)) return "Too many attempts. Try again in a minute.";
  } catch {
    // fall through
  }
  if (res.status === 400 || res.status === 401) return "Wrong mobile number or password.";
  return "Sign-in failed. Try again.";
}

async function tokenRequest(grant: string, payload: Record<string, string>): Promise<Session> {
  let res: Response;
  try {
    res = await fetch(`${authUrl}/token?grant_type=${grant}`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify(payload),
    });
  } catch {
    throw new AuthError("Could not reach the studio server.", 0);
  }
  if (!res.ok) {
    throw new AuthError(await readAuthError(res), res.status);
  }
  const body = (await res.json()) as TokenResponse;
  if (!body.access_token || !body.refresh_token || !body.user?.id) {
    throw new AuthError("Sign-in failed. Try again.", res.status);
  }
  return toSession(body);
}

/** `mobile` is the already-normalised 10-digit number. */
export async function signInWithPassword(mobile: string, password: string): Promise<Session> {
  const payload: Record<string, string> =
    env.loginMode === "phone"
      ? { phone: e164For(mobile), password }
      : { email: aliasEmailFor(mobile, env.aliasEmailDomain), password };
  const session = await tokenRequest("password", payload);
  saveSession(session);
  return session;
}

let refreshInFlight: Promise<Session | null> | null = null;

/**
 * Refresh the stored session once. Concurrent callers share the same request.
 * Resolves to null (and clears the session) when the refresh fails.
 */
export function refreshSessionOnce(): Promise<Session | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const current = loadSession();
    if (!current) return null;
    try {
      const next = await tokenRequest("refresh_token", { refresh_token: current.refreshToken });
      saveSession(next);
      return next;
    } catch {
      clearSession();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

/** Best-effort server logout, then clear the stored session. */
export async function signOut(): Promise<void> {
  const current = loadSession();
  if (current) {
    try {
      await fetch(`${authUrl}/logout?scope=local`, {
        method: "POST",
        headers: { ...baseHeaders(), Authorization: `Bearer ${current.accessToken}` },
      });
    } catch {
      // best effort
    }
  }
  clearSession();
}
