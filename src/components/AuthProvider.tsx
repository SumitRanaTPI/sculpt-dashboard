"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { signInWithPassword, signOut as apiSignOut } from "@/lib/auth/api";
import { loadSession, subscribeSession, type Session } from "@/lib/auth/session";

interface AuthContextValue {
  /** Undefined until sessionStorage has been read on the client. */
  session: Session | null | undefined;
  signIn: (mobile: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    setSession(loadSession());
    return subscribeSession(() => setSession(loadSession()));
  }, []);

  const signIn = useCallback(async (mobile: string, password: string) => {
    const next = await signInWithPassword(mobile, password);
    setSession(next);
  }, []);

  const signOut = useCallback(async () => {
    await apiSignOut();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ session, signIn, signOut }), [session, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
