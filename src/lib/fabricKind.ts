import type { FabricListRow, FabricStockKind } from "@/lib/api/types";

export function fabricStockKind(row: Pick<FabricListRow, "kind">): FabricStockKind {
  return row.kind === "stole" ? "stole" : "fabric";
}

export function fabricKindLabel(kind: FabricStockKind): string {
  return kind === "stole" ? "Stole" : "Fabric";
}

export function fabricTaxonomyLine(row: FabricListRow): string {
  return [row.fabric_label, row.colour_story_label, row.embellishment_density_label]
    .filter((v): v is string => !!v && v.trim().length > 0)
    .join(" · ");
}
