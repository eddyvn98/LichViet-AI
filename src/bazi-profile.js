import { getBaZi } from "./bazi.js";
import { BRANCH, STEM, pillarVi } from "./i18n.js";

const STEM_META = {
  "甲":["wood","yang"],"乙":["wood","yin"],"丙":["fire","yang"],"丁":["fire","yin"],
  "戊":["earth","yang"],"己":["earth","yin"],"庚":["metal","yang"],"辛":["metal","yin"],
  "壬":["water","yang"],"癸":["water","yin"]
};

const HIDDEN = {
  "子":[["癸",1]],"丑":[["己",.6],["癸",.3],["辛",.1]],
  "寅":[["甲",.6],["丙",.3],["戊",.1]],"卯":[["乙",1]],
  "辰":[["戊",.6],["乙",.3],["癸",.1]],"巳":[["丙",.6],["戊",.3],["庚",.1]],
  "午":[["丁",.7],["己",.3]],"未":[["己",.6],["丁",.3],["乙",.1]],
  "申":[["庚",.6],["壬",.3],["戊",.1]],"酉":[["辛",1]],
  "戌":[["戊",.6],["辛",.3],["丁",.1]],"亥":[["壬",.7],["甲",.3]]
};

const ELEMENT_VI = { wood:"Mộc", fire:"Hỏa", earth:"Thổ", metal:"Kim", water:"Thủy" };
const GENERATES = { wood:"fire", fire:"earth", earth:"metal", metal:"water", water:"wood" };
const CONTROLS = { wood:"earth", earth:"water", water:"fire", fire:"metal", metal:"wood" };

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
    k, { label:ELEMENT_VI[k], score:Number(v.toFixed(2)), pct:Math.round(v / total * 100) }
  ]));
}

function strengthHeuristic(dayStem, monthBranch, balance) {
  const dayElement = STEM_META[dayStem][0];
  const resource = generatedBy(dayElement);
  const monthMainStem = HIDDEN[monthBranch]?.[0]?.[0];
  const monthElement = monthMainStem ? STEM_META[monthMainStem][0] : null;

  let support = balance[dayElement].score + balance[resource].score;
  let pressure = Object.entries(balance)
    .filter(([k]) => k !== dayElement && k !== resource)
    .reduce((sum,[,v]) => sum + v.score, 0);

  if (monthElement === dayElement || monthElement === resource) support += 1.2;
  else pressure += 1.2;

  const ratio = support / Math.max(.1, support + pressure);
  return {
    label: ratio >= .58 ? "thiên mạnh" : ratio <= .42 ? "thiên yếu" : "tương đối cân bằng",
    ratio:Number(ratio.toFixed(2)),
    method:"heuristic-v2",
    warning:"Đây là mô hình định lượng đơn giản để giải thích, không thay cho kết luận Dụng thần của một trường phái cụ thể."
  };
}

export function analyzeBirthProfile(birthDate, birthTime = "") {
  if (!birthDate) return null;
  const hasTime = /^\d{2}:\d{2}$/.test(birthTime);
  const bazi = getBaZi(birthDate, hasTime ? birthTime : "12:00");
  const rawPillars = hasTime
    ? [bazi.raw.year,bazi.raw.month,bazi.raw.day,bazi.raw.hour]
    : [bazi.raw.year,bazi.raw.month,bazi.raw.day];
  const dayStem = bazi.raw.day[0];
  const balance = elementBalance(rawPillars);
  const strength = strengthHeuristic(dayStem, bazi.branches.month, balance);

  const stemGods = rawPillars.map((p, i) => ({
    pillar:["Năm","Tháng","Ngày","Giờ"][i],
    stem:STEM[p[0]] || p[0],
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
    dayMaster:{
      raw:dayStem,
      name:STEM[dayStem],
      element:ELEMENT_VI[STEM_META[dayStem][0]],
      polarity:STEM_META[dayStem][1] === "yang" ? "Dương" : "Âm"
    },
    elements:balance,
    strength,
    tenGods:stemGods,
    completeness:hasTime ? "four-pillars" : "three-pillars",
    note:hasTime
      ? "Đủ 4 trụ theo giờ sinh đã nhập."
      : "Chưa có giờ sinh nên phần giờ và các suy luận phụ thuộc giờ bị bỏ qua; app không tự đoán."
  };
}

export function tenGodForStem(dayMasterRaw, otherStemRaw) {
  return tenGod(dayMasterRaw, otherStemRaw);
}
