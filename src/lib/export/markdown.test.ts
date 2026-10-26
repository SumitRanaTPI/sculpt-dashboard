import assert from "node:assert/strict";
import test from "node:test";
import type { GarmentDetail } from "../api/types.ts";
import { buildArchiveMarkdown } from "./markdown.ts";

function garment(overrides: Partial<GarmentDetail> = {}): GarmentDetail {
  return {
    id: "g1",
    human_id: "SC-26-001",
    style_number: "ST-10",
    title: "Ivory Anarkali",
    description: "Hand finished.",
    short_badge: "AW26",
    season_label: "Autumn",
    gender_label: "Women",
    wear_system_label: null,
    garment_type_label: "Anarkali",
    silhouette_label: null,
    fabric_label: "Silk",
    ornamentation_codes: ["ZAR"],
    hero_image_url: "https://res.cloudinary.com/demo/image/upload/hero.jpg",
    has_video: false,
    created_at: "2026-10-05T04:00:00.000Z",
    barcode: "SC123",
    needs_review: true,
    other_notes: { motif: "hand note" },
    gallery_urls: [
      "https://res.cloudinary.com/demo/image/upload/hero.jpg",
      "https://res.cloudinary.com/demo/image/upload/side.jpg",
    ],
    video_urls: [],
    components: [
      {
        id: "c1",
        human_id: "SC-26-001-A",
        type_code: "SLV",
        type_label: "Sleeve",
        description: "Bell sleeve",
        other_notes: { fabric: "organza" },
        media_urls: [],
      },
    ],
    parameter_media: [],
    custom_selections: [
      {
        parameter_key: "motif",
        parameter_label: "Motif",
        coding_slot: "element",
        codes: ["FLORAL"],
        labels: ["Floral"],
        other_note: "tiny rose",
      },
    ],
    ...overrides,
  };
}

test("markdown links images and separates garments", () => {
  const md = buildArchiveMarkdown(
    [{ garment: garment() }, { garment: garment({ id: "g2", title: "Indigo Kurta", hero_image_url: null, gallery_urls: [] }) }],
    { from: "2026-10-01", to: "2026-10-05" },
  );
  assert.match(md, /^# SCULPT archive/);
  assert.match(md, /Asia\/Kolkata/);
  assert.match(md, /Catalogue ID:\*\* SC-26-001/);
  assert.match(md, /Barcode:\*\* SC123/);
  assert.match(md, /!\[Hero\]\(https:\/\/res\.cloudinary\.com\/demo\/image\/upload\/hero\.jpg\)/);
  assert.match(md, /!\[Gallery 1\]\(https:\/\/res\.cloudinary\.com\/demo\/image\/upload\/side\.jpg\)/);
  assert.equal(md.includes("base64"), false);
  assert.match(md, /\n---\n/);
  assert.match(md, /## Indigo Kurta/);
  assert.match(md, /Needs review/);
  assert.match(md, /hand note/);
  assert.match(md, /SC-26-001-A/);
});
