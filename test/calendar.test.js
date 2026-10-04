import test from "node:test";
import assert from "node:assert/strict";
import { solarToVietnameseLunar, vietnameseLunarToSolar } from "../src/vietnamese-lunar.js";
import { getBaZi } from "../src/bazi.js";
import { branchRelationship } from "../src/personal.js";

test("Vietnam lunar golden: 2026-10-04 is 24/8", () => {
  const x = solarToVietnameseLunar("2026-10-04");
  assert.deepEqual({ day:x.day, month:x.month, year:x.year, leap:x.leap },
    { day:24, month:8, year:2026, leap:false });
});

test("Vietnam lunar golden: 2026-03-01 is 13/1", () => {
  const x = solarToVietnameseLunar("2026-03-01");
  assert.equal(x.day, 13); assert.equal(x.month, 1); assert.equal(x.year, 2026);
});

test("Vietnam lunar golden: 2026-03-19 starts month 2", () => {
  const x = solarToVietnameseLunar("2026-03-19");
  assert.equal(x.day, 1); assert.equal(x.month, 2); assert.equal(x.year, 2026);
});

test("Vietnam lunar golden: 2026-07-14 starts month 6", () => {
  const x = solarToVietnameseLunar("2026-07-14");
  assert.equal(x.day, 1); assert.equal(x.month, 6); assert.equal(x.year, 2026);
});

test("BaZi pillars for 2026-10-04 noon", () => {
  const x = getBaZi("2026-10-04", "12:00");
  assert.equal(x.vi.year, "Bính Ngọ");
  assert.equal(x.vi.month, "Đinh Dậu");
  assert.equal(x.vi.day, "Tân Hợi");
  assert.equal(x.solarTerm, "Thu phân");
});

test("basic branch clash and harmony", () => {
  assert.equal(branchRelationship("卯","酉").type, "clash");
  assert.equal(branchRelationship("子","丑").type, "harmony");
  assert.equal(branchRelationship("子","寅").type, "neutral");
});

test("BaZi supports explicit 23:00 day-boundary school without changing default", () => {
  const civil = getBaZi("2026-10-04", "23:30");
  const zi = getBaZi("2026-10-04", "23:30", { dayBoundary:"zi-hour" });
  assert.notEqual(civil.raw.day, zi.raw.day);
  assert.match(civil.calculation.dayBoundary, /00:00/);
  assert.match(zi.calculation.dayBoundary, /23:00/);
});

test("BaZi carries primary evidence refs and solar-term boundary metadata", () => {
  const x = getBaZi("2026-10-04", "12:00");
  assert.ok(x.calculation.evidenceRefs.includes("XJ-WUHU"));
  assert.ok(x.calculation.evidenceRefs.includes("XJ-WUSHU"));
  assert.equal(typeof x.boundary.distanceDegrees, "number");
});

test("Vietnam lunar conversion round-trips across representative dates", () => {
  for (const date of ["2025-01-29","2025-08-01","2026-02-17","2026-03-19","2026-10-04","2027-02-06"]) {
    const lunar = solarToVietnameseLunar(date);
    const solar = vietnameseLunarToSolar(lunar);
    assert.equal(solar.iso, date, `${date} -> ${JSON.stringify(lunar)} -> ${solar.iso}`);
  }
});

test("Vietnam lunar reverse conversion rejects impossible leap flag", () => {
  const normal = solarToVietnameseLunar("2026-10-04");
  assert.equal(normal.leap, false);
  assert.throws(
    () => vietnameseLunarToSolar({ ...normal, leap:true }),
    /nhuận|không tồn tại/i
  );
});
