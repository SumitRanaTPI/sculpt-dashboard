"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Fragment, useCallback, useState } from "react";
import { ExportSheet } from "@/components/export/ExportSheet";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { fetchGarmentDetail, NotFoundError } from "@/lib/api/studio";
import type { GarmentDetail } from "@/lib/api/types";
import { useAsync } from "@/lib/hooks/useAsync";
import { specGroups, taxonomyRows } from "@/lib/taxonomy/rows";

type DetailResult = { kind: "found"; garment: GarmentDetail } | { kind: "missing" };

export default function GarmentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const loader = useCallback(async (): Promise<DetailResult> => {
    try {
      return { kind: "found", garment: await fetchGarmentDetail(id) };
    } catch (err) {
      if (err instanceof NotFoundError) return { kind: "missing" };
      throw err;
    }
  }, [id]);

  const detail = useAsync(loader, [loader]);
  const [exportOpen, setExportOpen] = useState(false);

  const back = (
    <Link href="/garments" className="muted small">
      ← All garments
    </Link>
  );

  if (detail.status === "loading") {
    return (
      <>
        {back}
        <LoadingState label="Loading garment…" />
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
          <EmptyState title="Garment not found">
            This garment is not in the studio. It may have been retired.
          </EmptyState>
        </div>
      </>
    );
  }

  const g = detail.data.garment;
  const codes = taxonomyRows(g);
  const groups = specGroups(g);
  const facts: Array<[string, string, boolean]> = [
    ["Catalogue ID", g.human_id, true],
    ["Style number", g.style_number?.trim() || "—", true],
    ["Barcode", g.barcode?.trim() || "—", true],
    ["Season", g.season_label?.trim() || "—", false],
  ];

  return (
    <>
      {back}
      <div className="detail__top">
        <div>
          <div className="eyebrow">{g.short_badge || "Garment"}</div>
          <h1>{g.title}</h1>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setExportOpen(true)}>
          Export this garment
        </button>
      </div>
      <ExportSheet open={exportOpen} onClose={() => setExportOpen(false)} garment={g} />

      <div className="detail">
        <div className="detail__media">
          {g.hero_image_url ? (
            <div className="detail__hero">
              <img src={g.hero_image_url} alt={g.title} />
            </div>
          ) : (
            <div className="detail__hero detail__hero--empty" aria-hidden="true">
              <span>{g.title.trim().charAt(0).toUpperCase() || "S"}</span>
            </div>
          )}
          {g.gallery_urls.length > 0 || g.video_urls.length > 0 ? (
            <div className="detail__strip" aria-label="Gallery">
              {g.gallery_urls.map((url, i) => (
                <a key={`${url}-${i}`} href={url} target="_blank" rel="noreferrer" className="thumb">
                  <img src={url} alt={`${g.title} ${i + 1}`} loading="lazy" />
                </a>
              ))}
              {g.video_urls.map((url, i) => (
                <a key={`${url}-${i}`} href={url} target="_blank" rel="noreferrer" className="chip">
                  Video {i + 1}
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <table className="data">
          <tbody>
            {codes.map((row) => (
              <tr key={row.name}>
                <th scope="row">{row.name}</th>
                <td className="mono">{row.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="detail__section" aria-label="Details">
        <h2>Details</h2>
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
              <td>{g.description?.trim() || "—"}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="detail__section" aria-label="Specs">
        <h2>Specs</h2>
        {groups.length === 0 ? (
          <p className="muted small">No extra specs.</p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th scope="col">Spec</th>
                <th scope="col">Selection</th>
                <th scope="col">Code</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <Fragment key={group.name}>
                  <tr className="data__group">
                    <th scope="colgroup" colSpan={3}>
                      {group.name}
                      <span className="mono">{group.code}</span>
                    </th>
                  </tr>
                  {group.lines.map((line) => (
                    <tr key={`${group.name}-${line.key}`}>
                      <th scope="row">{line.label}</th>
                      <td>
                        {line.selection}
                        {line.note ? <span className="muted"> · {line.note}</span> : null}
                      </td>
                      <td className="mono">{line.code}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="detail__section" aria-label="Components">
        <h2>Components</h2>
        {g.components.length === 0 ? (
          <p className="muted small">No components.</p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Type</th>
                <th scope="col">Description</th>
              </tr>
            </thead>
            <tbody>
              {g.components.map((c) => {
                const notes = Object.values(c.other_notes ?? {})
                  .map((note) => note.trim())
                  .filter(Boolean);
                return (
                  <tr key={c.id}>
                    <td className="mono">{c.human_id}</td>
                    <td>{c.type_label || "—"}</td>
                    <td>
                      {c.description?.trim() || "—"}
                      {notes.length ? <span className="muted"> · {notes.join(", ")}</span> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {g.parameter_media.length > 0 ? (
        <section className="detail__section" aria-label="Spec photos">
          <h2>Spec photos</h2>
          <div className="detail__strip">
            {g.parameter_media.map((m, i) => (
              <a key={`${m.image_url}-${i}`} href={m.image_url} target="_blank" rel="noreferrer" className="thumb" title={m.parameter_label}>
                <img src={m.image_url} alt={m.parameter_label} loading="lazy" />
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
