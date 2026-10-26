import type { GarmentDetail } from "../api/types.ts";
import { EXPORT_TIME_ZONE, type DateRange } from "./dates.ts";

function line(label: string, value: string | null | undefined): string | null {
  const text = value?.trim();
  if (!text) return null;
  return `- **${label}:** ${text}`;
}

function notesOf(notes: Record<string, string> | null | undefined): string[] {
  if (!notes) return [];
  return Object.entries(notes)
    .filter(([, note]) => note.trim().length > 0)
    .map(([key, note]) => `- ${key}: ${note.trim()}`);
}

function garmentSection(garment: GarmentDetail, partial: boolean): string {
  const identity = [
    line("Catalogue ID", garment.human_id),
    line("Style number", garment.style_number),
    line("Barcode", garment.barcode),
  ].filter((row): row is string => row !== null);

  const specs = [
    line("Season", garment.season_label),
    line("Gender", garment.gender_label),
    line("Wear system", garment.wear_system_label),
    line("Garment type", garment.garment_type_label),
    line("Silhouette", garment.silhouette_label),
    line("Fabric", garment.fabric_label),
    (garment.ornamentation_codes ?? []).length
      ? `- **Ornamentation:** ${(garment.ornamentation_codes ?? []).join(", ")}`
      : null,
    ...garment.custom_selections.map((selection) => {
      const labels = selection.labels.filter(Boolean).join(", ");
      const codes = selection.codes.filter(Boolean).join(", ");
      const note = selection.other_note?.trim();
      const body = [labels, codes ? `(${codes})` : "", note ? `— ${note}` : ""].filter(Boolean).join(" ");
      return body ? `- **${selection.parameter_label}:** ${body}` : null;
    }),
  ].filter((row): row is string => row !== null);

  const components = garment.components.map((component) => {
    const bits = [component.human_id, component.type_label, component.description?.trim()].filter(Boolean);
    const notes = notesOf(component.other_notes);
    return [`- ${bits.join(" · ")}`, ...notes.map((note) => `  ${note}`)].join("\n");
  });

  const review = notesOf(garment.other_notes);

  const gallery = garment.gallery_urls.filter((url) => url && url !== garment.hero_image_url);

  const parts = [`## ${garment.title.trim() || "Untitled"}`, ""];
  if (partial) {
    parts.push("_Full detail could not be loaded. This section uses the list row._", "");
  }
  if (identity.length) parts.push(...identity, "");
  if (specs.length) parts.push("### Specs", "", ...specs, "");
  parts.push("### Description", "", garment.description?.trim() || "_No description._", "");
  parts.push("### Components", "", components.length ? components.join("\n") : "_None._", "");
  if (garment.needs_review || review.length) {
    parts.push("### Needs review", "", review.length ? review.join("\n") : "_Marked for review._", "");
  }
  if (garment.hero_image_url) {
    parts.push(`![Hero](${garment.hero_image_url})`, "");
  }
  if (gallery.length) {
    parts.push("### Gallery", "", ...gallery.map((url, index) => `![Gallery ${index + 1}](${url})`), "");
  }
  const photos = garment.parameter_media.filter((media) => media.image_url);
  if (photos.length) {
    parts.push(
      "### Spec photos",
      "",
      ...photos.map((photo) => `![${photo.parameter_label}](${photo.image_url})`),
      "",
    );
  }
  return parts.join("\n").trimEnd();
}

export function buildArchiveMarkdown(
  garments: Array<{ garment: GarmentDetail; partial?: boolean }>,
  range: DateRange,
): string {
  const header = [
    "# SCULPT archive",
    "",
    `${range.from} to ${range.to} · ${EXPORT_TIME_ZONE}`,
    "",
    `${garments.length} ${garments.length === 1 ? "garment" : "garments"}`,
    "",
  ].join("\n");

  if (garments.length === 0) return header.trimEnd() + "\n";

  return `${header}${garments.map((row) => garmentSection(row.garment, !!row.partial)).join("\n\n---\n\n")}\n`;
}
