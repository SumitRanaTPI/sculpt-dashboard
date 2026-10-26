import type { GarmentListRow } from "../api/types.ts";
import { createdInRange, type DateRange } from "./dates.ts";

/** Same fields as the search box on the Garments page. */
export function matchesListSearch(garment: GarmentListRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [garment.title, garment.human_id, garment.style_number ?? ""].some((value) =>
    value.toLowerCase().includes(q),
  );
}

export function garmentsForExport(
  garments: GarmentListRow[],
  range: DateRange,
  options: { applySearch: boolean; query: string },
): GarmentListRow[] {
  return garments.filter((garment) => {
    if (!createdInRange(garment.created_at, range)) return false;
    if (options.applySearch && !matchesListSearch(garment, options.query)) return false;
    return true;
  });
}
