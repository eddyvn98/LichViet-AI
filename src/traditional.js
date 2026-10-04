import { SolarDay, SolarTime } from "tyme4ts";
import { getBaZi } from "./bazi.js";
import { personalizeDay } from "./personal-v2.js";
import { evaluateDuty, ruleSummary } from "./rule-engine.js";
import { branchVi, translateDuty, translateStar, translateTaboos } from "./i18n.js";
import { solarToVietnameseLunar } from "./vietnamese-lunar.js";

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

function verdict(score) {
  if (score >= 70) return { code:"good", label:"Khá thuận" };
  if (score >= 54) return { code:"normal", label:"Bình thường" };
  return { code:"careful", label:"Nên thận trọng" };
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
      out.push({ range:hourRange(hour), branch:branchVi(branchRaw), star:translateStar(star.getName()) });
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

  const dutyRaw = engineLunar.getDuty().getName();
  const dutyEval = evaluateDuty(dutyRaw);
  const star = engineLunar.getTwelveStar();
  const eclipticGood = star.getEcliptic().getLuck().getName() === "吉";
  const rawRecommended = engineLunar.getRecommends().map(x => x.getName());
  const rawAvoid = engineLunar.getAvoids().map(x => x.getName());

  let recommended = aligned ? translateTaboos(rawRecommended) : [];
  let avoid = aligned ? translateTaboos(rawAvoid) : [];
  if (!recommended.length) recommended = DUTY_FALLBACK[dutyRaw] || ["việc thường ngày"];
  if (!avoid.length) avoid = ["không có kiêng kỵ nổi bật trong lớp quy tắc đang bật"];

  const bazi = getBaZi(isoDate, "12:00");
  const personal = personalizeDay(profile, bazi);

  let score = 55 + dutyEval.score + (eclipticGood ? 6 : -5);
  if (personal) score += personal.delta;

  const ruleIds = [...dutyEval.ruleIds, ...(personal?.ruleIds || [])];

  return {
    date:isoDate,
    lunar:vnLunar,
    canChi:{ year:bazi.vi.year, month:bazi.vi.month, day:bazi.vi.day },
    solarTerm:bazi.solarTerm,
    duty:translateDuty(dutyRaw),
    twelveStar:translateStar(star.getName()),
    ecliptic:eclipticGood ? "Hoàng đạo" : "Hắc đạo",
    verdict:verdict(score),
    recommended,
    avoid,
    goodHours:goodHours(y,m,d),
    personal,
    provenance:{
      ruleIds,
      rules:ruleSummary(ruleIds),
      implementation:"Tyme4TS 1.5.3 được dùng để cross-check nghi/kỵ và thần trực nhật."
    },
    confidence:{
      calendar:"cao",
      traditionalRules:aligned ? "tham khảo có provenance" : "cần rà soát",
      personalization:personal ? "theo mô hình Bát Tự V2" : "chưa bật",
      note:aligned
        ? "Âm lịch Việt UTC+7 và lịch nội bộ engine trùng ngày/tháng ở ngày này."
        : "Âm lịch Việt UTC+7 khác lịch nội bộ engine; app tự hạ mức tin cậy nghi/kỵ."
    },
    evidence:["vn-lunar-hnd","vn-archives-hiep-ky","xieji","tyme4ts"],
    disclaimer:"Cát/hung là diễn giải theo hệ truyền thống, không phải dự đoán khoa học hay bảo đảm kết quả.",
    _ranking:score,
    _rawRecommended:rawRecommended,
    _rawAvoid:rawAvoid,
    _dutyRaw:dutyRaw
  };
}

export function publicDay(info) {
  const { _ranking, _rawRecommended, _rawAvoid, _dutyRaw, ...publicInfo } = info;
  return publicInfo;
}
