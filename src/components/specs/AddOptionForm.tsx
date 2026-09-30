"use client";

import { useState, type FormEvent } from "react";
import { optionErrorCopy, upsertParameterOption } from "@/lib/api/studio";
import type { ParameterCatalogRow, UpsertOptionResponse } from "@/lib/api/types";

const COLOUR_RE = /^#[0-9a-fA-F]{6}$/;

interface Props {
  spec: ParameterCatalogRow;
  onCreated: (res: UpsertOptionResponse) => void;
  onCancel: () => void;
}

export function AddOptionForm({ spec, onCreated, onCancel }: Props) {
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [colour, setColour] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const codeError = code.trim() ? null : "Code is required.";
  const labelError = label.trim() ? null : "Label is required.";
  const colourTrim = colour.trim();
  const colourError = colourTrim && !COLOUR_RE.test(colourTrim) ? "Use # followed by six hex digits." : null;
  const valid = !codeError && !labelError && !colourError;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await upsertParameterOption({
        parameter_id: spec.id,
        code: code.trim(),
        label: label.trim(),
        description: description.trim(),
        colour: colourTrim ? colourTrim.toUpperCase() : null,
      });
      onCreated(res);
    } catch (err) {
      setError(optionErrorCopy(err));
      setBusy(false);
    }
  }

  const idBase = `opt-${spec.id}`;

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      <p className="small muted">
        New option on <strong style={{ color: "var(--ink)" }}>{spec.label}</strong>{" "}
        <span className="mono">{spec.key}</span>
      </p>

      <div className="form__row">
        <div className="field">
          <label htmlFor={`${idBase}-code`}>Code</label>
          <input
            id={`${idBase}-code`}
            className="input mono"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="FLORAL"
            autoComplete="off"
            disabled={busy}
            aria-invalid={touched && codeError ? "true" : undefined}
          />
          {touched && codeError ? <span className="field__error">{codeError}</span> : null}
        </div>
        <div className="field">
          <label htmlFor={`${idBase}-label`}>Label</label>
          <input
            id={`${idBase}-label`}
            className="input"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Floral"
            disabled={busy}
            aria-invalid={touched && labelError ? "true" : undefined}
          />
          {touched && labelError ? <span className="field__error">{labelError}</span> : null}
        </div>
      </div>

      <div className="form__row">
        <div className="field">
          <label htmlFor={`${idBase}-desc`}>Description</label>
          <input
            id={`${idBase}-desc`}
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
            disabled={busy}
          />
        </div>
        <div className="field">
          <label htmlFor={`${idBase}-colour`}>Colour</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span
              className="option__swatch"
              style={{ background: COLOUR_RE.test(colourTrim) ? colourTrim : "transparent", width: 20, height: 20 }}
              aria-hidden="true"
            />
            <input
              id={`${idBase}-colour`}
              className="input mono"
              value={colour}
              onChange={(e) => setColour(e.target.value)}
              placeholder="#D4A853"
              autoComplete="off"
              disabled={busy}
              aria-invalid={touched && colourError ? "true" : undefined}
            />
          </div>
          {touched && colourError ? (
            <span className="field__error">{colourError}</span>
          ) : (
            <span className="hint">Optional. Reference images are added on the phone.</span>
          )}
        </div>
      </div>

      {error ? (
        <div className="notice notice--error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="form__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="btn" disabled={busy || (touched && !valid)}>
          {busy ? "Adding…" : "Add option"}
        </button>
      </div>
    </form>
  );
}
