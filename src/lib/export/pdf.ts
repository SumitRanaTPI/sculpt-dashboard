import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import type { GarmentDetail } from "../api/types.ts";
import { specGroups, taxonomyRows } from "../taxonomy/rows.ts";
import { EXPORT_TIME_ZONE, type DateRange } from "./dates.ts";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 48;
const MAX_EDGE = 1400;
/** Extra photos, besides the hero, drawn as a thumbnail grid. */
const MAX_PHOTOS = 8;
const INK = rgb(0.102, 0.102, 0.102);
const MUTED = rgb(0.549, 0.51, 0.478);
const RULE = rgb(0.91, 0.886, 0.855);
const GROUP = rgb(0.957, 0.906, 0.804);
const HEAD = rgb(0.98, 0.965, 0.945);

export interface ArchiveSection {
  garment: GarmentDetail;
  partial?: boolean;
}

function winAnsi(value: string): string {
  return value
    .replace(/\u2014|\u2013/g, "-")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "?");
}

function sniff(bytes: Uint8Array): "jpg" | "png" | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (
    bytes.length > 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "png";
  }
  return null;
}

/** Ask Cloudinary for a JPEG the PDF library can embed. Other hosts are unchanged. */
export function jpegDeliveryUrl(url: string): string {
  const marker = "/image/upload/";
  const at = url.indexOf(marker);
  if (!url.includes("res.cloudinary.com") || at === -1) return url;
  return `${url.slice(0, at + marker.length)}f_jpg,q_80,w_${MAX_EDGE},c_limit/${url.slice(at + marker.length)}`;
}

async function fetchBytes(url: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    return bytes.byteLength > 0 ? bytes : null;
  } catch {
    return null;
  }
}

/** Draw whatever the browser can decode (including WebP) and return a JPEG. */
async function rasterize(url: string): Promise<Uint8Array | null> {
  if (typeof document === "undefined") return null;
  const image = await new Promise<HTMLImageElement | null>((resolve) => {
    const element = new Image();
    element.crossOrigin = "anonymous";
    element.onload = () => resolve(element);
    element.onerror = () => resolve(null);
    element.src = url;
  });
  if (!image || image.naturalWidth === 0) return null;
  const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  try {
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
  } catch {
    return null;
  }
  const blob = await new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob((value) => resolve(value), "image/jpeg", 0.82);
    } catch {
      resolve(null);
    }
  });
  if (!blob) return null;
  return new Uint8Array(await blob.arrayBuffer());
}

async function embed(pdf: PDFDocument, bytes: Uint8Array): Promise<PDFImage | null> {
  const kind = sniff(bytes);
  try {
    if (kind === "jpg") return await pdf.embedJpg(bytes);
    if (kind === "png") return await pdf.embedPng(bytes);
  } catch {
    return null;
  }
  return null;
}

async function loadImage(pdf: PDFDocument, url: string | null | undefined): Promise<PDFImage | null> {
  if (!url) return null;
  const candidates = [...new Set([jpegDeliveryUrl(url), url])];
  for (const candidate of candidates) {
    const bytes = await fetchBytes(candidate);
    if (bytes) {
      const direct = await embed(pdf, bytes);
      if (direct) return direct;
    }
    const jpeg = await rasterize(candidate);
    if (!jpeg) continue;
    const drawn = await embed(pdf, jpeg);
    if (drawn) return drawn;
  }
  return null;
}

interface TableRow {
  cells: string[];
  kind: "head" | "group" | "body";
}

const TABLE_SIZE = 8;
const TABLE_LEAD = 10;

class Writer {
  private page: PDFPage;
  private y: number;
  private readonly pdf: PDFDocument;
  private readonly font: PDFFont;
  private readonly bold: PDFFont;

  constructor(pdf: PDFDocument, font: PDFFont, bold: PDFFont) {
    this.pdf = pdf;
    this.font = font;
    this.bold = bold;
    this.page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN;
  }

  private ensure(height: number): void {
    if (this.y - height >= MARGIN) return;
    this.page = this.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN;
  }

  private remaining(): number {
    return this.y - MARGIN;
  }

  gap(amount = 8): void {
    this.y -= amount;
  }

