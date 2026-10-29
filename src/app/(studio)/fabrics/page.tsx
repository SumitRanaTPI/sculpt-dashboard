"use client";

import { useMemo, useState } from "react";
import { FabricCard } from "@/components/FabricCard";
import { FabricExportSheet } from "@/components/export/FabricExportSheet";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/States";
import type { FabricListRow, FabricStockKind } from "@/lib/api/types";
import { fetchFabricList } from "@/lib/api/studio";
import { fabricStockKind } from "@/lib/fabricKind";
import { matchesFabricSearch } from "@/lib/export/filter";
import { useAsync } from "@/lib/hooks/useAsync";

type KindFilter = "all" | FabricStockKind;

export default function FabricsPage() {
  const list = useAsync(fetchFabricList, []);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [exportOpen, setExportOpen] = useState(false);
  const [cardExport, setCardExport] = useState<FabricListRow | null>(null);

  const filtered = useMemo(() => {
    if (list.status !== "ready") return [];
    return list.data.filter((row) => {
      if (kindFilter !== "all" && fabricStockKind(row) !== kindFilter) return false;
      return matchesFabricSearch(row, query);
    });
  }, [list.status, list.data, query, kindFilter]);

  const counts = useMemo(() => {
    if (list.status !== "ready") return { all: 0, fabric: 0, stole: 0 };
    let fabric = 0;
    let stole = 0;
    for (const row of list.data) {
      if (fabricStockKind(row) === "stole") stole += 1;
      else fabric += 1;
    }
    return { all: list.data.length, fabric, stole };
  }, [list.status, list.data]);

  return (
    <>
      <div className="page__head">
        <div>
          <div className="eyebrow">Studio</div>
          <h1>Fabrics</h1>
          {list.status === "ready" ? (
            <p className="muted small" style={{ marginTop: 4 }}>
              {counts.all} active cloth stock · newest first
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
            <label htmlFor="fabric-q" className="muted small">
              Search title, ID, or studio number
            </label>
            <input
              id="fabric-q"
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

      <div className="kind-filter" role="tablist" aria-label="Cloth stock kind">
        {(
          [
            ["all", "All", counts.all],
            ["fabric", "Fabric", counts.fabric],
            ["stole", "Stole", counts.stole],
          ] as const
        ).map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={kindFilter === value}
            className={kindFilter === value ? "chip chip--on" : "chip"}
            onClick={() => setKindFilter(value)}
            disabled={list.status !== "ready"}
          >
            {label}
            {list.status === "ready" ? <span className="kind-filter__count">{count}</span> : null}
          </button>
        ))}
      </div>

      {list.status === "ready" ? (
        <FabricExportSheet
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          fabrics={list.data}
          searchQuery={query}
          kindFilter={kindFilter}
        />
      ) : null}
      {cardExport ? (
        <FabricExportSheet open onClose={() => setCardExport(null)} fabric={cardExport} />
      ) : null}

      {list.status === "loading" ? (
        <CardSkeleton count={8} />
      ) : list.status === "error" ? (
        <ErrorState message={list.error} onRetry={() => void list.reload()} />
      ) : list.data.length === 0 ? (
        <EmptyState title="No cloth stock yet">
          Fabrics and stoles logged on the phone will appear here.
        </EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState title="No matches">
          Nothing matches
          {query.trim() ? ` “${query.trim()}”` : ""}
          {kindFilter !== "all" ? ` in ${kindFilter === "stole" ? "stoles" : "fabrics"}` : ""}.
        </EmptyState>
      ) : (
        <div className="grid grid--cards">
          {filtered.map((row) => (
            <FabricCard key={row.id} fabric={row} onExport={() => setCardExport(row)} />
          ))}
        </div>
      )}
    </>
  );
}
