import Link from "next/link";
import type { FabricListRow } from "@/lib/api/types";
import { fabricKindLabel, fabricStockKind, fabricTaxonomyLine } from "@/lib/fabricKind";
import { formatFabricQuantityLabel } from "@/lib/formatQuantity";

export function FabricCard({
  fabric,
  onExport,
}: {
  fabric: FabricListRow;
  onExport?: () => void;
}) {
  const kind = fabricStockKind(fabric);
  const kindLabel = fabricKindLabel(kind);
  const tax = fabricTaxonomyLine(fabric);
  const quantity = formatFabricQuantityLabel(fabric.quantity_meters);
  const codes = fabric.ornamentation_codes ?? [];
  const studio = fabric.studio_number?.trim() || null;

  return (
    <Link href={`/fabrics/${fabric.id}`} className="card gcard" aria-label={`${fabric.title}, ${kindLabel}`}>
      <div className="gcard__media">
        {fabric.hero_image_url ? (
          <img src={fabric.hero_image_url} alt="" loading="lazy" />
        ) : (
          <div className="gcard__placeholder" aria-hidden="true">
            {fabric.title.trim().charAt(0).toUpperCase() || "F"}
          </div>
        )}
        <span className="gcard__badge">{studio || fabric.human_id}</span>
        <span className={`gcard__kind gcard__kind--${kind}`}>{kindLabel}</span>
      </div>
      <div className="gcard__body">
        <div className="gcard__title">{fabric.title}</div>
        <div className="gcard__ids">
          <span className="mono">{fabric.human_id}</span>
          {quantity ? <span className="mono muted">{quantity}</span> : null}
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
        {onExport ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm gcard__export"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onExport();
            }}
          >
            Export
          </button>
        ) : null}
      </div>
    </Link>
  );
}