  private wrap(value: string, font: PDFFont, size: number, width: number): string[] {
    const clean = winAnsi(value).trim();
    if (!clean) return [""];
    const lines: string[] = [];
    let line = "";
    const push = (token: string, spaced: boolean) => {
      const next = line ? (spaced ? `${line} ${token}` : line + token) : token;
      if (line && font.widthOfTextAtSize(next, size) > width) {
        lines.push(line);
        line = token;
      } else {
        line = next;
      }
    };
    for (const word of clean.split(/\s+/)) {
      const pieces = this.pieces(word, font, size, width);
      pieces.forEach((piece, index) => push(piece, index === 0));
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  /** Break a token that is wider than the cell, such as a long code. */
  private pieces(token: string, font: PDFFont, size: number, width: number): string[] {
    if (font.widthOfTextAtSize(token, size) <= width) return [token];
    const parts: string[] = [];
    let current = "";
    for (const char of token) {
      const next = current + char;
      if (current && font.widthOfTextAtSize(next, size) > width) {
        parts.push(current);
        current = char;
      } else {
        current = next;
      }
    }
    if (current) parts.push(current);
    return parts;
  }

  text(value: string, size: number, options?: { bold?: boolean; color?: RGB }): void {
    const font = options?.bold ? this.bold : this.font;
    const color = options?.color ?? INK;
    const lines = this.wrap(value, font, size, PAGE_WIDTH - MARGIN * 2);
    for (const row of lines) {
      this.ensure(size + 3);
      this.page.drawText(row, { x: MARGIN, y: this.y - size, size, font, color });
      this.y -= size + 3;
    }
  }

  heading(value: string): void {
    this.gap(8);
    this.text(value, 11, { bold: true });
    this.gap(2);
  }

  /** Continue on this page unless there is no room for the next garment's title and codes. */
  continueGarment(): void {
    if (this.remaining() < 220) {
      this.page = this.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      this.y = PAGE_HEIGHT - MARGIN;
      return;
    }
    if (this.y < PAGE_HEIGHT - MARGIN - 70) this.gap(8);
  }

  private rowHeight(row: TableRow, widths: number[]): number {
    const font = row.kind === "body" ? this.font : this.bold;
    const inner = row.kind === "group" ? widths.reduce((sum, width) => sum + width, 0) - 8 : 0;
    if (row.kind === "group") {
      return this.wrap(row.cells.join("   "), font, TABLE_SIZE, inner).length * TABLE_LEAD + 6;
    }
    const lines = Math.max(
      1,
      ...row.cells.map((cell, index) => this.wrap(cell, font, TABLE_SIZE, (widths[index] ?? 40) - 6).length),
    );
    return lines * TABLE_LEAD + 6;
  }

  table(rows: TableRow[], widths: number[], x = MARGIN): void {
    const total = widths.reduce((sum, width) => sum + width, 0);
    for (const row of rows) {
      const height = this.rowHeight(row, widths);
      this.ensure(height);
      const top = this.y;
      const fill = row.kind === "group" ? GROUP : row.kind === "head" ? HEAD : null;
      if (fill) {
        this.page.drawRectangle({ x, y: top - height, width: total, height, color: fill });
      }
      const font = row.kind === "body" ? this.font : this.bold;
      if (row.kind === "group") {
        const lines = this.wrap(row.cells.filter(Boolean).join("   "), font, TABLE_SIZE, total - 8);
        let lineY = top - 3 - TABLE_SIZE;
        for (const line of lines) {
          this.page.drawText(line, { x: x + 4, y: lineY, size: TABLE_SIZE, font, color: INK });
          lineY -= TABLE_LEAD;
        }
      } else {
        let cellX = x;
        row.cells.forEach((cell, index) => {
          const color = row.kind === "body" && index === 0 ? MUTED : INK;
          const column = widths[index] ?? 40;
          const lines = this.wrap(cell, font, TABLE_SIZE, column - 6);
          let lineY = top - 3 - TABLE_SIZE;
          for (const line of lines) {
            this.page.drawText(line, { x: cellX + 3, y: lineY, size: TABLE_SIZE, font, color });
            lineY -= TABLE_LEAD;
          }
          cellX += column;
        });
      }
      this.page.drawLine({
        start: { x, y: top - height },
        end: { x: x + total, y: top - height },
        thickness: 0.4,
        color: RULE,
      });
      this.y = top - height;
    }
  }

  /** Two spec tables on one row so class and look sit beside element, build, and finish. */
  tablesBeside(left: TableRow[], right: TableRow[], widths: number[], gap: number): void {
    const heightOf = (rows: TableRow[]) => rows.reduce((sum, row) => sum + this.rowHeight(row, widths), 0);
    const height = Math.max(heightOf(left), heightOf(right));
    this.ensure(height);
    const top = this.y;
    const rightX = MARGIN + widths.reduce((sum, width) => sum + width, 0) + gap;
    this.table(left, widths, MARGIN);
    const leftEnd = this.y;
    this.y = top;
    this.table(right, widths, rightX);
    this.y = Math.min(this.y, leftEnd);
  }

  /** Hero on the left, code table on the right, matching the garment page. */
  async codesBesideImage(garment: GarmentDetail): Promise<void> {
    const rows: TableRow[] = taxonomyRows(garment).map((row) => ({
      kind: "body",
      cells: [row.name, row.name === "SKU" && row.example === "—" ? "" : row.example],
    }));
    const hero = await loadImage(this.pdf, garment.hero_image_url);
    const imageWidth = hero ? 100 : 0;
    const gap = hero ? 12 : 0;
    const tableX = MARGIN + imageWidth + gap;
    const tableWidth = PAGE_WIDTH - MARGIN - tableX;
    const labelWidth = Math.min(100, Math.round(tableWidth * 0.36));
    const widths = [labelWidth, tableWidth - labelWidth];
    const tableHeight = rows.reduce((sum, row) => sum + this.rowHeight(row, widths), 0);
    this.ensure(tableHeight);
    const top = this.y;
    if (hero) {
      const scale = Math.min(imageWidth / hero.width, tableHeight / hero.height);
      const width = hero.width * scale;
      const height = hero.height * scale;
      this.page.drawImage(hero, { x: MARGIN, y: top - height, width, height });
    }
    this.y = top;
    this.table(rows, widths, tableX);
    this.y = top - tableHeight - 6;
  }

  /**
   * Extra stills share a thumbnail grid. One photo is one cell, not one page.
   * Past the cap, the rest are counted so the file stays short.
   */
  async photoGrid(items: Array<{ url: string; caption: string }>): Promise<void> {
    const shown = items.slice(0, MAX_PHOTOS);
    const hidden = items.length - shown.length;
    const columns = 4;
    const gap = 8;
    const width = (PAGE_WIDTH - MARGIN * 2 - gap * (columns - 1)) / columns;
    const height = 72;
    let column = 0;
    let rowTop = this.y;
    for (const item of shown) {
      if (column === 0) {
        this.ensure(height + 14);
        rowTop = this.y;
      }
      const embedded = await loadImage(this.pdf, item.url);
      const x = MARGIN + column * (width + gap);
      if (embedded) {
        const scale = Math.min(width / embedded.width, height / embedded.height);
        const drawnWidth = embedded.width * scale;
        const drawnHeight = embedded.height * scale;
        this.page.drawImage(embedded, {
          x,
          y: rowTop - height + (height - drawnHeight),
          width: drawnWidth,
          height: drawnHeight,
        });
      }
      if (item.caption) {
        const caption = this.wrap(item.caption, this.font, 7, width)[0] ?? "";
        this.page.drawText(caption, { x, y: rowTop - height - 9, size: 7, font: this.font, color: MUTED });
      }
      column += 1;
      if (column === columns) {
        column = 0;
        this.y = rowTop - height - 14;
      }
    }
    if (column !== 0) this.y = rowTop - height - 14;
    if (hidden > 0) this.text(`+ ${hidden} more photos`, 8, { color: MUTED });
  }
}

type RGB = ReturnType<typeof rgb>;

function plain(value: string | null | undefined, fallback = "-"): string {
  const text = value?.trim();
  return text || fallback;
}

export async function buildArchivePdf(sections: ArchiveSection[], range: DateRange): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`SCULPT archive ${range.from} to ${range.to}`);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const writer = new Writer(pdf, font, bold);
  const full = PAGE_WIDTH - MARGIN * 2;

