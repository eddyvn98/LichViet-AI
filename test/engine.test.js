import test from "node:test";
import assert from "node:assert/strict";
import { birthProfile } from "../src/bazi.js";
import { analyzeBirthProfile } from "../src/bazi-profile.js";
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
  assert.equal(d.ranking.policy.id, "ranking-tiebreak-v2");
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
  assert.equal(r[0].activityRanking.policy.id, "ranking-tiebreak-v2");
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
  assert.equal(component.origin, "product-policy-derived-from-traditional-signal");
});


test("birth profile with missing time on Jie date withholds deep analysis", () => {
  const p = analyzeBirthProfile("2026-02-04", "");
  assert.equal(p.advancedAnalysisAvailable, false);
  assert.equal(p.completeness, "three-pillars-boundary-ambiguous");
  assert.ok(p.pillarUncertainty.ambiguousFields.includes("year"));
  assert.ok(p.pillarUncertainty.ambiguousFields.includes("month"));
  assert.equal(p.yearBranch, null);
  assert.equal(p.elements, null);
  assert.equal(p.strength, null);
  assert.deepEqual(p.tenGods, []);
  assert.match(p.note, /giữ cả khả năng|tạm ẩn/i);
});

test("explicit birth time resolves Jie-date profile", () => {
  const before = analyzeBirthProfile("2026-02-04", "00:30");
  const after = analyzeBirthProfile("2026-02-04", "23:30");
  assert.equal(before.advancedAnalysisAvailable, true);
  assert.equal(after.advancedAnalysisAvailable, true);
  assert.notEqual(before.rawPillars[0], after.rawPillars[0]);
  assert.notEqual(before.rawPillars[1], after.rawPillars[1]);
});

test("day confidence is split by domain and aggregate is conservative", () => {
  const d = publicDay(buildDayInfo("2026-10-04"));
  assert.ok(d.confidence.domains.calendar?.code);
  assert.ok(d.confidence.domains.bazi?.code);
  assert.ok(d.confidence.domains.traditional?.code);
  assert.equal(d.confidence.calendar, "khá cho engine Việt UTC+7");
  assert.equal(d.confidence.facts.code, "medium");
  assert.equal(d.confidence.facts.weakestDomain, "calendar");
});


test("general day verdict is composition-based, not score-based", () => {
  const d = publicDay(buildDayInfo("2026-10-04"));
  assert.equal(d.verdict.policy.id, "general-day-composition-v1");
  assert.equal(d.ranking.role, "tie-break-only");
  assert.equal(d.ranking.policy.id, "ranking-tiebreak-v2");
});


test("reproducibility fingerprint is stable for identical deterministic input", () => {
  const a = publicDay(buildDayInfo("2026-10-04"));
  const b = publicDay(buildDayInfo("2026-10-04"));
  const c = publicDay(buildDayInfo("2026-10-05"));
  assert.equal(a.provenance.trace.algorithm, "sha256");
  assert.equal(a.provenance.trace.engine, "verified-engine-v7");
  assert.equal(a.provenance.trace.hash, b.provenance.trace.hash);
  assert.notEqual(a.provenance.trace.hash, c.provenance.trace.hash);
  assert.match(a.provenance.trace.hash, /^[0-9a-f]{64}$/);
});

test("planner recommendation includes its own reproducibility fingerprint", () => {
  const first = rankDays({ from:"2026-10-04", days:1, activity:"contract" })[0];
  const second = rankDays({ from:"2026-10-04", days:1, activity:"contract" })[0];
  assert.equal(first.recommendationDecision.trace.algorithm, "sha256");
  assert.equal(
    first.recommendationDecision.trace.hash,
    second.recommendationDecision.trace.hash
  );
});
