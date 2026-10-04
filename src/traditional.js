import { SolarDay, SolarTime } from "tyme4ts";
import { getBaZi, jieMonthTransitionForDate } from "./bazi.js";
import { personalizeDay } from "./personal-v2.js";
import { evaluateDuty, ruleSummary } from "./rule-engine.js";
import { branchVi, translateDuty, translateStar, translateTaboos } from "./i18n.js";
import { solarToVietnameseLunar } from "./vietnamese-lunar.js";
import { crossCheckDay } from "./crosscheck.js";
import {
  assessEvidence,
  evidenceRecordById
} from "./evidence.js";
import { classifyScore, scoreDayBase } from "./scoring.js";
import { calculateTwelveDuty } from "./twelve-duty.js";
import {
  calculateEclipticDay,
  eclipticHoursForDay,
  goodEclipticHours
} from "./ecliptic.js";

const DUTY_FALLBACK = {
  "建":["khởi động việc nhỏ","lập kế hoạch"],
  "除":["dọn dẹp","loại bỏ việc tồn"],
  "满":["gặp gỡ","hoàn thiện việc đang làm"],
  "平":["xử lý việc thường ngày"],
  "定":["chốt kế hoạch","ổn định công việc"],
  "执":["theo đuổi việc đã định"],
  "破":["rà soát và sửa sai"],
  "危":["việc quen thuộc, ít rủi ro"],
  "成":["hoàn tất việc quan trọng","ký kết"],
  "收":["thu hồi, tổng kết"],
  "开":["bắt đầu công việc","gặp gỡ"],
  "闭":["nghỉ ngơi, hoàn thiện nội bộ"]
};

const HOUR_BRANCHES = [
  "子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"
];

function parseDate(iso) {
  const [y,m,d] = iso.split("-").map(Number);
  if (!y || !m || !d || y < 1800 || y > 2199) {
    throw new Error("Ngày ngoài phạm vi 1800–2199");
  }
  return { y,m,d };
}

function normalizeDeity(raw) {
  return raw === "元武" ? "玄武" : raw;
}

function verifiedGoodHours(dayBranch) {
  return goodEclipticHours(dayBranch).map(x => ({
    range:x.range,
    branch:branchVi(x.branch),
    star:translateStar(x.deity),
    rawBranch:x.branch,
    rawStar:x.deity,
    source:"verified-engine",
    evidenceLevel:"PRIMARY_EXACT",
    evidenceRefs:x.evidenceRefs
  }));
}

function crossCheckEclipticHours(y, m, d, dayBranch) {
  const expected = new Map(
    eclipticHoursForDay(dayBranch).map(x => [x.branch, x])
  );
  const differences = [];

  for (let hour = 0; hour < 24; hour += 2) {
    const lunarHour = SolarTime.fromYmdHms(y,m,d,hour,0,0).getLunarHour();
    const star = lunarHour.getTwelveStar();
    const branch = HOUR_BRANCHES[Math.floor((hour + 1) / 2) % 12];
    const actualDeity = normalizeDeity(star.getName());
    const actualGood = star.getEcliptic().getLuck().getName() === "吉";
    const engine = expected.get(branch);

    if (!engine || engine.deity !== actualDeity || engine.good !== actualGood) {
      differences.push({
        branch,
        engine:engine ? { deity:engine.deity, good:engine.good } : null,
        reference:{ deity:actualDeity, good:actualGood }
      });
    }
  }

  return {
    id:"XCHK-ECLIPTIC-HOURS-TYME4TS",
    provider:"tyme4ts",
    family:"6tail",
    scope:"ecliptic-hours",
    status:differences.length ? "disputed" : "agree",
    differences,
    note:"Giờ Hoàng/Hắc đạo do engine tự tính; Tyme4TS chỉ dùng để cross-check."
  };
}

function alignedWithVietnameseLunar(engineLunar, vn) {
  return Math.abs(engineLunar.getMonth()) === vn.month &&
    engineLunar.getDay() === vn.day &&
    engineLunar.getYear() === vn.year;
}

