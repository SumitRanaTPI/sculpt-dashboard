import { env, restUrl } from "@/lib/env";
import { refreshSessionOnce } from "@/lib/auth/api";
import { clearSession, loadSession } from "@/lib/auth/session";

export class ApiError extends Error {
  readonly status: number;
  /** Raw PostgREST message, used only for mapping to short copy. Never shown directly. */
  readonly detail: string;
  readonly code: string | null;

  constructor(message: string, status: number, detail = "", code: string | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.code = code;
  }
}

export class SessionExpiredError extends ApiError {
  constructor() {
    super("Your session has ended. Sign in again.", 401);
    this.name = "SessionExpiredError";
  }
}

interface PostgrestError {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

function headersFor(token: string): HeadersInit {
  return {
    apikey: env.anonKey,
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

async function parseError(res: Response): Promise<ApiError> {
  let detail = "";
  let code: string | null = null;
  try {
    const body = (await res.json()) as PostgrestError;
    detail = body.message ?? "";
    code = body.code ?? null;
  } catch {
    // no body
  }
  const short =
    res.status === 404
      ? "Not found."
      : res.status === 403
        ? "You do not have access to this."
        : res.status >= 500
          ? "The studio server had a problem. Try again."
          : "The request could not be completed.";
  return new ApiError(short, res.status, detail, code);
}

async function doFetch(path: string, init: RequestInit, token: string): Promise<Response> {
  try {
    return await fetch(`${restUrl}${path}`, { ...init, headers: headersFor(token) });
  } catch {
    throw new ApiError("Could not reach the studio server.", 0);
  }
}

/**
 * Authenticated request to PostgREST. On 401, refresh once and retry once.
 * If the refresh fails the session is cleared and SessionExpiredError is thrown.
 */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = loadSession();
  if (!session) throw new SessionExpiredError();

  let res = await doFetch(path, init, session.accessToken);

  if (res.status === 401) {
    const refreshed = await refreshSessionOnce();
    if (!refreshed) {
      clearSession();
      throw new SessionExpiredError();
    }
    res = await doFetch(path, init, refreshed.accessToken);
    if (res.status === 401) {
      clearSession();
      throw new SessionExpiredError();
    }
  }

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function get<T>(path: string): Promise<T> {
  return request<T>(path, { method: "GET" });
}

export function rpc<T>(name: string, body: unknown = {}): Promise<T> {
  return request<T>(`/rpc/${name}`, { method: "POST", body: JSON.stringify(body) });
}
