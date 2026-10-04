import {
  $, api, escapeHtml, profilePayload, saveProfile, saveReminder, state, toast
} from "./core.js";
import { refreshBrief } from "./assistant-ui.js";
import { loadDay } from "./today.js";

function elementBars(elements) {
  return Object.values(elements).map(x =>
    '<div class="element-row"><span>' + escapeHtml(x.label) + '</span>' +
      '<div class="bar"><i style="width:' + x.pct + '%"></i></div>' +
      '<small>' + x.pct + '%</small></div>'
  ).join("");
}

export async function renderProfile() {
  if (!state.profile?.birthDate) {
    $("#profileResult").innerHTML =
      '<p class="note">Chưa có hồ sơ. App vẫn dùng được; hồ sơ chỉ thêm lớp Bát Tự cá nhân hóa.</p>';
    return;
  }

  $("#profileName").value = state.profile.name || "";
  $("#birthDate").value = state.profile.birthDate;
  $("#birthTime").value = state.profile.birthTime || "";

  const p = new URLSearchParams({ birth: state.profile.birthDate });
  if (state.profile.birthTime) p.set("birthTime", state.profile.birthTime);
  const d = await api("/api/profile?" + p.toString());

  $("#profileResult").innerHTML =
    '<div class="profile-summary">' +
      '<p><b>' + escapeHtml(state.profile.name || "Hồ sơ") + '</b> · Nhật chủ <strong>' +
      escapeHtml(d.dayMaster.name) + ' ' + escapeHtml(d.dayMaster.element) + '</strong> · ' +
      escapeHtml(d.strength.label) + '</p>' +
      '<div class="pillars">' +
      d.pillars.map((x, i) =>
        '<span class="pillar">' + ["Năm","Tháng","Ngày","Giờ"][i] +
        ' · ' + escapeHtml(x) + '</span>'
      ).join("") + '</div>' +
      '<details class="deep-profile"><summary>Phân tích sâu</summary>' +
        '<h3>Ngũ hành tương đối</h3>' + elementBars(d.elements) +
        '<h3>Thập thần trên Thiên Can</h3>' +
        '<div class="god-grid">' + d.tenGods.map(x =>
          '<span><b>' + escapeHtml(x.pillar) + '</b><small>' +
          escapeHtml(x.stem) + ' · ' + escapeHtml(x.relation) + '</small></span>'
        ).join("") + '</div>' +
        '<p class="note">' + escapeHtml(d.strength.warning) + '</p>' +
      '</details>' +
      '<p class="note">' + escapeHtml(d.note) + '</p>' +
    '</div>';
}

export async function saveProfileForm() {
  const birthDate = $("#birthDate").value;
  if (!birthDate) return toast("Hãy nhập ngày sinh.");

  saveProfile({
    name: $("#profileName").value.trim(),
    birthDate,
    birthTime: $("#birthTime").value || null
  });

  await renderProfile();
  await Promise.all([loadDay(), refreshBrief()]);
  toast("Đã lưu hồ sơ trên thiết bị.");
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export async function enableNotifications() {
  if (!("Notification" in window)) return toast("Trình duyệt không hỗ trợ thông báo.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return toast("Bạn chưa cho phép thông báo.");

  const reminderTime = $("#reminderTime").value || "07:30";
  saveReminder({ enabled: true, time: reminderTime });

  const config = await api("/api/push/config");
  const reg = await navigator.serviceWorker.ready;

  if (config.enabled && config.publicKey) {
    let subscription = await reg.pushManager.getSubscription();
    subscription ||= await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.publicKey)
    });

    await api("/api/push/subscribe", {
      method: "POST",
      body: {
        subscription,
        profile: profilePayload(),
        plans: state.plans,
        reminderTime
      }
    });

    $("#reminderNote").textContent =
      "Đã bật server push. Scheduler có thể gửi thông báo ngay cả khi app đang đóng.";
  } else {
    if ("periodicSync" in reg) {
      try {
        await reg.periodicSync.register("daily-brief", {
          minInterval: 12 * 60 * 60 * 1000
        });
      } catch {}
    }
    $("#reminderNote").textContent =
      "Server chưa cấu hình VAPID; đang dùng fallback PWA. Khi deploy chỉ cần cấu hình VAPID + cron.";
  }

  toast("Đã bật thông báo.");
}
