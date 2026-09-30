import Link from "next/link";
import type { GarmentListRow } from "@/lib/api/types";

export function taxonomyLine(g: GarmentListRow): string {
  return [
    g.season_label,
    g.gender_label,
    g.wear_system_label,
    g.garment_type_label,
    g.silhouette_label,
    g.fabric_label,
  ]
    .filter((v): v is string => !!v && v.trim().length > 0)
    .join(" · ");
}

export function GarmentCard({ garment }: { garment: GarmentListRow }) {
  const tax = taxonomyLine(garment);
  const codes = garment.ornamentation_codes ?? [];
  return (
    <Link href={`/garments/${garment.id}`} className="card gcard" aria-label={garment.title}>
      <div className="gcard__media">
        {garment.hero_image_url ? (
          <img src={garment.hero_image_url} alt="" loading="lazy" />
        ) : (
          <div className="gcard__placeholder" aria-hidden="true">
            {garment.title.trim().charAt(0).toUpperCase() || "S"}
          </div>
        )}
        {garment.short_badge ? <span className="gcard__badge">{garment.short_badge}</span> : null}
        {garment.has_video ? <span className="gcard__video">Video</span> : null}
      </div>
      <div className="gcard__body">
        <div className="gcard__title">{garment.title}</div>
        <div className="gcard__ids">
          <span className="mono">{garment.human_id}</span>
          {garment.style_number ? <span className="mono muted">{garment.style_number}</span> : null}
        </div>
        {tax ? <div className="taxonomy">{tax}</div> : null}
        {codes.length > 0 ? (
          <div className="chips">
            {codes.map((c) => (
              <span key={c} className="chip chip--code">
                {c}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
