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
  assert.equal(d.goodHours.length, 6);
  assert.ok(d.goodHours.every(x => x.source === "verified-engine"));
  assert.ok(["Hoàng đạo","Hắc đạo"].includes(d.ecliptic));
  assert.ok(Array.isArray(d.provenance.crossChecks));
  assert.ok(d.provenance.crossChecks.some(x => x.provider === "lunar-javascript"));
  assert.equal(
    d.provenance.crossChecks.find(x => x.scope === "twelve-duty")?.status,
    "agree"
  );
  assert.equal(
    d.provenance.crossChecks.find(x => x.scope === "ecliptic-day")?.status,
    "agree"
  );
  assert.equal(
    d.provenance.crossChecks.find(x => x.scope === "ecliptic-hours")?.status,
    "agree"
  );
  assert.ok(d.confidence.facts?.code);
  assert.equal(d.confidence.ranking.code, "experimental");
  assert.equal(d.ranking.policy.id, "ranking-heuristic-v1");
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

test("planner exposes one heuristic score pipeline without hidden double count", () => {
  const r = rankDays({ from:"2026-10-04", days:1, activity:"contract" });
  assert.equal(r.length, 1);
  const ids = r[0].activityRanking.components.map(x => x.id);
  assert.equal(ids.filter(x => x === "DUTY_ACTIVITY").length <= 1, true);
  assert.equal(r[0].activityRanking.policy.id, "ranking-heuristic-v1");
});


test("Jie transition day keeps both Duties and both day-deity states", () => {
  const d = publicDay(buildDayInfo("2026-01-05"));
  assert.ok(d.dutyTransition);
  assert.equal(d.dutyTransition.before, "Bình");
  assert.equal(d.dutyTransition.after, "Mãn");
  assert.match(d.duty, /Bình.*Mãn/);
  assert.ok(d.eclipticTransition);
  assert.equal(
    d.provenance.crossChecks.find(x => x.scope === "twelve-duty")?.status,
    "agree"
  );
  assert.equal(
    d.provenance.crossChecks.find(x => x.scope === "ecliptic-day")?.status,
    "agree"
  );
  assert.equal(d.ranking.transitionPolicy, "conservative-minimum-across-jie-transition");
});

test("planner marks Jie transition scoring as conservative", () => {
  const r = rankDays({ from:"2026-01-05", days:1, activity:"contract" });
  assert.equal(r.length, 1);
  assert.equal(r[0].ranking.transitionPolicy, "conservative-minimum-across-jie-transition");
  assert.match(r[0].reasons.join(" "), /hai Trực|giao tiết/i);
});


test("implementation advisory never changes activity score", async () => {
  const { scoreActivity } = await import("../src/scoring.js");
  const base = scoreActivity({ baseScore:60, activityDelta:7 });
  const withIgnoredAdvisoryArgs = scoreActivity({
    baseScore:60,
    activityDelta:7,
    recommendedHit:true,
    avoidHit:true
  });
  assert.equal(base.score, 67);
  assert.equal(withIgnoredAdvisoryArgs.score, 67);
  assert.equal(
    withIgnoredAdvisoryArgs.components.some(x =>
      x.id === "DIRECT_RECOMMENDATION" || x.id === "DIRECT_AVOID"
    ),
    false
  );
});

test("ecliptic component is labeled as engine rule normalization", async () => {
  const { scoreDayBase } = await import("../src/scoring.js");
  const result = scoreDayBase({ dutyBase:0, eclipticGood:true, personalDelta:0 });
  const component = result.components.find(x => x.id === "ECLIPTIC_DAY");
  assert.ok(component);
  assert.equal(component.origin, "traditional-rule-normalization");
});
