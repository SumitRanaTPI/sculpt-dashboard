"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { fetchFabricDetail } from "@/lib/api/studio";
import type { FabricDetail, FabricListRow, FabricStockKind } from "@/lib/api/types";
import {
  EXPORT_TIME_ZONE,
  fabricArchiveFilename,
  fabricFilename,
  calendarDate,
  isValidRange,
  rangeForPreset,
  type DatePreset,
  type DateRange,
} from "@/lib/export/dates";
import { canShareFile, downloadBlob, shareBlob } from "@/lib/export/deliver";
import { fabricsForExport } from "@/lib/export/filter";
import { buildFabricArchiveMarkdown } from "@/lib/export/markdown";
import { buildFabricArchivePdf, type FabricArchiveSection } from "@/lib/export/pdf";

const LARGE_PDF = 20;

function fromList(row: FabricListRow): FabricDetail {
  return {
    ...row,
    gallery_urls: [],
    parameter_media: [],
  };
}

async function loadSections(
  rows: FabricListRow[],
  onProgress: (done: number, total: number) => void,
): Promise<{ sections: FabricArchiveSection[]; failed: number }> {
  const sections: FabricArchiveSection[] = new Array(rows.length);
  let failed = 0;
  let done = 0;
  const queue = rows.map((row, index) => ({ row, index }));
  async function worker() {
    for (;;) {
      const next = queue.shift();
      if (!next) return;
      try {
        sections[next.index] = { fabric: await fetchFabricDetail(next.row.id) };
      } catch {
        failed += 1;
        sections[next.index] = { fabric: fromList(next.row), partial: true };
      }
      done += 1;
      onProgress(done, rows.length);
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  return { sections, failed };
}

function isDetail(fabric: FabricListRow | FabricDetail): fabric is FabricDetail {
  return "gallery_urls" in fabric;
}

export function FabricExportSheet({
  open,
  onClose,
  fabrics = [],
  searchQuery = "",
  kindFilter = "all",
  fabric,
}: {
  open: boolean;
  onClose: () => void;
  fabrics?: FabricListRow[];
  searchQuery?: string;
  kindFilter?: "all" | FabricStockKind;
  /** When set, the sheet exports this fabric only and hides the date range. */
  fabric?: FabricListRow | FabricDetail;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const group = useId();
  const [preset, setPreset] = useState<DatePreset>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [format, setFormat] = useState<"pdf" | "md">("pdf");
  const [applySearch, setApplySearch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error" | "info"; text: string } | null>(
    null,
  );
  const [shareable, setShareable] = useState<Blob | null>(null);
  const [shareName, setShareName] = useState("");
  const [shareType, setShareType] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const single = fabric != null;

  const range: DateRange | null = useMemo(() => {
    if (fabric) {
      const created = new Date(fabric.created_at);
      const day = Number.isNaN(created.getTime())
        ? calendarDate(new Date())
        : calendarDate(created);
      return { from: day, to: day };
    }
    if (preset === "custom") return { from: customFrom, to: customTo };
    return rangeForPreset(preset);
  }, [fabric, preset, customFrom, customTo]);

  const rangeOk = single || isValidRange(range);
  const matches = useMemo(() => {
    if (fabric) return [fabric];
    if (!rangeOk || !range) return [];
    return fabricsForExport(fabrics, range, {
      applySearch,
      query: searchQuery,
      kindFilter,
    });
  }, [fabric, fabrics, range, rangeOk, applySearch, searchQuery, kindFilter]);

  const shareReady = canShareFile(format === "pdf" ? "application/pdf" : "text/markdown");

  function resetNotice() {
    setMessage(null);
    setShareable(null);
  }

  async function generate(): Promise<{
    blob: Blob;
    filename: string;
    type: string;
    failed: number;
  } | null> {
    if (!rangeOk || !range || matches.length === 0 || busy) return null;
    setBusy(true);
    setMessage(null);
    setShareable(null);
    setProgress(single ? "Preparing this item…" : "Loading cloth stock…");
    try {
      const { sections, failed } =
        fabric && isDetail(fabric)
          ? { sections: [{ fabric }], failed: 0 }
          : await loadSections(matches, (done, total) => {
              setProgress(`Loading ${done} of ${total}…`);
            });
      setProgress(format === "pdf" ? "Building the PDF…" : "Building the file…");
      const filename =
        fabric != null
          ? fabricFilename(fabric.human_id, format)
          : fabricArchiveFilename(range, format);
      if (format === "md") {
        const text = buildFabricArchiveMarkdown(sections, range);
        return {
          blob: new Blob([text], { type: "text/markdown" }),
          filename,
          type: "text/markdown",
          failed,
        };
      }
      const bytes = await buildFabricArchivePdf(sections, range);
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      return {
        blob: new Blob([copy], { type: "application/pdf" }),
        filename,
        type: "application/pdf",
        failed,
      };
    } catch {
      setMessage({ kind: "error", text: "The file could not be built. Try again." });
      return null;
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  function note(failed: number) {
    const base = "Download started. Save the file, or move it into Google Drive.";
    if (failed === 0) return base;
    return `${base} ${failed} ${failed === 1 ? "item was" : "items were"} included from the list because the full detail did not load.`;
  }

  async function onDownload() {
    const file = await generate();
    if (!file) return;
    downloadBlob(file.blob, file.filename);
    setShareable(file.blob);
    setShareName(file.filename);
    setShareType(file.type);
    setMessage({ kind: "ok", text: note(file.failed) });
  }

  async function onShare() {
    const file = shareable
      ? { blob: shareable, filename: shareName, type: shareType, failed: 0 }
      : await generate();
    if (!file) return;
    try {
      await shareBlob(file.blob, file.filename, file.type);
      setMessage({ kind: "ok", text: "Choose Google Drive in the share sheet." });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      downloadBlob(file.blob, file.filename);
      setMessage({
        kind: "info",
        text: "Sharing was not available, so the file was downloaded instead.",
      });
    }
  }

  const kindHint =
    kindFilter === "stole" ? "stoles" : kindFilter === "fabric" ? "fabrics" : "cloth stock items";

  return (
    <dialog
      ref={dialogRef}
      className="sheet"
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
    >
      <form
        className="sheet__body"
        onSubmit={(event) => {
          event.preventDefault();
          void onDownload();
        }}
      >
        <div className="sheet__head">
          <div>
            <div className="eyebrow">{single ? fabric.title : "Cloth stock"}</div>
            <h2 id={titleId}>{single ? "Export this item" : "Export cloth stock"}</h2>
          </div>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} disabled={busy}>
            Close
          </button>
        </div>
        <p className="muted small">
          {single
            ? "One file for this fabric or stole. Photos are included in the PDF."
            : `One file for cloth stock logged in this range${kindFilter !== "all" ? ` (${kindHint})` : ""}. Dates use ${EXPORT_TIME_ZONE}.`}
        </p>

        {single ? null : (
          <fieldset className="sheet__group">
            <legend>Date range</legend>
            <div className="sheet__presets">
              {(
                [
                  ["today", "Today"],
                  ["yesterday", "Yesterday"],
                  ["custom", "Custom"],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className={preset === value ? "chip chip--on" : "chip"}>
                  <input
                    type="radio"
                    name={`${group}-preset`}
                    value={value}
                    checked={preset === value}
                    onChange={() => {
                      setPreset(value);
                      resetNotice();
                    }}
                    disabled={busy}
                  />
                  {label}
                </label>
              ))}
            </div>
            {preset === "custom" ? (
              <div className="form__row">
                <div className="field">
                  <label htmlFor="fabric-export-from">From</label>
                  <input
                    id="fabric-export-from"
                    className="input"
                    type="date"
                    value={customFrom}
                    onChange={(event) => {
                      setCustomFrom(event.target.value);
                      resetNotice();
                    }}
                    disabled={busy}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="fabric-export-to">To</label>
                  <input
                    id="fabric-export-to"
                    className="input"
                    type="date"
                    value={customTo}
                    min={customFrom || undefined}
                    onChange={(event) => {
                      setCustomTo(event.target.value);
                      resetNotice();
                    }}
                    disabled={busy}
                    required
                  />
                </div>
              </div>
            ) : range ? (
              <p className="small muted">
                {range.from === range.to ? range.from : `${range.from} to ${range.to}`}
              </p>
            ) : null}
            {preset === "custom" && customFrom && customTo && !rangeOk ? (
              <p className="field__error">Choose a from date that is on or before the to date.</p>
            ) : null}
          </fieldset>
        )}

        <fieldset className="sheet__group">
          <legend>Format</legend>
          <div className="sheet__presets">
            <label className={format === "pdf" ? "chip chip--on" : "chip"}>
              <input
                type="radio"
                name={`${group}-format`}
                value="pdf"
                checked={format === "pdf"}
                onChange={() => {
                  setFormat("pdf");
                  resetNotice();
                }}
                disabled={busy}
              />
              PDF
            </label>
            <label className={format === "md" ? "chip chip--on" : "chip"}>
              <input
                type="radio"
                name={`${group}-format`}
                value="md"
                checked={format === "md"}
                onChange={() => {
                  setFormat("md");
                  resetNotice();
                }}
                disabled={busy}
              />
              Markdown
            </label>
          </div>
        </fieldset>

        {single ? null : (
          <label className="check">
            <input
              type="checkbox"
              checked={applySearch}
              onChange={(event) => {
                setApplySearch(event.target.checked);
                resetNotice();
              }}
              disabled={busy}
            />
            Apply current search{searchQuery.trim() ? ` “${searchQuery.trim()}”` : ""}
          </label>
        )}

        {single ? (
          <p className="small">This item only.</p>
        ) : rangeOk ? (
          matches.length === 0 ? (
            <div className="notice notice--info">No cloth stock was logged in this range.</div>
          ) : (
            <p className="small">
              {matches.length} {matches.length === 1 ? "item" : "items"}
            </p>
          )
        ) : (
          <p className="small muted">Choose a date range to see how many items match.</p>
        )}

        {format === "pdf" && matches.length > LARGE_PDF ? (
          <p className="small muted">
            A PDF with images for more than {LARGE_PDF} items may take a while.
          </p>
        ) : null}

        {progress ? (
          <p className="small" role="status">
            {progress}
          </p>
        ) : null}
        {message ? (
          <div className={`notice notice--${message.kind}`} role="status">
            {message.text}
          </div>
        ) : null}

        <div className="form__actions">
          {shareReady ? (
            <button
              type="button"
              className="btn btn--ghost"
              disabled={busy || !rangeOk || matches.length === 0}
              onClick={() => void onShare()}
            >
              {busy ? "Working…" : "Share"}
            </button>
          ) : null}
          <button type="submit" className="btn" disabled={busy || !rangeOk || matches.length === 0}>
            {busy ? "Working…" : "Generate & download"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
