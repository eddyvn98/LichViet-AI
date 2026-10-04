import { SolarDay, SolarTime } from "tyme4ts";
import { getBaZi } from "./bazi.js";
import { personalizeDay } from "./personal-v2.js";
import { evaluateDuty, ruleSummary } from "./rule-engine.js";
import { branchVi, translateDuty, translateStar, translateTaboos } from "./i18n.js";
import { solarToVietnameseLunar } from "./vietnamese-lunar.js";
import { crossCheckDay } from "./crosscheck.js";
import { assessEvidence } from "./evidence.js";
import { classifyScore, scoreDayBase } from "./scoring.js";
import { calculateTwelveDuty } from "./twelve-duty.js";

const DUTY_FALLBACK = {
  "建":["khởi động việc nhỏ","lập kế hoạch"],
  "除":["dọn dẹp","loại bỏ việc tồn"],
  "满":["gặp gỡ","hoàn thiện việc đang làm"],
  "平":["xử lý việc thường ngày"],"定":["chốt kế hoạch","ổn định công việc"],
  "执":["theo đuổi việc đã định"],"破":["rà soát và sửa sai"],
  "危":["việc quen thuộc, ít rủi ro"],"成":["hoàn tất việc quan trọng","ký kết"],
  "收":["thu hồi, tổng kết"],"开":["bắt đầu công việc","gặp gỡ"],
  "闭":["nghỉ ngơi, hoàn thiện nội bộ"]
};

function parseDate(iso) {
  const [y,m,d] = iso.split("-").map(Number);
  if (!y || !m || !d || y < 1800 || y > 2199) {
    throw new Error("Ngày ngoài phạm vi 1800–2199");
  }
  return { y,m,d };
}

function hourRange(hour) {
  if (hour === 0) return "23:00–00:59";
  return `${String(hour - 1).padStart(2,"0")}:00–${String(hour).padStart(2,"0")}:59`;
}

function goodHours(y,m,d) {
  const out = [];
  for (let hour = 0; hour < 24; hour += 2) {
    const lunarHour = SolarTime.fromYmdHms(y,m,d,hour,0,0).getLunarHour();
    const star = lunarHour.getTwelveStar();
    if (star.getEcliptic().getLuck().getName() === "吉") {
      const branches = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
      const branchRaw = branches[Math.floor((hour + 1) / 2) % 12];
      out.push({
        range:hourRange(hour),
        branch:branchVi(branchRaw),
        star:translateStar(star.getName()),
        source:"tyme4ts",
        evidenceLevel:"IMPLEMENTATION_CROSSCHECK"
      });
    }
  }
  return out.slice(0, 6);
}

function alignedWithVietnameseLunar(engineLunar, vn) {
  return Math.abs(engineLunar.getMonth()) === vn.month &&
    engineLunar.getDay() === vn.day &&
    engineLunar.getYear() === vn.year;
}

