import test from "node:test";
import assert from "node:assert/strict";
import { birthProfile } from "../src/bazi.js";
import { rankDays, rangeDays } from "../src/planner.js";
import { buildDayInfo, publicDay } from "../src/traditional.js";

test("day API model uses Vietnamese lunar date", () => {
  const d = publicDay(buildDayInfo("2026-10-04"));
  assert.equal(d.lunar.day, 24);
  assert.equal(d.lunar.month, 8);
  assert.equal(d.canChi.day, "Tân Hợi");
  assert.ok(d.recommended.length > 0);
  assert.ok(d.goodHours.length > 0);
  assert.ok(["Hoàng đạo","Hắc đạo"].includes(d.ecliptic));
  assert.ok(Array.isArray(d.provenance.crossChecks));
  assert.ok(d.provenance.crossChecks.some(x => x.provider === "lunar-javascript"));
  assert.ok(d.confidence.overall?.code);
});

test("birth profile does not invent missing hour", () => {
  const p = birthProfile("1995-04-14", "");
  assert.equal(p.birthTime, null);
  assert.equal(p.pillars.length, 3);
  assert.match(p.note, /không tự đoán|Chưa có giờ sinh/i);
});

test("range produces seven dates", () => {
  const r = rangeDays({ from:"2026-10-04", days:7 });
  assert.equal(r.length, 7);
  assert.equal(r[0].date, "2026-10-04");
  assert.equal(r[6].date, "2026-10-10");
});

test("planner returns ranked shortlist", () => {
  const r = rankDays({ from:"2026-10-04", days:14, activity:"contract" });
  assert.equal(r.length, 5);
  assert.ok(r.every(x => x.reasons.length));
  assert.ok(r.every(x => !("_score" in x)));
});
