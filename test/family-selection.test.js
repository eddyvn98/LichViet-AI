import test from "node:test";
import assert from "node:assert/strict";
import { analyzeBirthProfile } from "../src/bazi-profile.js";
import { personalizeFamily, FAMILY_POLICY } from "../src/family-selection.js";
import { compareDays, rankDays } from "../src/planner.js";
import {
  evaluateSelectionConstraints,
  normalizeSelectionConstraints
} from "../src/selection-constraints.js";

const familyProfiles = [
  {
    ...analyzeBirthProfile("1995-04-14", "12:00"),
    id:"member-a",
    name:"A"
  },
  {
    ...analyzeBirthProfile("1997-11-17", "12:00"),
    id:"member-b",
    name:"B"
  }
];

function isWeekend(iso) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone:"Asia/Ho_Chi_Minh",
    weekday:"short"
  }).format(new Date(iso + "T12:00:00+07:00"));
  return weekday === "Sat" || weekday === "Sun";
}

test("family personalization keeps one member caution instead of averaging it away", () => {
  const family = personalizeFamily([
    {
      id:"a",
      name:"A",
      yearBranch:"子",
      dayBranch:"子",
      dayMaster:{ raw:"甲", name:"Giáp" }
    },
    {
      id:"b",
      name:"B",
      yearBranch:"丑",
      dayBranch:"丑",
      dayMaster:{ raw:"乙", name:"Ất" }
    }
  ], {
    branches:{ day:"午" },
    raw:{ day:"丙午" }
  });

  assert.equal(family.policy.id, FAMILY_POLICY.id);
  assert.equal(family.memberCount, 2);
  assert.ok(family.signals.some(x =>
    x.level === "caution" && x.memberName === "A"
  ));
  assert.equal(family.delta, 0);
});

test("family personalization never creates a canonical veto", () => {
  const family = personalizeFamily(familyProfiles, {
    branches:{ day:"午" },
    raw:{ day:"丙午" }
  });
  assert.equal(family.policy.evidenceLevel, "PRODUCT_POLICY");
  assert.equal("vetoes" in family, false);
});

test("constraint engine separates user preferences from traditional rules", () => {
  const result = evaluateSelectionConstraints({
    lunar:{ day:15 },
    dutyTransition:{ before:"A", after:"B" }
  }, "2026-10-04", {
    dayType:"weekday",
    avoidLunarDays:[15],
    avoidJieTransition:true,
    excludeDates:["2026-10-04"]
  });

  assert.equal(result.accepted, false);
  assert.equal(result.policy.id, "selection-constraints-v1");
  assert.equal(result.policy.evidenceLevel, "PRODUCT_POLICY");
  assert.deepEqual(
    new Set(result.failures.map(x => x.code)),
    new Set(["DAY_TYPE","EXCLUDED_DATE","LUNAR_DAY","JIE_TRANSITION"])
  );
});

test("constraint normalization removes invalid and duplicate values", () => {
  const x = normalizeSelectionConstraints({
    dayType:"weekend",
    excludeDates:["2026-10-04","bad","2026-10-04"],
    avoidLunarDays:[1,15,15,31,0]
  });
  assert.deepEqual(x.excludeDates, ["2026-10-04"]);
  assert.deepEqual(x.avoidLunarDays, [1,15]);
  assert.equal(x.dayType, "weekend");
});

test("family planner can restrict results to weekends", () => {
  const results = rankDays({
    from:"2026-10-01",
    days:20,
    activity:"meeting",
    profiles:familyProfiles,
    constraints:{ dayType:"weekend" }
  });

  assert.ok(results.length >= 2);
  assert.ok(results.every(x => isWeekend(x.date)));
  assert.ok(results.every(x => x.family?.memberCount === 2));
  assert.ok(results.every(x =>
    x.constraintEvaluation?.policy?.id === "selection-constraints-v1"
  ));
});

test("direct comparison preserves rejected dates and explains winner", () => {
  const comparison = compareDays({
    dates:["2026-10-04","2026-10-05"],
    activity:"contract",
    profiles:familyProfiles,
    constraints:{ excludeDates:["2026-10-04"] }
  });

  assert.equal(comparison.policy.id, "deterministic-date-comparison-v1");
  assert.equal(comparison.candidates.length, 2);
  assert.equal(
    comparison.candidates.find(x => x.date === "2026-10-04")?.eligible,
    false
  );
  assert.equal(comparison.winner?.date, "2026-10-05");
  assert.ok(comparison.explanation);
  assert.equal(comparison.familyMemberCount, 2);
});

test("comparison only uses tie-break score inside the same decision band", () => {
  const comparison = compareDays({
    dates:["2026-10-04","2026-10-05","2026-10-06"],
    activity:"meeting",
    profiles:familyProfiles
  });
  assert.ok(comparison.winner);
  assert.match(
    comparison.explanation,
    /decision band|tie-break|thứ tự ngày|một ngày vượt qua/i
  );
  assert.ok(comparison.candidates.every(x =>
    x.activityRanking.role === "tie-break-only"
  ));
});
