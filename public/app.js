import { $, $$, api, setMeta, state, todayVN } from "./core.js";
import { askGemini } from "./ai-ui.js";
import { loadNotificationSettings, saveNotificationPreferences } from "./notification-ui.js";
import { addPlan, refreshBrief, renderPlans } from "./assistant-ui.js";
import { findDays } from "./planner-ui.js";
import {
  newFamilyMemberForm, renderProfile, saveProfileForm
} from "./profile-ui.js";
import { loadDay } from "./today.js";

function setupTabs() {
  $$(".tab").forEach(btn => {
    btn.onclick = () => {
      $$(".tab").forEach(x => x.classList.toggle("active", x === btn));
      $$(".tabpanel").forEach(x => {
        x.hidden = x.id !== btn.dataset.tab;
      });
      if (btn.dataset.tab === "assistant") refreshBrief();
    };
  });
}

function addDays(iso, days) {
  const d = new Date(iso + "T12:00:00+07:00");
  d.setUTCDate(d.getUTCDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(d);
}

async function init() {
  setupTabs();

  const today = todayVN();
  $("#date").value = today;
  $("#planFrom").value = today;
  $("#intentFrom").value = today;
  $("#intentTo").value = addDays(today, 30);

  setMeta(await api("/api/meta"));

  const options = state.meta.activities
    .map(x => '<option value="' + x.id + '">' + x.label + '</option>')
    .join("");
  $("#activity").innerHTML = options;
  $("#intentActivity").innerHTML = options;

  $("#todayBtn").onclick = () => {
    $("#date").value = todayVN();
    loadDay();
  };
  $("#date").onchange = loadDay;
  $("#findDays").onclick = findDays;
  $("#addPlan").onclick = addPlan;
  $("#refreshBrief").onclick = refreshBrief;
  $("#saveProfile").onclick = saveProfileForm;
  $("#newFamilyMember").onclick = newFamilyMemberForm;
  $("#enableReminder").onclick = saveNotificationPreferences;
  $("#askGemini").onclick = askGemini;

  if (state.reminder?.time) {
    $("#reminderTime").value = state.reminder.time;
  }

  if ("serviceWorker" in navigator) {
    await navigator.serviceWorker.register("/sw.js");
  }

  renderPlans();
  await Promise.all([
    renderProfile(),
    loadDay(),
    refreshBrief(),
    loadNotificationSettings()
  ]);
}

init().catch(e => {
  console.error(e);
  const el = $("#toast");
  el.textContent = e.message;
  el.hidden = false;
});
