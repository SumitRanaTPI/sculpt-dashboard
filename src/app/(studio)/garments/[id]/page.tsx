"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { fetchGarmentDetail, NotFoundError } from "@/lib/api/studio";
import type { GarmentDetail } from "@/lib/api/types";
import { useAsync } from "@/lib/hooks/useAsync";

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
  const codes = g.ornamentation_codes ?? [];
  const taxonomy: Array<[string, string | null]> = [
    ["Season", g.season_label],
    ["Gender", g.gender_label],
    ["Wear system", g.wear_system_label],
    ["Garment type", g.garment_type_label],
    ["Silhouette", g.silhouette_label],
    ["Fabric", g.fabric_label],
  ];

  return (
    <>
      {back}
      <div className="detail" style={{ marginTop: 16 }}>
        <div>
          {g.hero_image_url ? (
            <div className="detail__hero">
              <img src={g.hero_image_url} alt={g.title} />
            </div>
          ) : (
            <div className="detail__hero detail__hero--empty" aria-hidden="true">
              <span>{g.title.trim().charAt(0).toUpperCase() || "S"}</span>
            </div>
          )}
          {g.gallery_urls.length > 0 ? (
            <section className="detail__section" aria-label="Gallery">
              <h2>Gallery</h2>
              <div className="thumbs">
                {g.gallery_urls.map((url, i) => (
                  <a key={`${url}-${i}`} href={url} target="_blank" rel="noreferrer" className="thumb">
                    <img src={url} alt={`${g.title} ${i + 1}`} loading="lazy" />
                  </a>
                ))}
              </div>
            </section>
          ) : null}
          {g.video_urls.length > 0 ? (
            <section className="detail__section" aria-label="Video">
              <h2>Video</h2>
              <ul className="list" style={{ paddingLeft: 0, listStyle: "none" }}>
                {g.video_urls.map((url, i) => (
                  <li key={`${url}-${i}`}>
                    <a href={url} target="_blank" rel="noreferrer" className="chip">
                      Video {i + 1}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <div>
          <div className="eyebrow">{g.short_badge || "Garment"}</div>
          <h1>{g.title}</h1>
          <div className="gcard__ids" style={{ marginTop: 8 }}>
            <span className="mono">{g.human_id}</span>
            {g.style_number ? <span className="mono muted">{g.style_number}</span> : null}
            {g.has_video ? <span className="chip">Video</span> : null}
          </div>
          {g.description ? (
            <p style={{ marginTop: 16, maxWidth: 640 }}>{g.description}</p>
          ) : (
            <p className="muted" style={{ marginTop: 16 }}>
              No description.
            </p>
          )}

          <section className="detail__section" aria-label="Taxonomy">
            <h2>Taxonomy</h2>
            <dl className="kv">
              {taxonomy.map(([label, value]) => (
                <div key={label} style={{ display: "contents" }}>
                  <dt>{label}</dt>
                  <dd>{value || <span className="muted">—</span>}</dd>
                </div>
              ))}
              <dt>Ornamentation</dt>
              <dd>
                {codes.length ? (
                  <span className="chips">
                    {codes.map((c) => (
                      <span key={c} className="chip chip--code">
                        {c}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="muted">—</span>
                )}
              </dd>
            </dl>
          </section>

          {g.custom_selections.length > 0 ? (
            <section className="detail__section" aria-label="Specs">
              <h2>Specs</h2>
              <dl className="kv">
                {g.custom_selections.map((sel) => (
                  <div key={sel.parameter_key} style={{ display: "contents" }}>
                    <dt>{sel.parameter_label}</dt>
                    <dd>
                      <div>{sel.labels.join(", ") || <span className="muted">—</span>}</div>
                      {sel.codes.length ? (
                        <div className="chips" style={{ marginTop: 4 }}>
                          {sel.codes.map((c) => (
                            <span key={c} className="chip chip--code">
                              {c}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <section className="detail__section" aria-label="Components">
            <h2>Components</h2>
            {g.components.length === 0 ? (
              <p className="muted small">No components.</p>
            ) : (
              <div className="list">
                {g.components.map((c) => (
                  <div key={c.id} className="card card--pad">
                    <div className="gcard__ids">
                      <span className="mono">{c.human_id}</span>
                      {c.type_label ? <span className="chip">{c.type_label}</span> : null}
                    </div>
                    {c.description ? <p style={{ marginTop: 6 }}>{c.description}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="detail__section" aria-label="Spec photos">
            <h2>Spec photos</h2>
            {g.parameter_media.length === 0 ? (
              <p className="muted small">No spec photos.</p>
            ) : (
              <div className="thumbs">
                {g.parameter_media.map((m, i) => (
                  <div key={`${m.image_url}-${i}`}>
                    <a href={m.image_url} target="_blank" rel="noreferrer" className="thumb">
                      <img src={m.image_url} alt={m.parameter_label} loading="lazy" />
                    </a>
                    <div className="thumb__caption">{m.parameter_label}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
