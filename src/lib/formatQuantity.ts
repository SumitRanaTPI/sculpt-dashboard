/**
 * Compact meters label for cloth-stock cards and detail, e.g. "12.5 m".
 * Returns null when meters is missing or not a positive finite number.
 */
export function formatFabricQuantityLabel(
  meters: number | string | null | undefined,
  unit = "m",
): string | null {
  if (meters == null || meters === "") return null;
  const n = typeof meters === "number" ? meters : Number(meters);
  if (!Number.isFinite(n) || n <= 0) return null;
  const text = Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(3)));
  return `${text} ${unit}`;
}

/** Normalize PostgREST numeric (number | string) to a finite number or null. */
export function parseQuantityMeters(
  value: number | string | null | undefined,
): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}
