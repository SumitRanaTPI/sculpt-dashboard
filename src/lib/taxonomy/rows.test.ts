import assert from "node:assert/strict";
import test from "node:test";
import type { GarmentDetail } from "../api/types.ts";
import { specGroups, taxonomyRows } from "./rows.ts";

function garment(overrides: Partial<GarmentDetail> = {}): GarmentDetail {
  return {
    id: "g1",
    human_id: "SCULPT-26FW-W-ETH-LH-014",
    style_number: "26FW-LH-014",
    title: "Lehenga",
    description: null,
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
    created_at: "2026-10-01T00:00:00Z",
    season_code: "26FW",
    gender_code: "W",
    wear_system_code: "ETH",
    garment_type_code: "LH",
    silhouette_code: "STR",
    fabric_code: "BAN",
    gallery_urls: [],
    video_urls: [],
    components: [],
    parameter_media: [],
    custom_selections: [
      { parameter_key: "lookStyle", parameter_label: "Style", coding_slot: "look", codes: ["TR"], labels: ["Traditional"] },
      { parameter_key: "fitStrategy", parameter_label: "Fit", coding_slot: "look", codes: ["HRG"], labels: ["Hourglass"] },
      { parameter_key: "colourStory", parameter_label: "Colour", coding_slot: "look", codes: ["JWL"], labels: ["Jewel"] },
      { parameter_key: "drapeClass", parameter_label: "Drape", coding_slot: "look", codes: ["F4"], labels: ["Crisp"] },
      { parameter_key: "embellishmentDensity", parameter_label: "Density", coding_slot: "look", codes: ["D3"], labels: ["Medium"] },
      { parameter_key: "neckline", parameter_label: "Neckline", coding_slot: "element", codes: ["SWH"], labels: ["Sweetheart"] },
      { parameter_key: "collar", parameter_label: "Collar", coding_slot: "element", codes: ["CL0"], labels: ["No collar"] },
      { parameter_key: "sleeve", parameter_label: "Sleeve", coding_slot: "element", codes: ["SL0"], labels: ["Sleeveless"] },
      { parameter_key: "shoulder", parameter_label: "Shoulder", coding_slot: "element", codes: ["STL"], labels: ["Strapless"] },
      { parameter_key: "pocket", parameter_label: "Pocket", coding_slot: "element", codes: ["PK0"], labels: ["No pocket"] },
      { parameter_key: "closure", parameter_label: "Closure", coding_slot: "element", codes: ["HK"], labels: ["Hook"] },
      { parameter_key: "hem", parameter_label: "Hem", coding_slot: "element", codes: ["HM0"], labels: ["Standard"] },
      { parameter_key: "yoke", parameter_label: "Yoke", coding_slot: "build", codes: ["PNY"], labels: ["Princess"] },
      { parameter_key: "cuff", parameter_label: "Cuff", coding_slot: "build", codes: ["CF0"], labels: ["No cuff"] },
      { parameter_key: "placket", parameter_label: "Placket", coding_slot: "build", codes: ["BCK"], labels: ["Back"] },
      { parameter_key: "waistband", parameter_label: "Waistband", coding_slot: "build", codes: ["CWB"], labels: ["Corset"] },
      { parameter_key: "ventFullness", parameter_label: "Vent", coding_slot: "build", codes: ["GOD"], labels: ["Godet"] },
      { parameter_key: "liningSupport", parameter_label: "Lining", coding_slot: "build", codes: ["CUP"], labels: ["Cups"] },
      { parameter_key: "stitchFace", parameter_label: "Stitch", coding_slot: "finish", codes: ["ST0"], labels: ["None"] },
      { parameter_key: "edgeFinish", parameter_label: "Piping", coding_slot: "finish", codes: ["PIP"], labels: ["Piping"] },
      { parameter_key: "trims", parameter_label: "Trims", coding_slot: "finish", codes: ["LAT"], labels: ["Latkan"] },
      { parameter_key: "artworkPlacement", parameter_label: "Artwork", coding_slot: "finish", codes: ["BRD"], labels: ["Border"] },
    ],
    ...overrides,
  };
}

test("taxonomy example follows the selected codes", () => {
  const rows = taxonomyRows(garment());
  const example = Object.fromEntries(rows.map((row) => [row.name, row.example]));
  assert.equal(example["Style number"], "26FW-LH-014");
  assert.equal(example["Class code"], "W-ETH-LH");
  assert.equal(example["Look code"], "LH-TR-STR-HRG-JWL-BAN-F4-ZRI-D3");
  assert.equal(example["Element code"], "SWH-CL0-SL0-STL-PK0-HK-HM0");
  assert.equal(example["Build code"], "PNY-CF0-BCK-CWB-GOD-CUP");
  assert.equal(example["Finish code"], "ST0-PIP-LAT-BRD");
  assert.equal(example["SKU"], "—");
});

test("spec groups follow the code they belong to", () => {
  const groups = specGroups(garment());
  const names = groups.map((group) => group.name);
  assert.deepEqual(names, ["Class code", "Look code", "Element code", "Build code", "Finish code"]);
  const look = groups.find((group) => group.name === "Look code");
  assert.equal(look?.code, "LH-TR-STR-HRG-JWL-BAN-F4-ZRI-D3");
  assert.deepEqual(
    look?.lines.map((line) => line.key),
    ["garmentType", "lookStyle", "silhouette", "fitStrategy", "colourStory", "fabric", "drapeClass", "ornamentation", "embellishmentDensity"],
  );
  const element = groups.find((group) => group.name === "Element code");
  assert.equal(element?.lines[0]?.key, "neckline");
  assert.equal(element?.lines.at(-1)?.key, "hem");
});

test("missing specs are left out and family or size join when selected", () => {
  const rows = taxonomyRows(
    garment({
      style_number: null,
      human_id: "SCULPT-SS-W-OTH-CP-008",
      season_code: "SS",
      garment_type_code: "CP",
      wear_system_code: null,
      silhouette_code: null,
      ornamentation_codes: ["ZRI", "SEQ"],
      custom_selections: [
        { parameter_key: "family", parameter_label: "Family", coding_slot: "class", codes: ["SET"], labels: ["Set"] },
        { parameter_key: "form", parameter_label: "Form", coding_slot: "class", codes: ["SET"], labels: ["Set"] },
        { parameter_key: "lookStyle", parameter_label: "Style", coding_slot: "look", codes: ["TR"], labels: ["Traditional"] },
        { parameter_key: "colour", parameter_label: "Colour", coding_slot: null, codes: ["MRN"], labels: ["Maroon"] },
        { parameter_key: "size", parameter_label: "Size", coding_slot: null, codes: ["M"], labels: ["Medium"] },
        { parameter_key: "motif", parameter_label: "Motif", coding_slot: "element", codes: ["BUTA"], labels: ["Buta"] },
      ],
    }),
  );
  const example = Object.fromEntries(rows.map((row) => [row.name, row.example]));
  assert.equal(example["Style number"], "SS-CP-008");
  assert.equal(example["Class code"], "W-SET-CP-SET");
  assert.equal(example["Look code"], "CP-TR-BAN-ZRI/SEQ");
  assert.equal(example["Element code"], "BUTA");
  assert.equal(example["Build code"], "—");
  assert.equal(example["SKU"], "SS-CP-008-MRN-M");
});
