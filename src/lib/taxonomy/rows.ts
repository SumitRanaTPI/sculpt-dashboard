import type { CustomSelection, GarmentDetail } from "../api/types.ts";

export interface TaxonomyRow {
  name: string;
  industry: string;
  pattern: string;
  home: string;
  example: string;
}

const EMPTY = "—";

/** Last numeric segment of a catalogue id, as a 3-digit serial. */
export function serialFromHumanId(humanId: string): string {
  const last = humanId
    .trim()
    .split("-")
    .map((part) => part.trim())
    .filter(Boolean)
    .at(-1);
  if (last && /^\d+$/.test(last)) return last.padStart(3, "0").slice(-3);
  return "";
}

function styleNumber(garment: GarmentDetail): string {
  const stored = garment.style_number?.trim() ?? "";
  if (stored) return stored;
  return [garment.season_code, garment.garment_type_code, serialFromHumanId(garment.human_id)]
    .map((part) => part?.trim() ?? "")
    .filter(Boolean)
    .join("-");
}

function codesOf(selection: CustomSelection | undefined): string[] {
  return (selection?.codes ?? []).map((code) => code.trim()).filter(Boolean);
}

function byKey(garment: GarmentDetail): Map<string, CustomSelection> {
  return new Map(garment.custom_selections.map((selection) => [selection.parameter_key, selection]));
}

/** Several options on one spec stay one pattern segment. */
function segment(codes: Array<string | null | undefined>): string {
  return codes
    .map((code) => code?.trim() ?? "")
    .filter(Boolean)
    .join("/");
}

function joinSegments(parts: Array<string | null | undefined>): string {
  const value = parts.map((part) => part?.trim() ?? "").filter(Boolean).join("-");
  return value || EMPTY;
}

function customSegment(map: Map<string, CustomSelection>, key: string): string {
  return segment(codesOf(map.get(key)));
}

function firstCustom(map: Map<string, CustomSelection>, keys: string[]): string {
  for (const key of keys) {
    const value = customSegment(map, key);
    if (value) return value;
  }
  return "";
}

/** Studio specs in this slot that are not already placed in the pattern. */
function extraSlot(garment: GarmentDetail, slot: string, used: ReadonlySet<string>): string {
  return garment.custom_selections
    .filter((selection) => selection.coding_slot === slot && !used.has(selection.parameter_key))
    .map((selection) => segment(selection.codes))
    .filter(Boolean)
    .join("-");
}

function lookExample(garment: GarmentDetail, map: Map<string, CustomSelection>): string {
  const used = new Set([
    "garmentType",
    "lookStyle",
    "silhouette",
    "fitStrategy",
    "colourStory",
    "fabric",
    "drapeClass",
    "ornamentation",
    "embellishmentDensity",
  ]);
  return joinSegments([
    garment.garment_type_code,
    customSegment(map, "lookStyle"),
    garment.silhouette_code,
    customSegment(map, "fitStrategy"),
    customSegment(map, "colourStory"),
    garment.fabric_code,
    customSegment(map, "drapeClass"),
    segment(garment.ornamentation_codes ?? []),
    customSegment(map, "embellishmentDensity"),
    extraSlot(garment, "look", used),
  ]);
}

function slottedExample(
  garment: GarmentDetail,
  map: Map<string, CustomSelection>,
  slot: string,
  keys: readonly string[],
): string {
  return joinSegments([...keys.map((key) => customSegment(map, key)), extraSlot(garment, slot, new Set(keys))]);
}

function classExample(garment: GarmentDetail, map: Map<string, CustomSelection>): string {
  const used = new Set(["family", "garmentFamily", "categoryFamily", "form", "garmentForm", "pieceForm"]);
  return joinSegments([
    garment.gender_code,
    garment.wear_system_code,
    firstCustom(map, ["family", "garmentFamily", "categoryFamily"]),
    garment.garment_type_code,
    firstCustom(map, ["form", "garmentForm", "pieceForm"]),
    extraSlot(garment, "class", used),
  ]);
}

