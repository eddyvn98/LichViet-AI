const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
export const ECLIPTIC_DEITIES = [
  "青龙","明堂","天刑","朱雀","金匮","天德",
  "白虎","玉堂","天牢","玄武","司命","勾陈"
];
const GOOD = new Set(["青龙","明堂","金匮","天德","玉堂","司命"]);
const START_QINGLONG = {
  "子":"申","午":"申",
  "丑":"戌","未":"戌",
  "寅":"子","申":"子",
  "卯":"寅","酉":"寅",
  "辰":"辰","戌":"辰",
  "巳":"午","亥":"午"
};

function branchIndex(branch) {
  const index = BRANCHES.indexOf(branch);
  if (index < 0) throw new Error("Địa Chi không hợp lệ");
  return index;
}

function deityFor(anchorBranch, targetBranch) {
  const startBranch = START_QINGLONG[anchorBranch];
  if (!startBranch) throw new Error("Chi neo Hoàng/Hắc đạo không hợp lệ");
  const offset = (branchIndex(targetBranch) - branchIndex(startBranch) + 12) % 12;
  const deity = ECLIPTIC_DEITIES[offset];
  return {
    deity,
    good:GOOD.has(deity),
    offset,
    anchorBranch,
    startQinglongBranch:startBranch,
    targetBranch
  };
}

export function calculateEclipticDay(monthBranch, dayBranch) {
  return {
    ...deityFor(monthBranch, dayBranch),
    scope:"day",
    method:"xieji-yellow-black-path",
    evidenceRefs:["XJ-HUANGHEI","QMDJ-HUANGHEI"]
  };
}

export function calculateEclipticHour(dayBranch, hourBranch) {
  return {
    ...deityFor(dayBranch, hourBranch),
    scope:"hour",
    method:"xieji-yellow-black-path",
    evidenceRefs:["XJ-HUANGHEI","QMDJ-HUANGHEI"]
  };
}

export function hourRangeForBranch(branch) {
  const index = branchIndex(branch);
  if (index === 0) return "23:00–00:59";
  const start = index * 2 - 1;
  const end = index * 2;
  return `${String(start).padStart(2,"0")}:00–${String(end).padStart(2,"0")}:59`;
}

export function eclipticHoursForDay(dayBranch) {
  return BRANCHES.map(branch => {
    const result = calculateEclipticHour(dayBranch, branch);
    return {
      branch,
      range:hourRangeForBranch(branch),
      deity:result.deity,
      good:result.good,
      evidenceRefs:result.evidenceRefs,
      method:result.method
    };
  });
}

export function goodEclipticHours(dayBranch) {
  return eclipticHoursForDay(dayBranch).filter(x => x.good);
}