  writer.text("SCULPT archive", 16, { bold: true });
  writer.text(`${range.from} to ${range.to}  ·  ${EXPORT_TIME_ZONE}`, 9, { color: MUTED });
  writer.text(`${sections.length} ${sections.length === 1 ? "garment" : "garments"}`, 10);
  writer.gap(6);

  for (const section of sections) {
    const garment = section.garment;
    writer.continueGarment();
    const badge = garment.short_badge?.trim();
    writer.text(badge ? `${garment.title.trim() || "Untitled"}   ${badge}` : garment.title.trim() || "Untitled", 14, {
      bold: true,
    });
    if (section.partial) {
      writer.text("Full detail could not be loaded. This section uses the list row.", 8, {
        color: rgb(0.55, 0.3, 0.2),
      });
    }
    writer.gap(4);
    await writer.codesBesideImage(garment);

    writer.heading("Details");
    writer.table(
      [
        ["Catalogue ID", garment.human_id],
        ["Style number", plain(garment.style_number)],
        ["Barcode", plain(garment.barcode)],
        ["Season", plain(garment.season_label)],
        ["Description", plain(garment.description, "No description.")],
      ].map(([label, value]) => ({ kind: "body" as const, cells: [label ?? "", value ?? ""] })),
      [120, full - 120],
    );

    const groups = specGroups(garment);
    writer.heading("Specs");
    if (groups.length === 0) {
      writer.text("No extra specs.", 9, { color: MUTED });
    } else {
      const leftNames = new Set(["Class code", "Look code"]);
      const left = groups.filter((group) => leftNames.has(group.name));
      const right = groups.filter((group) => !leftNames.has(group.name));
      const toRows = (list: typeof groups): TableRow[] => [
        { kind: "head", cells: ["Spec", "Selection", "Code"] },
        ...list.flatMap((group) => [
          { kind: "group" as const, cells: [group.name, group.code === "—" ? "" : group.code] },
          ...group.lines.map((line) => ({
            kind: "body" as const,
            cells: [line.label, line.note ? `${line.selection} · ${line.note}` : line.selection, line.code],
          })),
        ]),
      ];
      if (left.length && right.length) {
        const gap = 10;
        const column = (full - gap) / 2;
        const widths = [78, column - 146, 68];
        writer.tablesBeside(toRows(left), toRows(right), widths, gap);
      } else {
        writer.table(toRows(groups), [150, full - 270, 120]);
      }
    }

    writer.heading("Components");
    if (garment.components.length === 0) {
      writer.text("No components.", 9, { color: MUTED });
    } else {
      writer.table(
        [
          { kind: "head", cells: ["ID", "Type", "Description"] },
          ...garment.components.map((component) => {
            const notes = Object.values(component.other_notes ?? {})
              .map((note) => note.trim())
              .filter(Boolean);
            const description = [component.description?.trim(), notes.join(", ")].filter(Boolean).join(" · ");
            return {
              kind: "body" as const,
              cells: [component.human_id, plain(component.type_label), description || "-"],
            };
          }),
        ],
        [130, 110, full - 240],
      );
    }

    const review = Object.entries(garment.other_notes ?? {}).filter(([, note]) => note.trim());
    if (garment.needs_review || review.length) {
      writer.heading("Needs review");
      if (review.length === 0) writer.text("Marked for review.", 9);
      for (const [key, note] of review) writer.text(`${key}: ${note.trim()}`, 9);
    }

    const photos = [
      ...garment.gallery_urls
        .filter((url) => url && url !== garment.hero_image_url)
        .map((url) => ({ url, caption: "" })),
      ...garment.parameter_media
        .filter((media) => media.image_url)
        .map((media) => ({ url: media.image_url, caption: media.parameter_label })),
    ];
    if (photos.length) {
      writer.heading("Photos");
      await writer.photoGrid(photos);
    } else if (garment.video_urls.length) {
      writer.gap(4);
    }
    if (garment.video_urls.length) {
      writer.text(`${garment.video_urls.length} ${garment.video_urls.length === 1 ? "video" : "videos"} linked on the garment.`, 8, {
        color: MUTED,
      });
    }
    writer.gap(4);
  }

  return pdf.save();
}