function skuExample(garment: GarmentDetail, map: Map<string, CustomSelection>, style: string): string {
  const colour = firstCustom(map, ["colour", "color", "colourway", "skuColour"]);
  const size = firstCustom(map, ["size", "skuSize"]);
  const used = new Set(["colour", "color", "colourway", "skuColour", "size", "skuSize"]);
  const extra = extraSlot(garment, "sku", used);
  if (!style || !colour || !size) return EMPTY;
  return joinSegments([style, colour, size, extra]);
}

export interface SpecLine {
  key: string;
  label: string;
  selection: string;
  code: string;
  note: string;
}

export interface SpecGroup {
  name: string;
  code: string;
  lines: SpecLine[];
}

function presentLine(key: string, label: string, selection: string, code: string, note = ""): SpecLine | null {
  const selected = selection.trim();
  const coded = code.trim();
  const noted = note.trim();
  if (!selected && !coded && !noted) return null;
  return {
    key,
    label,
    selection: selected || "—",
    code: coded || "—",
    note: noted,
  };
}

function customLine(map: Map<string, CustomSelection>, key: string, label: string): SpecLine | null {
  const selection = map.get(key);
  if (!selection) return null;
  return presentLine(
    key,
    selection.parameter_label.trim() || label,
    selection.labels.map((item) => item.trim()).filter(Boolean).join(", "),
    codesOf(selection).join(", "),
    selection.other_note?.trim() ?? "",
  );
}

function firstCustomLine(map: Map<string, CustomSelection>, keys: string[], label: string): SpecLine | null {
  for (const key of keys) {
    const line = customLine(map, key, label);
    if (line) return line;
  }
  return null;
}

function extraLines(garment: GarmentDetail, slot: string, used: ReadonlySet<string>): SpecLine[] {
  return garment.custom_selections.flatMap((selection) => {
    if (selection.coding_slot !== slot || used.has(selection.parameter_key)) return [];
    const line = presentLine(
      selection.parameter_key,
      selection.parameter_label,
      selection.labels.map((item) => item.trim()).filter(Boolean).join(", "),
      selection.codes.map((item) => item.trim()).filter(Boolean).join(", "),
      selection.other_note?.trim() ?? "",
    );
    return line ? [line] : [];
  });
}

