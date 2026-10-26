import assert from "node:assert/strict";
import test from "node:test";
import {
  addCalendarDays,
  archiveFilename,
  calendarDate,
  createdInRange,
  isValidRange,
  rangeForPreset,
} from "./dates.ts";

test("calendar date uses Asia/Kolkata", () => {
  // 2026-10-04 19:00 UTC is 2026-10-05 00:30 IST.
  assert.equal(calendarDate(new Date("2026-10-04T19:00:00.000Z")), "2026-10-05");
  // One minute before midnight IST is still the 4th.
  assert.equal(calendarDate(new Date("2026-10-04T18:29:00.000Z")), "2026-10-04");
});

test("today and yesterday follow the studio calendar", () => {
  const now = new Date("2026-10-04T19:00:00.000Z");
  assert.deepEqual(rangeForPreset("today", now), { from: "2026-10-05", to: "2026-10-05" });
  assert.deepEqual(rangeForPreset("yesterday", now), { from: "2026-10-04", to: "2026-10-04" });
});

test("inclusive range keeps both end days", () => {
  const range = { from: "2026-10-01", to: "2026-10-02" };
  assert.equal(createdInRange("2026-09-30T18:30:00.000Z", range), true);
  assert.equal(createdInRange("2026-10-02T18:29:00.000Z", range), true);
  assert.equal(createdInRange("2026-09-30T18:29:00.000Z", range), false);
  assert.equal(createdInRange("2026-10-02T18:30:00.000Z", range), false);
});

test("custom range rejects an inverted or invalid pair", () => {
  assert.equal(isValidRange({ from: "2026-10-03", to: "2026-10-01" }), false);
  assert.equal(isValidRange({ from: "2026-02-31", to: "2026-03-01" }), false);
  assert.equal(isValidRange({ from: "2026-10-01", to: "2026-10-01" }), true);
});

test("filename uses the inclusive dates", () => {
  assert.equal(archiveFilename({ from: "2026-10-01", to: "2026-10-05" }, "pdf"), "sculpt-archive-2026-10-01_to_2026-10-05.pdf");
  assert.equal(addCalendarDays("2026-03-01", -1), "2026-02-28");
});
