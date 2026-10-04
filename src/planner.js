import { buildDayInfo, publicDay } from "./traditional.js";

export const ACTIVITIES = {
  contract: {
    label: "Ký hợp đồng / giao dịch",
    positive: ["交易","立券","纳财","开市"],
    duties: ["成","开","定"]
  },
  wedding: {
    label: "Cưới hỏi / đính hôn",
    positive: ["嫁娶","订婚","纳采","订盟"],
    duties: ["成","定"]
  },
  move: {
    label: "Chuyển nhà / nhập trạch",
    positive: ["入宅","移徙","安床"],
    duties: ["成","开","定"]
  },
  opening: {
    label: "Khai trương",
    positive: ["开市","交易","挂匾","纳财"],
    duties: ["开","成","满"]
  },
  travel: {
    label: "Xuất hành",
    positive: ["出行","赴任"],
    duties: ["开","成"]
  },
  build: {
    label: "Sửa nhà / động thổ",
    positive: ["动土","修造","起基","上梁"],
    duties: ["成","定","开"]
  },
  medical: {
    label: "Khám chữa bệnh",
    positive: ["求医","治病"],
    duties: ["除","开"]
  },
  meeting: {
    label: "Gặp gỡ / trao đổi",
    positive: ["会亲友","会友","见贵"],
    duties: ["满","成","开"]
  }
};

function addDays(iso, n) {
  const d = new Date(`${iso}T12:00:00+07:00`);
  d.setUTCDate(d.getUTCDate() + n);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(d);
}

function activityScore(day, activity) {
  const cfg = ACTIVITIES[activity];
  let score = day._ranking;
  const reasons = [];

  const recommendedHit = cfg.positive.find(x => day._rawRecommended.includes(x));
  const avoidHit = cfg.positive.find(x => day._rawAvoid.includes(x));

  if (recommendedHit) {
    score += 28;
    reasons.push("Việc này nằm trong nhóm “nên” của ngày.");
  }
  if (avoidHit) {
    score -= 40;
    reasons.push("Việc này nằm trong nhóm “nên tránh” của ngày.");
  }
  if (cfg.duties.includes(Object.entries({
    "Kiến":"建","Trừ":"除","Mãn":"满","Bình":"平","Định":"定","Chấp":"执",
    "Phá":"破","Nguy":"危","Thành":"成","Thu":"收","Khai":"开","Bế":"闭"
  }).find(([vi]) => vi === day.duty)?.[1])) {
    score += 7;
    reasons.push(`Trực ${day.duty} phù hợp tương đối với loại việc này.`);
  }
  if (day.personal?.type === "clash") reasons.push("Ngày xung trực tiếp với chi năm sinh đã lưu.");
  if (day.personal?.type === "harmony") reasons.push("Ngày lục hợp với chi năm sinh đã lưu.");
  if (!reasons.length) reasons.push("Không có tín hiệu mạnh; xếp hạng chủ yếu theo tính chất chung của ngày.");

  return { score, reasons };
}

export function rankDays({ from, days = 14, activity = "contract", profile = null }) {
  if (!ACTIVITIES[activity]) throw new Error("Loại việc không hợp lệ");
  const count = Math.max(1, Math.min(Number(days) || 14, 60));
  const ranked = [];

  for (let i = 0; i < count; i += 1) {
    const date = addDays(from, i);
    const day = buildDayInfo(date, profile);
    const { score, reasons } = activityScore(day, activity);
    ranked.push({
      ...publicDay(day),
      match: score >= 78 ? "Ưu tiên" : score >= 62 ? "Có thể cân nhắc" : "Không ưu tiên",
      reasons,
      _score: score
    });
  }

  return ranked
    .sort((a,b) => b._score - a._score || a.date.localeCompare(b.date))
    .slice(0, 5)
    .map(({ _score, ...x }) => x);
}

export function rangeDays({ from, days = 7, profile = null }) {
  const count = Math.max(1, Math.min(Number(days) || 7, 31));
  return Array.from({ length: count }, (_, i) =>
    publicDay(buildDayInfo(addDays(from, i), profile))
  );
}
