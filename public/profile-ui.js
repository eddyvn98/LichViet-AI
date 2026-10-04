import {
  $, $$, api, escapeHtml, familyPayload, profilePayload, removeFamilyMember,
  saveProfile, saveReminder, setActiveFamilyMember, setSelectedFamilyIds,
  startNewFamilyMember, state, toast
} from "./core.js";
import { refreshBrief } from "./assistant-ui.js";
import { syncNotificationSettingsIfEnabled } from "./notification-ui.js";
import { loadDay } from "./today.js";

function elementBars(elements) {
  return Object.values(elements || {}).map(x =>
    '<div class="element-row"><span>' + escapeHtml(x.label) + '</span>' +
      '<div class="bar"><i style="width:' + x.pct + '%"></i></div>' +
      '<small>' + x.pct + '%</small></div>'
  ).join("");
}

export function renderFamilyMembers() {
  const el = $("#familyMembers");
  if (!el) return;

  if (!state.family.length) {
    el.innerHTML =
      '<p class="note">Chưa có thành viên. Thêm hồ sơ đầu tiên bên dưới.</p>';
    return;
  }

  el.innerHTML = state.family.map(member => {
    const selected = state.selectedFamilyIds.includes(member.id);
    const active = state.activeFamilyId === member.id;
    return '<article class="saved-plan family-member' +
      (active ? ' active-family' : '') + '">' +
      '<label class="family-select">' +
        '<input type="checkbox" data-family-select="' +
        escapeHtml(member.id) + '"' + (selected ? ' checked' : '') + '>' +
        '<span><b>' + escapeHtml(member.name || "Thành viên") + '</b>' +
        '<small>' + escapeHtml(member.birthDate) +
        (member.birthTime ? ' · ' + escapeHtml(member.birthTime) : ' · chưa có giờ sinh') +
        '</small></span></label>' +
      '<div class="family-actions">' +
        '<button class="ghost compact" data-family-edit="' +
        escapeHtml(member.id) + '">Sửa</button>' +
        '<button class="icon-btn" data-family-remove="' +
        escapeHtml(member.id) + '" aria-label="Xóa thành viên">×</button>' +
      '</div>' +
    '</article>';
  }).join("");

  $$("[data-family-select]").forEach(input => {
    input.onchange = () => {
      const selected = $$("[data-family-select]")
        .filter(x => x.checked)
        .map(x => x.dataset.familySelect);
      setSelectedFamilyIds(selected);
      $("#familySelectionNote").textContent =
        selected.length
          ? `Đang xét ${selected.length} thành viên khi chọn ngày.`
          : "Chưa chọn thành viên; planner sẽ dùng rule chung.";
    };
  });

  $$("[data-family-edit]").forEach(button => {
    button.onclick = async () => {
      setActiveFamilyMember(button.dataset.familyEdit);
      await renderProfile();
    };
  });

  $$("[data-family-remove]").forEach(button => {
    button.onclick = async () => {
      removeFamilyMember(button.dataset.familyRemove);
      await renderProfile();
      await Promise.all([loadDay(), refreshBrief()]);
      await syncNotificationSettingsIfEnabled();
      toast("Đã xóa thành viên.");
    };
  });

  $("#familySelectionNote").textContent = state.selectedFamilyIds.length
    ? `Đang xét ${state.selectedFamilyIds.length} thành viên khi chọn ngày.`
    : "Chưa chọn thành viên; planner sẽ dùng rule chung.";
}

export function newFamilyMemberForm() {
  if (state.family.length >= 8) return toast("Tối đa 8 thành viên.");
  startNewFamilyMember();
  $("#profileName").value = "";
  $("#birthDate").value = "";
  $("#birthTime").value = "";
  $("#profileResult").innerHTML =
    '<p class="note">Nhập thông tin thành viên mới. Không biết giờ sinh thì để trống.</p>';
  renderFamilyMembers();
}

export async function renderFeedbackHistory() {
  const el = $("#feedbackHistory");
  if (!el) return;
  try {
    const data = await api("/api/feedback?limit=10");
    el.innerHTML = data.items?.length
      ? data.items.map(item =>
          '<article class="saved-plan">' +
            '<div><b>' +
              (item.feedback === "review" ? "⚑ Cần rà" : "✓ Hợp lý") +
            '</b><small>' + escapeHtml(item.date) +
              (item.activity ? ' · ' + escapeHtml(item.activity) : '') +
              ' · ' + escapeHtml((item.traceHash || "").slice(0,12)) +
            '</small></div>' +
            '<span class="badge">' + escapeHtml(item.engine || "") + '</span>' +
          '</article>'
        ).join("")
      : '<p class="note">Chưa có kết quả nào được đánh dấu.</p>';
  } catch (e) {
    el.innerHTML = '<p class="note">' + escapeHtml(e.message) + '</p>';
  }
}

export async function renderProfile() {
  renderFamilyMembers();
  renderFeedbackHistory();
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

  const dayMasterText = d.dayMaster
    ? 'Nhật chủ <strong>' + escapeHtml(d.dayMaster.name) + ' ' +
      escapeHtml(d.dayMaster.element) + '</strong>'
    : 'Nhật chủ chưa thể chốt';
  const strengthText = d.strength?.label
    ? ' · ' + escapeHtml(d.strength.label)
    : '';
  const deepAnalysis = d.advancedAnalysisAvailable === false
    ? '<div class="note"><b>Phân tích sâu tạm ẩn.</b> Cần giờ sinh để xác định chính xác trụ trước/sau ranh giới tiết khí.</div>'
    : '<details class="deep-profile"><summary>Phân tích sâu</summary>' +
        '<h3>Ngũ hành tương đối</h3>' + elementBars(d.elements) +
        '<h3>Thập thần trên Thiên Can</h3>' +
        '<div class="god-grid">' + (d.tenGods || []).map(x =>
          '<span><b>' + escapeHtml(x.pillar) + '</b><small>' +
          escapeHtml(x.stem) + ' · ' + escapeHtml(x.relation) + '</small></span>'
        ).join("") + '</div>' +
        '<p class="note">' + escapeHtml(d.strength?.warning || "") + '</p>' +
      '</details>';

  $("#profileResult").innerHTML =
    '<div class="profile-summary">' +
      '<p><b>' + escapeHtml(state.profile.name || "Hồ sơ") + '</b> · ' +
      dayMasterText + strengthText + '</p>' +
      '<div class="pillars">' +
      d.pillars.map((x, i) =>
        '<span class="pillar">' + ["Năm","Tháng","Ngày","Giờ"][i] +
        ' · ' + escapeHtml(x) + '</span>'
      ).join("") + '</div>' +
      deepAnalysis +
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

  renderFamilyMembers();
  await renderProfile();
  await Promise.all([loadDay(), refreshBrief()]);
  await syncNotificationSettingsIfEnabled();
  toast("Đã lưu thành viên trên thiết bị.");
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
        profiles:familyPayload(false),
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