export function buildDayInfo(isoDate, profile = null) {
  const { y,m,d } = parseDate(isoDate);
  const solar = SolarDay.fromYmd(y,m,d);
  const engineLunar = solar.getLunarDay();
  const vnLunar = solarToVietnameseLunar(isoDate);
  const aligned = alignedWithVietnameseLunar(engineLunar, vnLunar);

  const bazi = getBaZi(isoDate, "12:00");
  const tymeDutyRaw = engineLunar.getDuty().getName();
  const dutyCalc = calculateTwelveDuty(bazi.branches.month, bazi.branches.day);
  const dutyRaw = dutyCalc.raw;
  const dutyEval = evaluateDuty(dutyRaw);
  const star = engineLunar.getTwelveStar();
  const eclipticGood = star.getEcliptic().getLuck().getName() === "吉";
  const rawRecommended = engineLunar.getRecommends().map(x => x.getName());
  const rawAvoid = engineLunar.getAvoids().map(x => x.getName());

  let recommended = aligned ? translateTaboos(rawRecommended) : [];
  let avoid = aligned ? translateTaboos(rawAvoid) : [];
  let recommendationOrigin = aligned ? "tyme4ts-crosscheck" : "duty-fallback";

  if (!recommended.length) {
    recommended = DUTY_FALLBACK[dutyRaw] || ["việc thường ngày"];
    recommendationOrigin = "duty-fallback";
  }
  if (!avoid.length) {
    avoid = ["không có kiêng kỵ nổi bật trong lớp quy tắc đang bật"];
  }

  const personal = personalizeDay(profile, bazi);
  const ranking = scoreDayBase({
    dutyBase:dutyEval.baseScore,
    eclipticGood,
    personalDelta:personal?.delta || 0
  });

  const ruleIds = [...dutyEval.ruleIds, ...(personal?.ruleIds || [])];
  const rules = ruleSummary(ruleIds);
  const crossChecks = crossCheckDay({
    date:isoDate,
    time:"12:00",
    vietnameseLunar:vnLunar,
    bazi,
    tymeAligned:aligned
  });
  crossChecks.push({
    id:"XCHK-DUTY-TYME4TS",
    provider:"tyme4ts",
    family:"6tail",
    scope:"twelve-duty",
    status:tymeDutyRaw === dutyRaw ? "agree" : "disputed",
    differences:tymeDutyRaw === dutyRaw ? [] : [{
      field:"duty",
      engine:dutyRaw,
      reference:tymeDutyRaw
    }],
    note:"12 Trực do engine tự tính; Tyme4TS chỉ dùng để cross-check."
  });
  const evidence = rules.map(r => r.evidence).filter(Boolean);
  const factConfidence = assessEvidence({
    evidence,
    crossChecks,
    experimental:false
  });

  return {
    date:isoDate,
    lunar:vnLunar,
    canChi:{ year:bazi.vi.year, month:bazi.vi.month, day:bazi.vi.day },
    solarTerm:bazi.solarTerm,
    baziBoundary:bazi.boundary,
    duty:translateDuty(dutyRaw),
    twelveStar:translateStar(star.getName()),
    ecliptic:eclipticGood ? "Hoàng đạo" : "Hắc đạo",
    verdict:classifyScore(ranking.score),
    ranking,
    recommended,
    avoid,
    recommendationOrigin,
    goodHours:goodHours(y,m,d),
    personal,
    provenance:{
      ruleIds,
      rules,
      crossChecks,
      baziCalculation:bazi.calculation,
      dutyCalculation:dutyCalc,
      implementationNotes:[
        "12 Trực do verified engine tự tính từ chi tháng tiết khí và chi ngày.",
        "Tyme4TS cung cấp nghi/kỵ, thần trực nhật và giờ hoàng/hắc đạo để cross-check.",
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
      calendar:crossChecks.some(x => x.scope === "lunar-calendar" && x.status === "disputed")
        ? "cần rà soát"
        : "cao cho engine Việt UTC+7",
      traditionalRules:factConfidence.code,
      personalization:personal ? "mixed-provenance-plus-heuristic-score" : "chưa bật",
      boundary:bazi.boundary.nearBoundary ? "near-solar-term-boundary" : "normal",
      note:factConfidence.code === "disputed"
        ? "Có bất đồng kỹ thuật trong cross-check; AI phải trình bày thận trọng."
        : bazi.boundary.nearBoundary
          ? "Gần ranh giới tiết khí; ca quan trọng cần xác minh thời điểm tiết khí chính xác."
          : aligned
            ? "Engine Việt và implementation cross-check trùng ngày âm ở ngày này."
            : "Có khác biệt với implementation lịch Trung Quốc; giữ kết quả UTC+7 và hạ mức tin cậy phần nghi/kỵ."
    },
    evidence:["vn-lunar-hnd","vn-archives-hiep-ky","xieji-benyuan","tyme4ts","lunar-javascript"],
    disclaimer:"Cát/hung là diễn giải theo hệ truyền thống, không phải dự đoán khoa học hay bảo đảm kết quả.",
    _ranking:ranking.score,
    _rawRecommended:rawRecommended,
    _rawAvoid:rawAvoid,
    _dutyRaw:dutyRaw
  };
}

export function publicDay(info) {
  const { _ranking, _rawRecommended, _rawAvoid, _dutyRaw, ...publicInfo } = info;
  return publicInfo;
}