function unique(values) {
  return [...new Set(values)];
}

function buildDutyState(isoDate, bazi) {
  const transition = jieMonthTransitionForDate(isoDate);
  const monthBranches = transition
    ? [transition.previousMonthBranch, transition.newMonthBranch]
    : [bazi.branches.month];

  const candidates = monthBranches.map(monthBranch => {
    const calculation = calculateTwelveDuty(
      monthBranch,
      bazi.branches.day
    );
    const evaluation = evaluateDuty(calculation.raw);
    return {
      monthBranch,
      raw:calculation.raw,
      calculation,
      evaluation
    };
  });

  const primary = candidates[candidates.length - 1];
  return {
    transition:transition ? {
      ...transition,
      evidenceRefs:[
        ...transition.evidenceRefs,
        "XLKY-DUTY-TRANSITION"
      ]
    } : null,
    candidates,
    primary,
    dutyRaws:unique(candidates.map(x => x.raw)),
    baseScore:Math.min(...candidates.map(x => x.evaluation.baseScore)),
    ruleIds:unique(candidates.flatMap(x => x.evaluation.ruleIds)),
    evidence:candidates.flatMap(x => x.evaluation.evidence || []),
    scoringPolicy:transition ? "conservative-minimum" : "single-duty"
  };
}

function buildEclipticState(dutyState, bazi) {
  const monthBranches = dutyState.candidates.map(x => x.monthBranch);
  const candidates = monthBranches.map(monthBranch =>
    calculateEclipticDay(monthBranch, bazi.branches.day)
  );
  const primary = candidates[candidates.length - 1];

  return {
    transition:dutyState.transition,
    candidates,
    primary,
    conservativeGood:candidates.every(x => x.good),
    evidenceRefs:["XJ-HUANGHEI","QMDJ-HUANGHEI"]
  };
}

function displayDuty(state) {
  return state.candidates
    .map(x => translateDuty(x.raw))
    .filter((x,i,a) => a.indexOf(x) === i)
    .join(" → ");
}

function displayDeity(state) {
  return state.candidates
    .map(x => translateStar(x.deity))
    .filter((x,i,a) => a.indexOf(x) === i)
    .join(" → ");
}

function displayEcliptic(state) {
  return state.candidates
    .map(x => x.good ? "Hoàng đạo" : "Hắc đạo")
    .filter((x,i,a) => a.indexOf(x) === i)
    .join(" → ");
}

