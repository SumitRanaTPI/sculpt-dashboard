"use client";

import { useMemo, useState } from "react";
import { AddOptionForm } from "@/components/specs/AddOptionForm";
import { AddSpecForm } from "@/components/specs/AddSpecForm";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { fetchParameterCatalog } from "@/lib/api/studio";
import { CODING_SLOTS, CORE_KEYS, type CodingSlot, type ParameterCatalogRow } from "@/lib/api/types";
import { useAsync } from "@/lib/hooks/useAsync";

type SlotKey = CodingSlot | "none";

const SLOT_LABEL: Record<SlotKey, string> = {
  style: "Style",
  class: "Class",
  look: "Look",
  element: "Element",
  build: "Build",
  finish: "Finish",
  none: "No coding slot",
};

const SLOT_ORDER: SlotKey[] = [...CODING_SLOTS, "none"];

function isCore(key: string): boolean {
  return (CORE_KEYS as readonly string[]).includes(key);
}

export default function SpecsPage() {
  const catalog = useAsync(fetchParameterCatalog, []);
  const [showSpecForm, setShowSpecForm] = useState(false);
  const [optionFor, setOptionFor] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ kind: "ok" | "info"; text: string } | null>(null);

  const groups = useMemo(() => {
    const map = new Map<SlotKey, ParameterCatalogRow[]>();
    if (catalog.status !== "ready") return map;
    for (const row of catalog.data) {
      const slot: SlotKey = row.coding_slot ?? "none";
      const bucket = map.get(slot) ?? [];
      bucket.push(row);
      map.set(slot, bucket);
    }
    return map;
  }, [catalog.status, catalog.data]);

  function replaceRow(row: ParameterCatalogRow) {
    catalog.setData((prev) => {
      const idx = prev.findIndex((p) => p.id === row.id);
      if (idx === -1) return [...prev, row].sort((a, b) => a.sort_order - b.sort_order);
      const next = prev.slice();
      next[idx] = row;
      return next;
    });
  }

  return (
    <>
      <div className="page__head">
        <div>
          <div className="eyebrow">Catalog</div>
          <h1>Specs</h1>
          <p className="muted small" style={{ marginTop: 4 }}>
            Anything added here appears in the phone’s Add Garment flow after a catalog refresh.
          </p>
        </div>
        <button
          type="button"
          className="btn btn--gold"
          onClick={() => {
            setShowSpecForm((v) => !v);
            setFlash(null);
          }}
          disabled={catalog.status !== "ready"}
        >
          {showSpecForm ? "Close" : "Add Spec"}
        </button>
      </div>

      {flash ? (
        <div className={`notice notice--${flash.kind}`} role="status" style={{ marginBottom: 16 }}>
          {flash.text}
        </div>
      ) : null}

      {showSpecForm && catalog.status === "ready" ? (
        <div className="card card--pad" style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 16 }}>New Spec</h2>
          <AddSpecForm
            onCancel={() => setShowSpecForm(false)}
            onCreated={(res) => {
              replaceRow(res.parameter);
              setShowSpecForm(false);
              setOptionFor(res.parameter.id);
              setFlash({
                kind: res.reactivated ? "info" : "ok",
                text: res.reactivated
                  ? `“${res.parameter.label}” was inactive and has been turned back on. ID ${res.parameter.id}`
                  : `Spec “${res.parameter.label}” added. ID ${res.parameter.id}. You can add its first option below.`,
              });
              void catalog.reload(true);
            }}
          />
        </div>
      ) : null}

      {catalog.status === "loading" ? (
        <LoadingState label="Loading catalog…" />
      ) : catalog.status === "error" ? (
        <ErrorState message={catalog.error} onRetry={() => void catalog.reload()} />
      ) : catalog.data.length === 0 ? (
        <EmptyState title="The catalog is empty">Add a Spec to begin.</EmptyState>
      ) : (
        SLOT_ORDER.filter((slot) => groups.has(slot)).map((slot) => {
          const rows = groups.get(slot) ?? [];
          return (
            <section key={slot} className="slot" aria-label={SLOT_LABEL[slot]}>
              <div className="slot__head">
                <h2>{SLOT_LABEL[slot]}</h2>
                <span className="muted small">
                  {rows.length} {rows.length === 1 ? "Spec" : "Specs"}
                </span>
              </div>
              <div className="list">
                {rows.map((row) => {
                  const options = row.options ?? [];
                  const open = optionFor === row.id;
                  return (
                    <article key={row.id} className="card spec">
                      <div className="spec__head">
                        <div>
                          <h3>
                            {row.label}{" "}
                            <span className="mono muted" style={{ fontFamily: "var(--mono)", fontSize: 13 }}>
                              {row.key}
                            </span>
                          </h3>
                          {row.description ? <p className="muted small">{row.description}</p> : null}
                          <div className="spec__meta" style={{ marginTop: 6 }}>
                            <span className="chip">{row.selection}</span>
                            <span className="chip">{row.required ? "required" : "optional"}</span>
                            {isCore(row.key) ? <span className="chip">core</span> : null}
                            <span className="muted small">#{row.sort_order}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => {
                            setOptionFor(open ? null : row.id);
                            setFlash(null);
                          }}
                        >
                          {open ? "Close" : "Add option"}
                        </button>
                      </div>

                      {options.length === 0 ? (
                        <p className="muted small">No options yet.</p>
                      ) : (
                        <div className="options">
                          {options.map((o) => (
                            <span key={o.id} className="option" title={o.description ?? undefined}>
                              <span
                                className="option__swatch"
                                style={{ background: o.colour ?? "transparent" }}
                                aria-hidden="true"
                              />
                              {o.label}
                              <span className="option__code">{o.code}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {open ? (
                        <div className="drawer">
                          <AddOptionForm
                            spec={row}
                            onCancel={() => setOptionFor(null)}
                            onCreated={(res) => {
                              replaceRow(res.parameter);
                              setOptionFor(null);
                              setFlash({
                                kind: res.reactivated ? "info" : "ok",
                                text: res.reactivated
                                  ? `An inactive option with that code on “${res.parameter.label}” was turned back on.`
                                  : `Option added to “${res.parameter.label}”.`,
                              });
                              void catalog.reload(true);
                            }}
                          />
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </>
  );
}
