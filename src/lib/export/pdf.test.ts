import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import type { GarmentDetail } from "../api/types.ts";
import { buildArchivePdf, jpegDeliveryUrl } from "./pdf.ts";

test("pdf is a single file and does not require images", async () => {
  const garment: GarmentDetail = {
    id: "g1",
    human_id: "SC-26-001",
    style_number: null,
    title: "Ivory Anarkali",
    description: "Quiet silk.",
    short_badge: null,
    season_label: "Autumn",
    gender_label: null,
    wear_system_label: null,
    garment_type_label: null,
    silhouette_label: null,
    fabric_label: null,
    ornamentation_codes: [],
    hero_image_url: null,
    has_video: false,
    created_at: "2026-10-05T04:00:00.000Z",
    barcode: "SC123",
    gallery_urls: [],
    video_urls: [],
    components: [],
    parameter_media: [],
    custom_selections: [],
  };
  const bytes = await buildArchivePdf([{ garment }], { from: "2026-10-05", to: "2026-10-05" });
  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-");
  assert.ok(bytes.byteLength > 500);
  const document = await PDFDocument.load(bytes);
  assert.equal(document.getPageCount(), 1);
});

test("a fully specced garment with extra photos stays within two pages", async () => {
  const keys = [
    "lookStyle",
    "fitStrategy",
    "colourStory",
    "drapeClass",
    "embellishmentDensity",
    "neckline",
    "collar",
    "sleeve",
    "shoulder",
    "pocket",
    "closure",
    "hem",
    "yoke",
    "cuff",
    "placket",
    "waistband",
    "ventFullness",
    "liningSupport",
    "stitchFace",
    "edgeFinish",
    "trims",
    "artworkPlacement",
  ];
  const slot = (key: string) =>
    key.startsWith("look") || ["fitStrategy", "colourStory", "drapeClass", "embellishmentDensity"].includes(key)
      ? "look"
      : ["yoke", "cuff", "placket", "waistband", "ventFullness", "liningSupport"].includes(key)
        ? "build"
        : ["stitchFace", "edgeFinish", "trims", "artworkPlacement"].includes(key)
          ? "finish"
          : "element";
  const garment: GarmentDetail = {
    id: "g2",
    human_id: "SCULPT-26FW-W-ETH-LH-014",
    style_number: "26FW-LH-014",
    title: "Lehenga",
    description: "Bridal set with a full spec list.",
    short_badge: "26FW-014",
    season_label: "Festive Winter",
    gender_label: "Women",
    wear_system_label: "Ethnic",
    garment_type_label: "Lehenga",
    silhouette_label: "Structured",
    fabric_label: "Banarasi",
    ornamentation_codes: ["ZRI"],
    hero_image_url: null,
    has_video: false,
    created_at: "2026-10-05T04:00:00.000Z",
    season_code: "26FW",
    gender_code: "W",
    wear_system_code: "ETH",
    garment_type_code: "LH",
    silhouette_code: "STR",
    fabric_code: "BAN",
    gallery_urls: ["https://example.invalid/a.jpg", "https://example.invalid/b.jpg", "https://example.invalid/c.jpg", "https://example.invalid/d.jpg"],
    video_urls: [],
    components: [],
    parameter_media: [
      { parameter_key: "neckline", parameter_label: "Neckline", image_url: "https://example.invalid/n.jpg", caption: null, sort_order: 1 },
      { parameter_key: "hem", parameter_label: "Hem", image_url: "https://example.invalid/h.jpg", caption: null, sort_order: 2 },
    ],
    custom_selections: keys.map((key) => ({
      parameter_key: key,
      parameter_label: key,
      coding_slot: slot(key) as "look" | "element" | "build" | "finish",
      codes: ["AB"],
      labels: ["Sample"],
    })),
  };
  const bytes = await buildArchivePdf([{ garment }], { from: "2026-10-05", to: "2026-10-05" });
  const document = await PDFDocument.load(bytes);
  assert.ok(document.getPageCount() <= 2, `expected at most 2 pages, got ${document.getPageCount()}`);
});

test("cloudinary urls are requested as a jpeg the pdf can embed", () => {
  assert.equal(
    jpegDeliveryUrl("https://res.cloudinary.com/demo/image/upload/v1/hero.webp"),
    "https://res.cloudinary.com/demo/image/upload/f_jpg,q_80,w_1400,c_limit/v1/hero.webp",
  );
  assert.equal(jpegDeliveryUrl("https://example.com/hero.webp"), "https://example.com/hero.webp");
});
