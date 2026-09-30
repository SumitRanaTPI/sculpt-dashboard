export interface SessionUser {
  id: string;
  email: string | null;
  phone: string | null;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  /** Unix epoch milliseconds. */
  expiresAt: number;
  user: SessionUser;
}

const STORAGE_KEY = "sculpt.dashboard.session";
export const SESSION_EVENT = "sculpt:session";

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function notify(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_EVENT));
}

function isSession(value: unknown): value is Session {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.accessToken === "string" &&
    typeof v.refreshToken === "string" &&
    typeof v.expiresAt === "number" &&
    !!v.user &&
    typeof v.user === "object" &&
    typeof (v.user as Record<string, unknown>).id === "string"
  );
}

export function loadSession(): Session | null {
  if (!hasStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  if (!hasStorage()) return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  notify();
}

export function clearSession(): void {
  if (!hasStorage()) return;
  window.sessionStorage.removeItem(STORAGE_KEY);
  notify();
}

export function subscribeSession(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(SESSION_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(SESSION_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
