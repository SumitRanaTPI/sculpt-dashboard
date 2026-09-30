"use client";

import { createContext, useContext, type ReactNode } from "react";
import { fetchStudioProfile } from "@/lib/api/studio";
import type { StudioProfile } from "@/lib/api/types";
import { useAsync, type AsyncState } from "@/lib/hooks/useAsync";

type ProfileContextValue = AsyncState<StudioProfile> & { reload: () => Promise<void> };

const ProfileContext = createContext<ProfileContextValue | null>(null);

/** Fetches `studio_profile` once per signed-in shell and shares it with the header and /studio. */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const state = useAsync(fetchStudioProfile, []);
  const value: ProfileContextValue = {
    status: state.status,
    data: state.data,
    error: state.error,
    reload: state.reload,
  } as ProfileContextValue;
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside ProfileProvider");
  return ctx;
}

export function initialsOf(name: string | null | undefined): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? "") : "";
  return (first + last).toUpperCase();
}