/** Specs in code order, so each code can be read against the rows that make it. */
export function specGroups(garment: GarmentDetail): SpecGroup[] {
  const map = byKey(garment);
  const codeOf = new Map(taxonomyRows(garment).map((row) => [row.name, row.example]));
  const ornament = (garment.ornamentation_codes ?? []).map((code) => code.trim()).filter(Boolean);

  const classUsed = new Set(["family", "garmentFamily", "categoryFamily", "form", "garmentForm", "pieceForm"]);
  const lookUsed = new Set([
    "garmentType",
    "lookStyle",
    "silhouette",
    "fitStrategy",
    "colourStory",
    "fabric",
    "drapeClass",
    "ornamentation",
    "embellishmentDensity",
  ]);
  const elementKeys = ["neckline", "collar", "sleeve", "shoulder", "pocket", "closure", "hem"] as const;
  const buildKeys = ["yoke", "cuff", "placket", "waistband", "ventFullness", "liningSupport"] as const;
  const finishKeys = ["stitchFace", "edgeFinish", "trims", "artworkPlacement"] as const;

  const groups: Array<{ name: string; lines: Array<SpecLine | null> }> = [
    {
      name: "Class code",
      lines: [
        presentLine("gender", "Gender", garment.gender_label ?? "", garment.gender_code ?? ""),
        presentLine("wearSystem", "Wear system", garment.wear_system_label ?? "", garment.wear_system_code ?? ""),
        firstCustomLine(map, ["family", "garmentFamily", "categoryFamily"], "Family"),
        presentLine("garmentType", "Garment type", garment.garment_type_label ?? "", garment.garment_type_code ?? ""),
        firstCustomLine(map, ["form", "garmentForm", "pieceForm"], "Form"),
        ...extraLines(garment, "class", classUsed),
      ],
    },
    {
      name: "Look code",
      lines: [
        presentLine("garmentType", "Garment type", garment.garment_type_label ?? "", garment.garment_type_code ?? ""),
        customLine(map, "lookStyle", "Style"),
        presentLine("silhouette", "Silhouette", garment.silhouette_label ?? "", garment.silhouette_code ?? ""),
        customLine(map, "fitStrategy", "Fit strategy"),
        customLine(map, "colourStory", "Colour story"),
        presentLine("fabric", "Fabric", garment.fabric_label ?? "", garment.fabric_code ?? ""),
        customLine(map, "drapeClass", "Drape class"),
        presentLine("ornamentation", "Ornamentation", ornament.join(", "), ornament.join(", ")),
        customLine(map, "embellishmentDensity", "Embellishment density"),
        ...extraLines(garment, "look", lookUsed),
      ],
    },
    {
      name: "Element code",
      lines: [
        ...elementKeys.map((key) => customLine(map, key, key)),
        ...extraLines(garment, "element", new Set(elementKeys)),
      ],
    },
    {
      name: "Build code",
      lines: [...buildKeys.map((key) => customLine(map, key, key)), ...extraLines(garment, "build", new Set(buildKeys))],
    },
    {
      name: "Finish code",
      lines: [
        ...finishKeys.map((key) => customLine(map, key, key)),
        ...extraLines(garment, "finish", new Set(finishKeys)),
      ],
    },
  ];

  return groups.flatMap((group) => {
    const lines = group.lines.filter((line): line is SpecLine => line !== null);
    if (lines.length === 0) return [];
    return [{ name: group.name, code: codeOf.get(group.name) ?? EMPTY, lines }];
  });
}

/** Taxonomy sheet for one garment. Example is that garment’s selected codes. */
export function taxonomyRows(garment: GarmentDetail): TaxonomyRow[] {
  const map = byKey(garment);
  const style = styleNumber(garment);
  return [
    {
      name: "Style number",
      industry: "Style ID",
      pattern: "YYSS-GAR-NNN",
      home: "Style master",
      example: style || EMPTY,
    },
    {
      name: "Class code",
      industry: "Category path",
      pattern: "Gender-Wear-Family-Type-Form",
      home: "Merchandising tree / PIM category",
      example: classExample(garment, map),
    },
    {
      name: "Look code",
      industry: "Style attributes",
      pattern: "GAR-STY-SIL-SHP-COL-FAB-FAL-ORN-DEN",
      home: "Style attribute set",
      example: lookExample(garment, map),
    },
    {
      name: "Element code",
      industry: "Components + style details",
      pattern: "NK-CL-SL-SH-PK-CZ-HM",
      home: "Flats / callouts — components",
      example: slottedExample(garment, map, "element", [
        "neckline",
        "collar",
        "sleeve",
        "shoulder",
        "pocket",
        "closure",
        "hem",
      ]),
    },
    {
      name: "Build code",
      industry: "Construction details + support findings",
      pattern: "YK-CF-PL-WB-VT-LN",
      home: "Construction page + BOM findings",
      example: slottedExample(garment, map, "build", [
        "yoke",
        "cuff",
        "placket",
        "waistband",
        "ventFullness",
        "liningSupport",
      ]),
    },
    {
      name: "Finish code",
      industry: "Stitch face + trims + placement",
      pattern: "ST-PP-TR-XP",
      home: "Construction + BOM trims + artwork",
      example: slottedExample(garment, map, "finish", ["stitchFace", "edgeFinish", "trims", "artworkPlacement"]),
    },
    {
      name: "SKU",
      industry: "Variant ID",
      pattern: "Style-Colour-Size",
      home: "ERP / warehouse",
      example: skuExample(garment, map, style),
    },
  ];
}
