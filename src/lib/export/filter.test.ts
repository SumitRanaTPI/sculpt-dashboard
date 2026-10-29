import assert from "node:assert/strict";
import test from "node:test";
import type { FabricListRow, GarmentListRow } from "../api/types.ts";
import { fabricsForExport, garmentsForExport } from "./filter.ts";

function row(overrides: Partial<GarmentListRow>): GarmentListRow {
  return {
    id: "1",
    human_id: "SC-1",
    style_number: "ST-1",
    title: "Ivory Anarkali",
    description: null,
    short_badge: null,
    season_label: "Autumn",
    gender_label: "Women",
    wear_system_label: null,
    garment_type_label: null,
    silhouette_label: null,
    fabric_label: null,
    ornamentation_codes: [],
    hero_image_url: null,
    has_video: false,
    created_at: "2026-10-05T04:00:00.000Z",
    ...overrides,
  };
}

const range = { from: "2026-10-05", to: "2026-10-05" };

test("date range ignores the search box unless asked", () => {
  const garments = [
    row({ id: "a", title: "Ivory Anarkali" }),
    row({ id: "b", title: "Indigo Kurta", created_at: "2026-10-04T04:00:00.000Z" }),
    row({ id: "c", title: "Rust Lehenga" }),
  ];
  const dated = garmentsForExport(garments, range, { applySearch: false, query: "ivory" });
  assert.deepEqual(
    dated.map((garment) => garment.id),
    ["a", "c"],
  );
  const searched = garmentsForExport(garments, range, { applySearch: true, query: "ivory" });
  assert.deepEqual(
    searched.map((garment) => garment.id),
    ["a"],
  );
});

function fabricRow(overrides: Partial<FabricListRow>): FabricListRow {
  return {
    id: "f1",
    human_id: "SCULPT-FAB-COT-001",
    kind: "fabric",
    studio_number: "FAB-001",
    title: "Ivory cotton",
    description: null,
    fabric_code: "COT",
    fabric_label: "Cotton",
    colour_story_code: "NTR",
    colour_story_label: "Neutral",
    embellishment_density_code: "D0",
    embellishment_density_label: "None",
    ornamentation_codes: [],
    ornamentation_labels: [],
    hero_image_url: null,
    created_at: "2026-10-05T04:00:00.000Z",
    quantity_meters: 12.5,
    ...overrides,
  };
}

test("fabric export respects kind filter and search", () => {
  const fabrics = [
    fabricRow({ id: "a", title: "Ivory cotton" }),
    fabricRow({
      id: "b",
      kind: "stole",
      human_id: "SCULPT-STL-SLK-001",
      studio_number: "STL-001",
      title: "Silk stole",
      quantity_meters: null,
    }),
    fabricRow({
      id: "c",
      title: "Rust linen",
      studio_number: "FAB-099",
      created_at: "2026-10-04T04:00:00.000Z",
    }),
  ];
  const dated = fabricsForExport(fabrics, range, {
    applySearch: false,
    query: "",
    kindFilter: "all",
  });
  assert.deepEqual(
    dated.map((row) => row.id),
    ["a", "b"],
  );
  const stoles = fabricsForExport(fabrics, range, {
    applySearch: false,
    query: "",
    kindFilter: "stole",
  });
  assert.deepEqual(
    stoles.map((row) => row.id),
    ["b"],
  );
  const searched = fabricsForExport(fabrics, range, {
    applySearch: true,
    query: "ivory",
    kindFilter: "fabric",
  });
  assert.deepEqual(
    searched.map((row) => row.id),
    ["a"],
  );
});
