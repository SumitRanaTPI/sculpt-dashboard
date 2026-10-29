"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { FabricExportSheet } from "@/components/export/FabricExportSheet";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { fetchFabricDetail, NotFoundError } from "@/lib/api/studio";
import type { FabricDetail } from "@/lib/api/types";
import { fabricKindLabel, fabricStockKind } from "@/lib/fabricKind";
import { formatFabricQuantityLabel } from "@/lib/formatQuantity";
import { useAsync } from "@/lib/hooks/useAsync";

type DetailResult = { kind: "found"; fabric: FabricDetail } | { kind: "missing" };

export default function FabricDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const loader = useCallback(async (): Promise<DetailResult> => {
    try {
      return { kind: "found", fabric: await fetchFabricDetail(id) };
    } catch (err) {
      if (err instanceof NotFoundError) return { kind: "missing" };
      throw err;
    }
  }, [id]);

  const detail = useAsync(loader, [loader]);
  const [exportOpen, setExportOpen] = useState(false);

  const back = (
    <Link href="/fabrics" className="muted small">
      ← All fabrics
    </Link>
  );

  if (detail.status === "loading") {
    return (
      <>
        {back}
        <LoadingState label="Loading fabric…" />
      </>
    );
  }
  if (detail.status === "error") {
    return (
      <>
        {back}
        <div style={{ marginTop: 16 }}>
          <ErrorState message={detail.error} onRetry={() => void detail.reload()} />
        </div>
      </>
    );
  }
  if (detail.data.kind === "missing") {
    return (
      <>
        {back}
        <div style={{ marginTop: 16 }}>
          <EmptyState title="Fabric not found">
            This cloth stock row is not in the studio. It may have been retired.
          </EmptyState>
        </div>
      </>
    );
  }

  const f = detail.data.fabric;
  const stockKind = fabricStockKind(f);
  const kindLabel = fabricKindLabel(stockKind);
  const quantity = formatFabricQuantityLabel(f.quantity_meters);
  const ornamentation =
    (f.ornamentation_labels ?? []).filter(Boolean).join(", ") ||
    (f.ornamentation_codes ?? []).filter(Boolean).join(", ") ||
    "—";
  const otherNotes = Object.entries(f.other_notes ?? {}).filter(([, note]) => note.trim());

  const facts: Array<[string, string, boolean]> = [
    ["Catalogue ID", f.human_id, true],
    ["Studio number", f.studio_number?.trim() || "—", true],
    ["Kind", kindLabel, false],
  ];
  if (stockKind === "fabric") {
    facts.push(["Quantity", quantity ?? "—", false]);
  }

  const specs: Array<[string, string, string]> = [
    ["Cloth", f.fabric_label?.trim() || "—", f.fabric_code?.trim() || "—"],
    ["Colour family", f.colour_story_label?.trim() || "—", f.colour_story_code?.trim() || "—"],
    [
      "Work density",
      f.embellishment_density_label?.trim() || "—",
      f.embellishment_density_code?.trim() || "—",
    ],
    ["Ornamentation", ornamentation, (f.ornamentation_codes ?? []).join(", ") || "—"],
  ];

  return (
    <>
      {back}
      <div className="detail__top">
        <div>
          <div className="eyebrow">{kindLabel}</div>
          <h1>{f.title}</h1>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setExportOpen(true)}>
          Export this {stockKind === "stole" ? "stole" : "fabric"}
        </button>
      </div>
      <FabricExportSheet open={exportOpen} onClose={() => setExportOpen(false)} fabric={f} />

      <div className="detail">
        <div className="detail__media">
          {f.hero_image_url ? (
            <div className="detail__hero">
              <img src={f.hero_image_url} alt={f.title} />
            </div>
          ) : (
            <div className="detail__hero detail__hero--empty" aria-hidden="true">
              <span>{f.title.trim().charAt(0).toUpperCase() || "F"}</span>
            </div>
          )}
          {f.gallery_urls.length > 0 ? (
            <div className="detail__strip" aria-label="Gallery">
              {f.gallery_urls.map((url, i) => (
                <a key={`${url}-${i}`} href={url} target="_blank" rel="noreferrer" className="thumb">
                  <img src={url} alt={`${f.title} ${i + 1}`} loading="lazy" />
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <table className="data">
          <tbody>
            {facts.map(([label, value, mono]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td className={mono ? "mono" : undefined}>{value}</td>
              </tr>
            ))}
            <tr>
              <th scope="row">Description</th>
              <td>{f.description?.trim() || "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <section className="detail__section" aria-label="LOOK Specs">
        <h2>LOOK Specs</h2>
        <table className="data">
          <thead>
            <tr>
              <th scope="col">Spec</th>
              <th scope="col">Selection</th>
              <th scope="col">Code</th>
            </tr>
          </thead>
          <tbody>
            {specs.map(([label, selection, code]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{selection}</td>
                <td className="mono">{code}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {otherNotes.length > 0 ? (
        <section className="detail__section" aria-label="Others notes">
          <h2>Others notes</h2>
          <table className="data">
            <tbody>
              {otherNotes.map(([key, note]) => (
                <tr key={key}>
                  <th scope="row">{key}</th>
                  <td>{note.trim()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {f.parameter_media.length > 0 ? (
        <section className="detail__section" aria-label="Spec photos">
          <h2>Spec photos</h2>
          <div className="detail__strip">
            {f.parameter_media.map((m, i) => (
              <a
                key={`${m.image_url}-${i}`}
                href={m.image_url}
                target="_blank"
                rel="noreferrer"
                className="thumb"
                title={m.parameter_label}
              >
                <img src={m.image_url} alt={m.parameter_label} loading="lazy" />
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
