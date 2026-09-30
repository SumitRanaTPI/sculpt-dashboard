"use client";

import { useMemo, useState } from "react";
import { GarmentCard } from "@/components/GarmentCard";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/States";
import { fetchGarmentList } from "@/lib/api/studio";
import { useAsync } from "@/lib/hooks/useAsync";

export default function GarmentsPage() {
  const list = useAsync(fetchGarmentList, []);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (list.status !== "ready") return [];
    const q = query.trim().toLowerCase();
    if (!q) return list.data;
    return list.data.filter((g) =>
      [g.title, g.human_id, g.style_number ?? ""].some((v) => v.toLowerCase().includes(q)),
    );
  }, [list.status, list.data, query]);

  return (
    <>
      <div className="page__head">
        <div>
          <div className="eyebrow">Studio</div>
          <h1>Garments</h1>
          {list.status === "ready" ? (
            <p className="muted small" style={{ marginTop: 4 }}>
              {list.data.length} active · newest first
            </p>
          ) : null}
        </div>
        <div className="field" style={{ minWidth: 260 }}>
          <label htmlFor="q" className="muted small">
            Search title, ID, or style number
          </label>
          <input
            id="q"
            className="input"
            type="search"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={list.status !== "ready"}
          />
        </div>
      </div>

      {list.status === "loading" ? (
        <CardSkeleton count={8} />
      ) : list.status === "error" ? (
        <ErrorState message={list.error} onRetry={() => void list.reload()} />
      ) : list.data.length === 0 ? (
        <EmptyState title="No active garments">Garments logged on the phone will appear here.</EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState title="No matches">Nothing matches “{query.trim()}”.</EmptyState>
      ) : (
        <div className="grid grid--cards">
          {filtered.map((g) => (
            <GarmentCard key={g.id} garment={g} />
          ))}
        </div>
      )}
    </>
  );
}
