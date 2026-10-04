import { getBaZi } from "./bazi.js";
import { BRANCH, STEM, pillarVi } from "./i18n.js";

const STEM_META = {
  "甲":["wood","yang"],"乙":["wood","yin"],"丙":["fire","yang"],"丁":["fire","yin"],
  "戊":["earth","yang"],"己":["earth","yin"],"庚":["metal","yang"],"辛":["metal","yin"],
  "壬":["water","yang"],"癸":["water","yin"]
};

const HIDDEN = {
  "子":[["癸",1]],"丑":[["己",.6],["辛",.1],["癸",.3]],
  "寅":[["甲",.6],["丙",.3],["戊",.1]],"卯":[["乙",1]],
  "辰":[["戊",.6],["乙",.3],["癸",.1]],"巳":[["丙",.6],["戊",.3],["庚",.1]],
  "午":[["丁",.7],["己",.3]],"未":[["丁",.3],["乙",.1],["己",.6]],
  "申":[["庚",.6],["壬",.3],["戊",.1]],"酉":[["辛",1]],
  "戌":[["丁",.1],["辛",.3],["戊",.6]],"亥":[["壬",.7],["甲",.3]]
};

const HIDDEN_MAIN = {
  "子":"癸","丑":"己","寅":"甲","卯":"乙","辰":"戊","巳":"丙",
  "午":"丁","未":"己","申":"庚","酉":"辛","戌":"戊","亥":"壬"
};

const ELEMENT_VI = {
  wood:"Mộc", fire:"Hỏa", earth:"Thổ", metal:"Kim", water:"Thủy"
};
const GENERATES = {
  wood:"fire", fire:"earth", earth:"metal", metal:"water", water:"wood"
};
const CONTROLS = {
  wood:"earth", earth:"water", water:"fire", fire:"metal", metal:"wood"
};

function generatedBy(element) {
  return Object.entries(GENERATES).find(([,to]) => to === element)?.[0];
}

function tenGod(dayStem, otherStem) {
  const [me, myPolarity] = STEM_META[dayStem];
  const [other, polarity] = STEM_META[otherStem];
  const samePolarity = myPolarity === polarity;

  if (other === me) return samePolarity ? "Tỷ Kiên" : "Kiếp Tài";
  if (GENERATES[me] === other) return samePolarity ? "Thực Thần" : "Thương Quan";
  if (CONTROLS[me] === other) return samePolarity ? "Thiên Tài" : "Chính Tài";
  if (CONTROLS[other] === me) return samePolarity ? "Thất Sát" : "Chính Quan";
  if (GENERATES[other] === me) return samePolarity ? "Thiên Ấn" : "Chính Ấn";
  return "Không xác định";
}

function hiddenStemDetails(rawPillars, dayStem) {
  return rawPillars.map((pillar, index) => {
    const branch = pillar[1];
    return {
      pillar:["Năm","Tháng","Ngày","Giờ"][index],
      branch,
      branchVi:BRANCH[branch] || branch,
      stems:(HIDDEN[branch] || []).map(([stem, weight]) => ({
        raw:stem,
        name:STEM[stem] || stem,
        element:ELEMENT_VI[STEM_META[stem][0]],
        relation:tenGod(dayStem, stem),
        weight,
        weightStatus:"EXPERIMENTAL"
      }))
    };
  });
}

function elementBalance(rawPillars) {
  const score = { wood:0, fire:0, earth:0, metal:0, water:0 };
  for (const p of rawPillars) {
    const stem = p[0], branch = p[1];
    score[STEM_META[stem][0]] += 1;
    for (const [hiddenStem, weight] of HIDDEN[branch] || []) {
      score[STEM_META[hiddenStem][0]] += weight;
    }
  }
  const total = Object.values(score).reduce((a,b) => a+b, 0) || 1;
  return Object.fromEntries(Object.entries(score).map(([k,v]) => [
    k, {
      label:ELEMENT_VI[k],
      score:Number(v.toFixed(2)),
      pct:Math.round(v / total * 100)
    }
  ]));
}

