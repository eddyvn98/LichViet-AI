import test from "node:test";
import assert from "node:assert/strict";
import { solarToVietnameseLunar } from "../src/vietnamese-lunar.js";
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
