"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import { ProfileProvider } from "@/components/ProfileProvider";

/**
 * Every route in this group requires a signed-in studio account.
 * Signed-out visits are sent to /sign-in. When a data call clears the
 * session (failed refresh), the auth context updates and this redirects too.
 */
export default function StudioLayout({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (session === null) router.replace("/sign-in");
  }, [session, router]);

  if (!session) {
    // Undefined: still reading sessionStorage. Null: redirecting.
    return <div className="shell" />;
  }

  return (
    <ProfileProvider>
      <AppShell>{children}</AppShell>
    </ProfileProvider>
  );
}
