import { analyzeBirthProfile } from "./bazi-profile.js";
import { buildBrief } from "./brief.js";
import { rangeDays } from "./planner.js";
import {
  getNotificationSettings,
  markNotificationSent
} from "./notification-store.js";
import { runGemini } from "./gemini-cli.js";
import { sendTelegramText, telegramStatus } from "./telegram.js";

function localParts(now = new Date()) {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(now);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(now);
  return { date, time };
}

function profileFromSettings(settings) {
  return settings.profile?.birthDate
    ? analyzeBirthProfile(
        settings.profile.birthDate,
        settings.profile.birthTime || ""
      )
    : null;
}

function profilesFromSettings(settings) {
  return (Array.isArray(settings.profiles) ? settings.profiles : [])
    .filter(x => x?.birthDate)
    .slice(0,8)
    .map((item,index) => ({
      ...analyzeBirthProfile(item.birthDate,item.birthTime || ""),
      id:String(item.id || `member-${index + 1}`).slice(0,80),
      name:String(item.name || `Thành viên ${index + 1}`).slice(0,40)
    }));
}

function buildContext(settings, date) {
  const profile = profileFromSettings(settings);
  const profiles = profilesFromSettings(settings);
  const brief = buildBrief({
    date,
    profile,
    profiles,
    plans: settings.plans || []
  });

  const context = { date, selectedTopics: [], items: {} };

  if (settings.topics.overview) {
    context.selectedTopics.push("overview");
    context.items.overview = {
      verdict: brief.today.verdict.label,
      recommended: brief.today.recommended,
      avoid: brief.today.avoid,
      goodHours: brief.today.goodHours
    };
  }

  if (settings.topics.plans) {
    context.selectedTopics.push("plans");
    context.items.plans = brief.alerts;
  }

  if (settings.topics.upcoming) {
    context.selectedTopics.push("upcoming");
    const next = rangeDays({ from: date, days: 7, profile })
      .filter(x => x.date !== date && x.verdict.code === "good")
      .slice(0, 2)
      .map(x => ({
        date: x.date,
        verdict: x.verdict.label,
        recommended: x.recommended.slice(0, 2)
      }));
    context.items.upcoming = next;
  }

  if (settings.topics.personal) {
    context.selectedTopics.push("personal");
    context.items.personal = {
      activeProfile:brief.today.personal?.signals?.slice(0,2) || [],
      familyProfileCount:profiles.length
    };
  }

  return context;
}

async function writeShortTelegram(context) {
  const prompt = [
    "Bạn viết thông báo Telegram cho ứng dụng Lịch Việt AI.",
    "Chỉ dùng dữ liệu trong CONTEXT. Không tự tính thêm.",
    "Viết cực ngắn, dễ đọc trên điện thoại.",
    "Tối đa 60 từ và tối đa 4 dòng.",
    "Mỗi dòng chỉ 1 ý. Dùng từ phổ thông.",
    "Không nói mơ hồ hoặc cao siêu.",
    "Không dùng các từ kiểu: năng lượng, vận khí, cát khí, thiên thời, vũ trụ, khai mở.",
    "Không giảng lý thuyết. Không chào hỏi.",
    "Nếu một mục không có gì đáng chú ý thì bỏ mục đó.",
    "Nếu tất cả mục đều trống, viết: Hôm nay chưa có điểm nào cần chú ý.",
    "",
    "CONTEXT:",
    JSON.stringify(context),
    "",
    "Chỉ trả nội dung thông báo."
  ].join("\n");

  return runGemini(prompt, { timeoutMs: 60000 });
}

export async function sendDueTelegramNotification(now = new Date()) {
  const settings = await getNotificationSettings();
  const telegram = telegramStatus();
  const { date, time } = localParts(now);

  if (!settings.enabled) return { sent: false, reason: "disabled" };
  if (!telegram.enabled) return { sent: false, reason: "telegram-not-configured" };
  if (settings.lastSentDate === date) return { sent: false, reason: "already-sent" };
  if (time < settings.reminderTime) return { sent: false, reason: "not-due" };

  const context = buildContext(settings, date);
  const result = await writeShortTelegram(context);
  const delivery = await sendTelegramText(result.text, {
    title: "Lịch Việt · " + date
  });

  await markNotificationSent(date);

  return {
    sent: true,
    date,
    model: result.model,
    delivery,
    topics: context.selectedTopics
  };
}

export function startLocalNotificationScheduler() {
  const run = () => {
    sendDueTelegramNotification().catch(error => {
      console.error("[telegram-daily]", error.message);
    });
  };

  setTimeout(run, 5000);
  const timer = setInterval(run, 60 * 1000);
  timer.unref?.();
  return timer;
}