function strengthHeuristic(dayStem, monthBranch, balance) {
  const dayElement = STEM_META[dayStem][0];
  const resource = generatedBy(dayElement);
  const monthMainStem = HIDDEN_MAIN[monthBranch] || null;
  const monthElement = monthMainStem ? STEM_META[monthMainStem][0] : null;

  let support = balance[dayElement].score + balance[resource].score;
  let pressure = Object.entries(balance)
    .filter(([k]) => k !== dayElement && k !== resource)
    .reduce((sum,[,v]) => sum + v.score, 0);

  if (monthElement === dayElement || monthElement === resource) support += 1.2;
  else pressure += 1.2;

  const ratio = support / Math.max(.1, support + pressure);
  return {
    label:ratio >= .58 ? "thiên mạnh" : ratio <= .42 ? "thiên yếu" : "tương đối cân bằng",
    ratio:Number(ratio.toFixed(2)),
    method:"experimental-strength-v1",
    evidenceLevel:"EXPERIMENTAL",
    informedBy:["SFTK-STRENGTH-QUALITATIVE"],
    affectsRanking:false,
    warning:"Đây là heuristic định lượng của ứng dụng. Không phải kết luận Dụng thần, vượng suy canonical hay quy tắc đã được nguyên điển xác minh."
  };
}

export function analyzeBirthProfile(birthDate, birthTime = "", options = {}) {
  if (!birthDate) return null;
  const hasTime = /^\d{2}:\d{2}$/.test(birthTime);
  const bazi = getBaZi(birthDate, hasTime ? birthTime : "12:00", options);
  const rawPillars = hasTime
    ? [bazi.raw.year,bazi.raw.month,bazi.raw.day,bazi.raw.hour]
    : [bazi.raw.year,bazi.raw.month,bazi.raw.day];
  const dayStem = bazi.raw.day[0];
  const balance = elementBalance(rawPillars);
  const strength = strengthHeuristic(dayStem, bazi.branches.month, balance);

  const stemGods = rawPillars.map((p, i) => ({
    pillar:["Năm","Tháng","Ngày","Giờ"][i],
    stem:STEM[p[0]] || p[0],
    rawStem:p[0],
    relation:i === 2 ? "Nhật chủ" : tenGod(dayStem, p[0])
  }));

  return {
    birthDate,
    birthTime:hasTime ? birthTime : null,
    pillars:rawPillars.map(pillarVi),
    rawPillars,
    yearBranch:bazi.branches.year,
    dayBranch:bazi.branches.day,
    yearBranchVi:BRANCH[bazi.branches.year],
    dayBranchVi:BRANCH[bazi.branches.day],
    boundary:bazi.boundary,
    calculation:bazi.calculation,
    dayMaster:{
      raw:dayStem,
      name:STEM[dayStem],
      element:ELEMENT_VI[STEM_META[dayStem][0]],
      polarity:STEM_META[dayStem][1] === "yang" ? "Dương" : "Âm"
    },
    elements:balance,
    elementBalanceMethod:{
      id:"weighted-hidden-stems-v1",
      evidenceLevel:"EXPERIMENTAL",
      affectsRanking:false,
      note:"Tàng can membership có provenance; trọng số số học dùng cho biểu đồ là heuristic."
    },
    hiddenStems:hiddenStemDetails(rawPillars, dayStem),
    hiddenStemEvidence:{
      evidenceRefs:["SFTK-HIDDEN-STEMS"],
      membershipVerified:true,
      numericWeightsVerified:false
    },
    strength,
    tenGods:stemGods,
    tenGodMethod:{
      id:"five-elements-polarity-derivation",
      evidenceLevel:"PRIMARY_EXACT",
      sourceAuthority:"supplemental-classic-authority-3",
      evidenceRefs:["SFTK-TEN-GODS"],
      affectsRanking:false
    },
    completeness:hasTime ? "four-pillars" : "three-pillars",
    note:hasTime
      ? "Đủ 4 trụ theo giờ sinh đã nhập."
      : "Chưa có giờ sinh nên phần giờ và các suy luận phụ thuộc giờ bị bỏ qua; app không tự đoán."
  };
}

export function tenGodForStem(dayMasterRaw, otherStemRaw) {
  if (!STEM_META[dayMasterRaw] || !STEM_META[otherStemRaw]) {
    throw new Error("Thiên Can không hợp lệ");
  }
  return tenGod(dayMasterRaw, otherStemRaw);
}

export function hiddenStemsForBranch(branchRaw) {
  if (!HIDDEN[branchRaw]) throw new Error("Địa Chi không hợp lệ");
  return HIDDEN[branchRaw].map(([stem, weight]) => ({
    raw:stem,
    name:STEM[stem] || stem,
    weight,
    weightStatus:"EXPERIMENTAL"
  }));
}
