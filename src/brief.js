import { rankDays, ACTIVITIES } from "./planner.js";
import { buildDayInfo, publicDay } from "./traditional.js";

function addDays(iso, n) {
  const d = new Date(`${iso}T12:00:00+07:00`);
  d.setUTCDate(d.getUTCDate() + n);
  return new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Ho_Chi_Minh" }).format(d);
}

function inRange(date, from, to) {
  return date >= from && date <= to;
}

export function buildBrief({ date, profile = null, plans = [] }) {
  const today = publicDay(buildDayInfo(date, profile));
  const alerts = [];

  for (const plan of plans.slice(0, 20)) {
    if (!plan?.activity || !ACTIVITIES[plan.activity]) continue;
    const from = plan.from && plan.from > date ? plan.from : date;
    const to = plan.to || addDays(from, 30);
    const days = Math.min(60, Math.max(1,
      Math.floor((Date.parse(to+"T12:00:00+07:00") - Date.parse(from+"T12:00:00+07:00")) / 86400000) + 1
    ));
    const best = rankDays({ from, days, activity:plan.activity, profile })[0];
    if (!best || !inRange(best.date, from, to)) continue;

    const distance = Math.round(
      (Date.parse(best.date+"T12:00:00+07:00") - Date.parse(date+"T12:00:00+07:00")) / 86400000
    );

    if (distance <= 7) {
      alerts.push({
        planId:plan.id || null,
        title:plan.title || ACTIVITIES[plan.activity].label,
        activity:plan.activity,
        date:best.date,
        urgency:distance <= 1 ? "high" : distance <= 3 ? "medium" : "normal",
        message:distance === 0
          ? "Hôm nay là lựa chọn ưu tiên trong khoảng bạn đã lưu."
          : distance === 1
            ? "Ngày mai là một lựa chọn ưu tiên trong kế hoạch của bạn."
            : `${distance} ngày nữa có một ngày đáng ưu tiên cho kế hoạch này.`,
        reasons:best.reasons.slice(0,2)
      });
    }
  }

  const headline = alerts.find(x => x.urgency === "high")?.message ||
    (today.verdict.code === "good"
      ? "Hôm nay tương đối thuận cho các việc phù hợp."
      : today.verdict.code === "careful"
        ? "Hôm nay nên ưu tiên việc quen thuộc và tránh quyết định lớn nếu không cần gấp."
        : "Hôm nay ở mức trung tính; xem loại việc cụ thể trước khi chọn thời điểm.");

  return {
    date,
    headline,
    today:{
      verdict:today.verdict,
      recommended:today.recommended.slice(0,2),
      avoid:today.avoid.slice(0,1),
      goodHours:today.goodHours.slice(0,2),
      personal:today.personal
    },
    alerts:alerts.sort((a,b) => a.date.localeCompare(b.date)).slice(0,5),
    generatedBy:"deterministic-brief-v2",
    aiPolicy:"AI may rephrase this payload but must not invent calendar facts."
  };
}