export function buildDayInfo(isoDate, profile = null) {
  const { y,m,d } = parseDate(isoDate);
  const solar = SolarDay.fromYmd(y,m,d);
  const engineLunar = solar.getLunarDay();
  const vnLunar = solarToVietnameseLunar(isoDate);
  const aligned = alignedWithVietnameseLunar(engineLunar, vnLunar);

  const bazi = getBaZi(isoDate, "12:00");
  const dutyState = buildDutyState(isoDate, bazi);
  const eclipticState = buildEclipticState(dutyState, bazi);

  const tymeDutyRaw = engineLunar.getDuty().getName();
  const tymeStar = engineLunar.getTwelveStar();
  const tymeStarRaw = normalizeDeity(tymeStar.getName());
  const rawRecommended = engineLunar.getRecommends().map(x => x.getName());
  const rawAvoid = engineLunar.getAvoids().map(x => x.getName());

  let recommended = aligned ? translateTaboos(rawRecommended) : [];
  let avoid = aligned ? translateTaboos(rawAvoid) : [];
  let recommendationOrigin = aligned ? "tyme4ts-advisory" : "duty-fallback";

  if (!recommended.length) {
    recommended = unique(
      dutyState.dutyRaws.flatMap(raw => DUTY_FALLBACK[raw] || [])
    );
    if (!recommended.length) recommended = ["việc thường ngày"];
    recommendationOrigin = "duty-fallback";
  }
  if (!avoid.length) {
    avoid = ["không có kiêng kỵ nổi bật trong lớp quy tắc đang bật"];
  }

  const personal = personalizeDay(profile, bazi);
  const ranking = {
    ...scoreDayBase({
      dutyBase:dutyState.baseScore,
      eclipticGood:eclipticState.conservativeGood,
      personalDelta:personal?.delta || 0
    }),
    transitionPolicy:dutyState.transition
      ? "conservative-minimum-across-jie-transition"
      : "single-state"
  };

  const ruleIds = unique([
    ...dutyState.ruleIds,
    ...(personal?.ruleIds || [])
  ]);
  const rules = ruleSummary(ruleIds);

  const crossChecks = crossCheckDay({
    date:isoDate,
    time:"12:00",
    vietnameseLunar:vnLunar,
    bazi,
    tymeAligned:aligned
  });

  const dutyMatch = dutyState.dutyRaws.includes(tymeDutyRaw);
  crossChecks.push({
    id:"XCHK-DUTY-TYME4TS",
    provider:"tyme4ts",
    family:"6tail",
    scope:"twelve-duty",
    status:dutyMatch ? "agree" : "disputed",
    differences:dutyMatch ? [] : [{
      field:"duty",
      engine:dutyState.dutyRaws,
      reference:tymeDutyRaw
    }],
    note:dutyState.transition
      ? "Ngày giao tiết có thể chồng hai Trực theo nguyên điển; Tyme4TS chỉ cần khớp một trạng thái hợp lệ."
      : "12 Trực do engine tự tính; Tyme4TS chỉ dùng để cross-check."
  });

  const deityCandidates = eclipticState.candidates.map(x => x.deity);
  const deityMatch = deityCandidates.includes(tymeStarRaw);
  crossChecks.push({
    id:"XCHK-ECLIPTIC-DAY-TYME4TS",
    provider:"tyme4ts",
    family:"6tail",
    scope:"ecliptic-day",
    status:deityMatch ? "agree" : "disputed",
    differences:deityMatch ? [] : [{
      field:"deity",
      engine:deityCandidates,
      reference:tymeStarRaw
    }],
    note:dutyState.transition
      ? "Ngày giao tiết có hai neo tháng hợp lệ; Tyme4TS chỉ cần khớp một trạng thái."
      : "Thần Hoàng/Hắc đạo ngày do engine tự tính; Tyme4TS chỉ dùng để cross-check."
  });
  crossChecks.push(
    crossCheckEclipticHours(y,m,d,bazi.branches.day)
  );

  const evidence = [
    ...rules.map(r => r.evidence).filter(Boolean),
    evidenceRecordById("XJ-HUANGHEI"),
    ...(dutyState.transition
      ? [evidenceRecordById("XLKY-DUTY-TRANSITION")]
      : [])
  ].filter(Boolean);

  const factConfidence = assessEvidence({
    evidence,
    crossChecks,
    experimental:false
  });

  return {
    date:isoDate,
    lunar:vnLunar,
    canChi:{
      year:bazi.vi.year,
      month:bazi.vi.month,
      day:bazi.vi.day
    },
    solarTerm:bazi.solarTerm,
    baziBoundary:bazi.boundary,
    duty:displayDuty(dutyState),
    dutyTransition:dutyState.transition ? {
      term:dutyState.transition.term,
      at:dutyState.transition.moment.iso,
      before:translateDuty(dutyState.candidates[0].raw),
      after:translateDuty(dutyState.candidates[1].raw),
      evidenceRefs:dutyState.transition.evidenceRefs
    } : null,
    twelveStar:displayDeity(eclipticState),
    ecliptic:displayEcliptic(eclipticState),
    eclipticTransition:dutyState.transition ? {
      at:dutyState.transition.moment.iso,
      before:{
        deity:translateStar(eclipticState.candidates[0].deity),
        type:eclipticState.candidates[0].good ? "Hoàng đạo" : "Hắc đạo"
      },
      after:{
        deity:translateStar(eclipticState.candidates[1].deity),
        type:eclipticState.candidates[1].good ? "Hoàng đạo" : "Hắc đạo"
      },
      evidenceRefs:eclipticState.evidenceRefs
    } : null,
    verdict:classifyScore(ranking.score),
    ranking,
    recommended,
    avoid,
    recommendationOrigin,
    goodHours:verifiedGoodHours(bazi.branches.day),
    personal,
    provenance:{
      ruleIds,
      rules,
      crossChecks,
      baziCalculation:bazi.calculation,
      dutyCalculation:dutyState,
      eclipticCalculation:eclipticState,
      implementationNotes:[
        "12 Trực do verified engine tự tính; ngày giao tiết giữ cả trạng thái trước/sau theo nguyên điển.",
        "Hoàng/Hắc đạo ngày và giờ do verified engine tự tính theo Hiệp Kỷ Biện Phương Thư.",
        "Tyme4TS chỉ cung cấp nghi/kỵ chi tiết dạng advisory và cross-check các phép tính cốt lõi.",
        "lunar-javascript dùng để cross-check Can Chi và lịch âm.",
        "Tyme4TS và lunar-javascript cùng family 6tail nên không được tính là hai nguồn độc lập.",
        "Điểm ranking là heuristic của app, tách biệt với độ tin cậy của facts."
      ]
    },
    confidence:{
      facts:factConfidence,
      ranking:{
        code:"experimental",
        label:"Điểm xếp hạng là heuristic",
        canMakeStrongClaim:false,
        policy:ranking.policy.id
      },
      calendar:crossChecks.some(x =>
        x.scope === "lunar-calendar" && x.status === "disputed"
      ) ? "cần rà soát" : "cao cho engine Việt UTC+7",
      traditionalRules:factConfidence.code,
      advisoryRecommendations:aligned
        ? "implementation-advisory"
        : "disabled-because-calendar-not-aligned",
      personalization:personal
        ? "mixed-provenance-plus-heuristic-score"
        : "chưa bật",
      boundary:dutyState.transition
        ? "jie-transition-day"
        : bazi.boundary.nearBoundary
          ? "near-solar-term-boundary"
          : "normal",
      note:factConfidence.code === "disputed"
        ? "Có bất đồng kỹ thuật trong cross-check; AI phải trình bày thận trọng."
        : dutyState.transition
          ? `Ngày giao ${dutyState.transition.term}; Trực và Hoàng/Hắc đạo ngày có trạng thái trước/sau tại ${dutyState.transition.moment.time}.`
          : bazi.boundary.nearBoundary
            ? "Gần ranh giới tiết khí; ca quan trọng cần xác minh thời điểm tiết khí chính xác."
            : aligned
              ? "Engine Việt và implementation cross-check trùng ngày âm ở ngày này."
              : "Có khác biệt với implementation lịch Trung Quốc; nghi/kỵ advisory bị loại khỏi ranking."
    },
    evidence:[
      "VN-LUNAR-HND-ALGORITHM",
      "VN-UTC7-OFFICIAL",
      "XJ-HUANGHEI",
      "tyme4ts",
      "lunar-javascript"
    ],
    disclaimer:"Cát/hung là diễn giải theo hệ truyền thống, không phải dự đoán khoa học hay bảo đảm kết quả.",
    _ranking:ranking.score,
    _rawRecommended:rawRecommended,
    _rawAvoid:rawAvoid,
    _implementationAdviceUsable:aligned,
    _dutyRaw:dutyState.primary.raw,
    _dutyRaws:dutyState.dutyRaws
  };
}

export function publicDay(info) {
  const {
    _ranking,
    _rawRecommended,
    _rawAvoid,
    _implementationAdviceUsable,
    _dutyRaw,
    _dutyRaws,
    ...publicInfo
  } = info;
  return publicInfo;
}
