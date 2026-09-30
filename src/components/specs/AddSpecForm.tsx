"use client";

import { useState, type FormEvent } from "react";
import { createParameter, specErrorCopy } from "@/lib/api/studio";
import {
  CODING_SLOTS,
  CORE_KEYS,
  type CodingSlot,
  type CreateParameterResponse,
  type Selection,
} from "@/lib/api/types";

const KEY_RE = /^[a-z][a-zA-Z0-9_]*$/;

interface Props {
  onCreated: (res: CreateParameterResponse) => void;
  onCancel: () => void;
}

export function AddSpecForm({ onCreated, onCancel }: Props) {
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [selection, setSelection] = useState<Selection>("single");
  const [required, setRequired] = useState(true);
  const [codingSlot, setCodingSlot] = useState<CodingSlot | "">("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const keyTrim = key.trim();
  const keyError = !keyTrim
    ? "Key is required."
    : !KEY_RE.test(keyTrim)
      ? "Start with a lowercase letter; use letters, digits, or underscore."
      : (CORE_KEYS as readonly string[]).includes(keyTrim)
        ? "That key belongs to a core Spec."
        : null;
  const labelError = label.trim() ? null : "Label is required.";
  const slotError = codingSlot ? null : "Choose a coding slot.";
  const valid = !keyError && !labelError && !slotError;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!valid || busy || !codingSlot) return;
    setBusy(true);
    setError(null);
    try {
      const res = await createParameter({
        key: keyTrim,
        label: label.trim(),
        description: description.trim(),
        selection,
        required,
        coding_slot: codingSlot,
      });
      onCreated(res);
    } catch (err) {
      setError(specErrorCopy(err));
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      <div className="form__row">
        <div className="field">
          <label htmlFor="spec-key">Key</label>
          <input
            id="spec-key"
            className="input mono"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="motif"
            autoComplete="off"
            disabled={busy}
            aria-invalid={touched && keyError ? "true" : undefined}
          />
          {touched && keyError ? (
            <span className="field__error">{keyError}</span>
          ) : (
            <span className="hint">Used by the phone. Cannot be changed later.</span>
          )}
        </div>
        <div className="field">
          <label htmlFor="spec-label">Label</label>
          <input
            id="spec-label"
            className="input"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Motif"
            disabled={busy}
            aria-invalid={touched && labelError ? "true" : undefined}
          />
          {touched && labelError ? <span className="field__error">{labelError}</span> : null}
        </div>
      </div>

      <div className="field">
        <label htmlFor="spec-desc">Description</label>
        <textarea
          id="spec-desc"
          className="textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
          disabled={busy}
        />
      </div>

      <div className="form__row">
        <div className="field">
          <label htmlFor="spec-slot">Coding slot</label>
          <select
            id="spec-slot"
            className="select"
            value={codingSlot}
            onChange={(e) => setCodingSlot(e.target.value as CodingSlot | "")}
            disabled={busy}
            aria-invalid={touched && slotError ? "true" : undefined}
          >
            <option value="">Choose…</option>
            {CODING_SLOTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {touched && slotError ? <span className="field__error">{slotError}</span> : null}
        </div>
        <div className="field">
          <label htmlFor="spec-selection">Selection</label>
          <select
            id="spec-selection"
            className="select"
            value={selection}
            onChange={(e) => setSelection(e.target.value as Selection)}
            disabled={busy}
          >
            <option value="single">single</option>
            <option value="multi">multi</option>
          </select>
        </div>
      </div>

      <label className="check">
        <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} disabled={busy} />
        Required in Add Garment
      </label>

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
          {busy ? "Adding…" : "Add Spec"}
        </button>
      </div>
    </form>
  );
}
