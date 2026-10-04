import test from "node:test";
import assert from "node:assert/strict";
import {
  composeActivityDecision,
  composeGeneralDayAssessment,
  DECISION_POLICY
} from "../src/recommendation-engine.js";
import {
  allActivityPolicies,
  allDutyClassifications,
  getDutyRule
} from "../src/rule-engine.js";

const expectedDutyClasses = {
  "建":["bad","bad"],
  "除":["good","second-good"],
  "满":["bad","bad"],
  "平":["bad","bad"],
  "定":["good","second-good"],
  "执":["good","good"],
  "破":["bad","very-bad"],
  "危":["good","top-good"],
  "成":["good","top-good"],
  "收":["bad","bad"],
  "开":["good","top-good"],
  "闭":["bad","bad"]
};

test("v6 duty corpus matches source-backed twelve-duty classification", () => {
  const duties = allDutyClassifications();
  assert.equal(duties.length, 12);
  for (const duty of duties) {
    assert.deepEqual(
      [duty.traditionalClass,duty.tier],
      expectedDutyClasses[duty.raw],
      duty.raw
    );
    assert.equal(duty.evidenceRef, "XLKY-12-DUTY-CLASSIFICATION");
  }
});

test("activity policies cover exactly eight supported activities", () => {
  const policies = allActivityPolicies();
  assert.equal(policies.length, 8);
  assert.equal(new Set(policies.map(x => x.activity)).size, 8);
  assert.ok(policies.every(x => x.evidenceLevel === "PRODUCT_POLICY"));
  assert.ok(policies.every(x => x.policyVersion === "activity-composition-v2"));
});

test("primary evidence never upgrades a duty product-policy rule", () => {
  const rule = getDutyRule("成");
  assert.equal(rule.evidence.level, "PRODUCT_POLICY");
  assert.equal(rule.evidence.strongClaim, false);
  assert.equal(rule.evidence.supportingEvidenceLevel, "PRIMARY_EXACT");
});

test("contract on Thành plus Hoàng đạo is preferred", () => {
  const x = composeActivityDecision({
    activity:"contract",
    dutyRaws:["成"],
    eclipticGoods:[true]
  });
  assert.equal(x.code, "preferred");
  assert.equal(x.label, "Ưu tiên");
  assert.equal(x.vetoes.length, 0);
});

test("contract on Phá is blocked only when traditional and product signals align", () => {
  const x = composeActivityDecision({
    activity:"contract",
    dutyRaws:["破"],
    eclipticGoods:[true]
  });
  assert.equal(x.code, "blocked");
  assert.ok(x.vetoes.some(v => /cùng hướng xấu/.test(v.detail)));
});

test("opening on Mãn becomes caution because policy and source class conflict", () => {
  const x = composeActivityDecision({
    activity:"opening",
    dutyRaws:["满"],
    eclipticGoods:[true]
  });
  assert.equal(x.code, "caution");
  assert.ok(x.supports.some(v => v.origin === "product-policy"));
  assert.ok(x.cautions.some(v => v.id === "TRADITIONAL-DUTY-BAD"));
});

test("building on Nguy becomes caution because product avoid conflicts with good class", () => {
  const x = composeActivityDecision({
    activity:"build",
    dutyRaws:["危"],
    eclipticGoods:[true]
  });
  assert.equal(x.code, "caution");
  assert.equal(x.vetoes.length, 0);
  assert.ok(x.cautions.some(v => /ACT-BUILD-AVOID/.test(v.id)));
});

test("Hắc đạo prevents preferred decision without acting as a veto", () => {
  const x = composeActivityDecision({
    activity:"contract",
    dutyRaws:["成"],
    eclipticGoods:[false]
  });
  assert.equal(x.code, "caution");
  assert.equal(x.vetoes.length, 0);
  assert.ok(x.cautions.some(v => v.id === "ECLIPTIC-BAD"));
});

test("personal clash downgrades an otherwise preferred day", () => {
  const x = composeActivityDecision({
    activity:"contract",
    dutyRaws:["成"],
    eclipticGoods:[true],
    personal:{
      signals:[{ level:"caution", detail:"Personal clash regression." }],
      evidence:[]
    }
  });
  assert.equal(x.code, "caution");
  assert.ok(x.cautions.some(v => v.id === "PERSONAL-CAUTION"));
});

test("Jie transition uses the worse state", () => {
  const x = composeActivityDecision({
    activity:"contract",
    dutyRaws:["成","破"],
    eclipticGoods:[true,true]
  });
  assert.equal(x.transition, true);
  assert.equal(x.code, "blocked");
  assert.ok(x.cautions.some(v => v.id === "JIE-TRANSITION-CONSERVATIVE"));
});

test("all 96 activity-duty combinations produce a valid auditable decision", () => {
  const policies = allActivityPolicies();
  const duties = allDutyClassifications();
  let count = 0;
  for (const policy of policies) {
    for (const duty of duties) {
      const x = composeActivityDecision({
        activity:policy.activity,
        dutyRaws:[duty.raw],
        eclipticGoods:[true]
      });
      assert.ok(["preferred","neutral","caution","blocked"].includes(x.code));
      assert.equal(x.policy.id, DECISION_POLICY.id);
      assert.ok(x.evidenceRefs.includes("XLKY-SELECTION-MULTIFACTOR"));
      count += 1;
    }
  }
  assert.equal(count, 96);
});

test("general verdict requires multiple signals and ignores numeric score", () => {
  const good = composeGeneralDayAssessment({
    dutyRaws:["成"],
    eclipticGoods:[true]
  });
  const mixed = composeGeneralDayAssessment({
    dutyRaws:["成"],
    eclipticGoods:[false]
  });
  const careful = composeGeneralDayAssessment({
    dutyRaws:["破"],
    eclipticGoods:[false]
  });
  assert.equal(good.code, "good");
  assert.equal(mixed.code, "normal");
  assert.equal(careful.code, "careful");
  assert.equal(good.policy.id, "general-day-composition-v1");
});
