import {
  $, api, profilePayload, state, toast
} from "./core.js";

function readTopics() {
  return {
    overview: $("#notifyOverview").checked,
    plans: $("#notifyPlans").checked,
    upcoming: $("#notifyUpcoming").checked,
    personal: $("#notifyPersonal").checked
  };
}

function anyTopic(topics) {
  return Object.values(topics).some(Boolean);
}

export async function loadNotificationSettings() {
  const [settings, telegram] = await Promise.all([
    api("/api/notifications/settings"),
    api("/api/telegram/status")
  ]);

  $("#reminderTime").value = settings.reminderTime || "07:30";
  $("#notifyOverview").checked = Boolean(settings.topics?.overview);
  $("#notifyPlans").checked = Boolean(settings.topics?.plans);
  $("#notifyUpcoming").checked = Boolean(settings.topics?.upcoming);
  $("#notifyPersonal").checked = Boolean(settings.topics?.personal);

  $("#telegramStatus").textContent = telegram.enabled
    ? "Telegram đã kết nối. App sẽ gửi đúng giờ đã chọn khi máy đang chạy."
    : "Telegram chưa cấu hình bot token/chat ID trên máy Windows.";

  $("#reminderNote").textContent = settings.enabled
    ? "Thông báo hằng ngày đang bật."
    : "Chưa bật thông báo hằng ngày.";
}

export async function saveNotificationPreferences() {
  const topics = readTopics();
  if (!anyTopic(topics)) {
    return toast("Hãy chọn ít nhất một nội dung muốn nhận.");
  }

  const payload = {
    enabled: true,
    reminderTime: $("#reminderTime").value || "07:30",
    topics,
    profile: profilePayload(),
    plans: state.plans
  };

  const saved = await api("/api/notifications/settings", {
    method: "POST",
    body: payload
  });

  $("#reminderNote").textContent =
    "Đã lưu. Telegram sẽ chỉ gửi các mục bạn đã chọn.";
  toast("Đã lưu thông báo hằng ngày.");
  return saved;
}

export async function syncNotificationSettingsIfEnabled() {
  try {
    const current = await api("/api/notifications/settings");
    if (!current.enabled) return;

    await api("/api/notifications/settings", {
      method: "POST",
      body: {
        enabled: true,
        reminderTime: current.reminderTime,
        topics: current.topics,
        profile: profilePayload(),
        plans: state.plans
      }
    });
  } catch {
    // Sync is best-effort. Main app flow must not fail because of Telegram settings.
  }
}
