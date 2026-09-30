"use client";

import Link from "next/link";
import { GarmentCard } from "@/components/GarmentCard";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/States";
import { fetchHomeDashboard } from "@/lib/api/studio";
import { useAsync } from "@/lib/hooks/useAsync";

export default function HomePage() {
  const home = useAsync(fetchHomeDashboard, []);

  if (home.status === "error") {
    return (
      <>
        <div className="page__head">
          <div>
            <div className="eyebrow">Studio</div>
            <h1>Home</h1>
          </div>
        </div>
        <ErrorState message={home.error} onRetry={() => void home.reload()} />
      </>
    );
  }

  const data = home.status === "ready" ? home.data : null;
  const stats = [
    { label: "Garments", value: data?.stats.total_garments },
    { label: "Seasons", value: data?.stats.unique_seasons },
    { label: "Genders", value: data?.stats.unique_genders },
    { label: "Garment types", value: data?.stats.unique_garment_types },
  ];

  return (
    <>
      <div className="page__head">
        <div>
          <div className="eyebrow">{data?.date_label || "Studio"}</div>
          <h1>{data?.studio_label || "Home"}</h1>
        </div>
        <Link href="/garments" className="btn btn--ghost btn--sm">
          All garments
        </Link>
      </div>

      <section className="grid grid--stats" aria-label="Studio stats">
        {stats.map((s) => (
          <div key={s.label} className="card stat">
            <div className="stat__label">{s.label}</div>
            {data ? (
              <div className="stat__value">{s.value ?? 0}</div>
            ) : (
              <div className="skeleton" style={{ height: 36, width: 64, marginTop: 8 }} />
            )}
          </div>
        ))}
      </section>

      <section className="detail__section" aria-label="Recent garments">
        <div className="page__head" style={{ marginBottom: 12 }}>
          <h2>Recent</h2>
        </div>
        {!data ? (
          <CardSkeleton />
        ) : data.recent.length === 0 ? (
          <EmptyState title="No garments yet">Garments logged on the phone will appear here.</EmptyState>
        ) : (
          <div className="grid grid--cards">
            {data.recent.map((g) => (
              <GarmentCard key={g.id} garment={g} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
