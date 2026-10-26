import assert from "node:assert/strict";
import test from "node:test";
import type { GarmentListRow } from "../api/types.ts";
import { garmentsForExport } from "./filter.ts";

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
