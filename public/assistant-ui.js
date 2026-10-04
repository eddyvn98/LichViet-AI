import {
  $, $, api, escapeHtml, familyPayload, profilePayload, savePlans,
  state, todayVN, toast
} from "./core.js";
import { syncNotificationSettingsIfEnabled } from "./notification-ui.js";

function planLabel(plan) {
  return state.meta.activities.find(x => x.id === plan.activity)?.label || plan.activity;
}

export function renderPlans() {
  const el = $("#savedPlans");
  if (!state.plans.length) {
    el.innerHTML =
      '<p class="note">Chưa có kế hoạch. Thêm một việc để trợ lý tự theo dõi ngày phù hợp.</p>';
    return;
  }

  el.innerHTML = state.plans.map(p => {
    const names = (p.participantIds || [])
      .map(id => state.family.find(x => x.id === id)?.name)
      .filter(Boolean);
    return '<article class="saved-plan">' +
      '<div><b>' + escapeHtml(p.title || planLabel(p)) + '</b>' +
      '<small>' + escapeHtml(planLabel(p)) + ' · ' + p.from + ' → ' + p.to +
      (names.length ? ' · ' + escapeHtml(names.join(", ")) : '') + '</small></div>' +
      '<button class="icon-btn" data-remove="' + p.id + '" aria-label="Xóa kế hoạch">×</button>' +
    '</article>';
  }).join("");

  $$("[data-remove]").forEach(b => {
    b.onclick = () => {
      savePlans(state.plans.filter(p => p.id !== b.dataset.remove));
      renderPlans();
      refreshBrief();
      syncNotificationSettingsIfEnabled();
    };
  });
}

export async function addPlan() {
  const title = $("#intentTitle").value.trim();
  const activity = $("#intentActivity").value;
  const from = $("#intentFrom").value;
  const to = $("#intentTo").value;

  if (!from || !to || to < from) return toast("Khoảng ngày chưa hợp lệ.");

  const plan = {
    id: crypto.randomUUID(),
    title,
    activity,
    from,
    to,
    participantIds:state.selectedFamilyIds.slice(0,8),
    createdAt: new Date().toISOString()
  };

  savePlans([...state.plans, plan]);
  $("#intentTitle").value = "";
  renderPlans();
  await refreshBrief();
  await syncNotificationSettingsIfEnabled();
  toast("Đã thêm kế hoạch.");
}

export async function refreshBrief() {
  $("#briefLoading").hidden = false;
  try {
    const brief = await api("/api/brief", {
      method: "POST",
      body: {
        date: todayVN(),
        profile: profilePayload(),
        profiles: familyPayload(false),
        plans: state.plans
      }
    });

    $("#briefHeadline").textContent = brief.headline;
    $("#briefToday").innerHTML =
      '<b>' + escapeHtml(brief.today.verdict.label) + '</b>' +
      '<span>Nên: ' + escapeHtml(brief.today.recommended.join(", ")) + '</span>' +
      '<span>Tránh: ' + escapeHtml(brief.today.avoid.join(", ")) + '</span>';

    $("#briefAlerts").innerHTML = brief.alerts.length
      ? brief.alerts.map(a =>
          '<article class="alert-card ' + a.urgency + '">' +
            '<div><b>' + escapeHtml(a.title) + '</b><small>' + a.date + '</small></div>' +
            '<p>' + escapeHtml(a.message) + '</p>' +
            '<small>' + escapeHtml(a.reasons[0] || "") + '</small>' +
          '</article>'
        ).join("")
      : '<p class="note">Chưa có mốc kế hoạch đáng nhắc trong 7 ngày tới.</p>';
  } catch (e) {
    $("#briefHeadline").textContent = e.message;
  } finally {
    $("#briefLoading").hidden = true;
  }
}
