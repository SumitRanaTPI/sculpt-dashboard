"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { initialsOf, useProfile } from "@/components/ProfileProvider";
import { ErrorState, LoadingState } from "@/components/States";

export default function StudioPage() {
  const profile = useProfile();
  const { signOut } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onSignOut() {
    setBusy(true);
    await signOut();
    router.replace("/sign-in");
  }

  return (
    <>
      <div className="page__head">
        <div>
          <div className="eyebrow">Account</div>
          <h1>Studio</h1>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onSignOut} disabled={busy}>
          {busy ? "Signing out…" : "Sign out"}
        </button>
      </div>

      {profile.status === "loading" ? (
        <LoadingState label="Loading profile…" />
      ) : profile.status === "error" ? (
        <ErrorState message={profile.error} onRetry={() => void profile.reload()} />
      ) : (
        <div className="card card--pad">
          <div className="profile">
            {profile.data.avatar_url ? (
              <img className="profile__avatar" src={profile.data.avatar_url} alt="" />
            ) : (
              <div className="profile__avatar" aria-hidden="true">
                {initialsOf(profile.data.display_name) || "·"}
              </div>
            )}
            <dl className="kv">
              <dt>Name</dt>
              <dd>{profile.data.display_name || <span className="muted">—</span>}</dd>
              <dt>Role</dt>
              <dd>{profile.data.role || <span className="muted">—</span>}</dd>
              <dt>Email</dt>
              <dd className="mono">{profile.data.email || <span className="muted">—</span>}</dd>
              <dt>Studio</dt>
              <dd>{profile.data.studio_name || <span className="muted">—</span>}</dd>
              <dt>Location</dt>
              <dd>{profile.data.location || <span className="muted">—</span>}</dd>
              <dt>Garments logged</dt>
              <dd>{profile.data.garments_logged ?? 0}</dd>
              <dt>Seasons active</dt>
              <dd>{profile.data.seasons_active ?? 0}</dd>
            </dl>
          </div>
        </div>
      )}
    </>
  );
}
