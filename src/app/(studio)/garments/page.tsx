"use client";

import { useMemo, useState } from "react";
import { ExportSheet } from "@/components/export/ExportSheet";
import { GarmentCard } from "@/components/GarmentCard";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/States";
import type { GarmentListRow } from "@/lib/api/types";
import { fetchGarmentList } from "@/lib/api/studio";
import { matchesListSearch } from "@/lib/export/filter";
import { useAsync } from "@/lib/hooks/useAsync";

export default function GarmentsPage() {
  const list = useAsync(fetchGarmentList, []);
  const [query, setQuery] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [cardExport, setCardExport] = useState<GarmentListRow | null>(null);

  const filtered = useMemo(() => {
    if (list.status !== "ready") return [];
    return list.data.filter((garment) => matchesListSearch(garment, query));
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
        <div className="garments__tools">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setExportOpen(true)}
            disabled={list.status !== "ready"}
          >
            Export
          </button>
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
      </div>

      {list.status === "ready" ? (
        <ExportSheet
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          garments={list.data}
          searchQuery={query}
        />
      ) : null}
      {cardExport ? (
        <ExportSheet open onClose={() => setCardExport(null)} garment={cardExport} />
      ) : null}

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
            <GarmentCard key={g.id} garment={g} onExport={() => setCardExport(g)} />
          ))}
        </div>
      )}
    </>
  );
}
