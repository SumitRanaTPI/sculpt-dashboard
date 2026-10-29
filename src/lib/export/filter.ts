import type { FabricListRow, FabricStockKind, GarmentListRow } from "../api/types.ts";
import { fabricStockKind } from "../fabricKind.ts";
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

/** Same fields as the search box on the Fabrics page. */
export function matchesFabricSearch(fabric: FabricListRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [fabric.title, fabric.human_id, fabric.studio_number ?? ""].some((value) =>
    value.toLowerCase().includes(q),
  );
}

export function fabricsForExport(
  fabrics: FabricListRow[],
  range: DateRange,
  options: {
    applySearch: boolean;
    query: string;
    kindFilter?: "all" | FabricStockKind;
  },
): FabricListRow[] {
  const kindFilter = options.kindFilter ?? "all";
  return fabrics.filter((fabric) => {
    if (!createdInRange(fabric.created_at, range)) return false;
    if (kindFilter !== "all" && fabricStockKind(fabric) !== kindFilter) return false;
    if (options.applySearch && !matchesFabricSearch(fabric, options.query)) return false;
    return true;
  });
}
