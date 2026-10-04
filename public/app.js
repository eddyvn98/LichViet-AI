const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const PROFILE_KEY = "lichviet.profile.v1";
const REMINDER_KEY = "lichviet.reminder.v1";

const state = {
  meta: null,
  profile: JSON.parse(localStorage.getItem(PROFILE_KEY) || "null")
};

function todayVN() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

function queryProfile() {
  if (!state.profile?.birthDate) return "";
  const p = new URLSearchParams({ birth: state.profile.birthDate });
  if (state.profile.birthTime) p.set("birthTime", state.profile.birthTime);
  return "&" + p.toString();
}

async function api(path) {
  const r = await fetch(path);
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Không tải được dữ liệu");
  return data;
}

function vnDate(iso, options = {}) {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", ...options
  }).format(new Date(iso + "T12:00:00+07:00"));
}

function shortDay(iso) {
  return new Intl.DateTimeFormat("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })
    .format(new Date(iso + "T12:00:00+07:00"));
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message; el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, 2600);
}

function renderItems(el, items) {
  el.innerHTML = items.map(x => `<div class="item">${escapeHtml(x)}</div>`).join("");
}

function escapeHtml(s = "") {
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
}

function verdictColor(code) {
  return code === "good" ? "#55745e" : code === "careful" ? "#9d625c" : "#aa884e";
}

async function loadDay() {
  const date = $("#date").value;
  $("#dayLoading").hidden = false; $("#dayContent").hidden = true;
  try {
    const d = await api(`/api/day?date=${date}${queryProfile()}`);
    $("#weekday").textContent = vnDate(d.date);
    $("#verdict").textContent = d.verdict.label;
    $("#statusDot").style.background = verdictColor(d.verdict.code);
    $("#summaryMeta").textContent =
      `Âm ${d.lunar.day}/${d.lunar.month}${d.lunar.leap ? " nhuận" : ""} · ` +
      `ngày ${d.canChi.day} · ${d.solarTerm} · Trực ${d.duty}`;
    renderItems($("#recommended"), d.recommended);
    renderItems($("#avoid"), d.avoid);
    $("#goodHours").innerHTML = d.goodHours.map(h =>
      `<div class="hour-chip"><b>${h.range}</b><small>${h.branch} · ${h.star}</small></div>`
    ).join("");
    $("#traditionalLine").innerHTML =
      `<b>Hệ truyền thống:</b> Trực ${escapeHtml(d.duty)} · ${escapeHtml(d.twelveStar)} · ${escapeHtml(d.ecliptic)}.`;
    $("#personalLine").innerHTML = d.personal
      ? `<b>Cá nhân:</b> ${escapeHtml(d.personal.label)} — ${escapeHtml(d.personal.detail)}`
      : "<b>Cá nhân:</b> chưa có hồ sơ ngày sinh; kết quả hiện là mức chung.";
    $("#confidenceLine").innerHTML =
      `<b>Độ tin cậy:</b> lịch ${d.confidence.calendar}; quy tắc chọn ngày: ${escapeHtml(d.confidence.traditionalRules)}.`;
    $("#disclaimer").textContent = d.disclaimer;
    renderInlineGlossary();
    $("#dayLoading").hidden = true; $("#dayContent").hidden = false;
    await loadWeek(date);
    await maybeNotify(d);
  } catch (e) {
    $("#dayLoading").textContent = e.message;
  }
}

async function loadWeek(from) {
  const data = await api(`/api/range?from=${from}&days=7${queryProfile()}`);
  $("#week").innerHTML = data.days.map(d =>
    `<button class="week-day ${d.verdict.code}" data-date="${d.date}">
      <b>${escapeHtml(shortDay(d.date).split(",")[0])}</b>
      <small>${d.date.slice(8,10)}/${d.date.slice(5,7)}</small>
      <small>${escapeHtml(d.verdict.label)}</small>
    </button>`
  ).join("");
  $$(".week-day").forEach(b => b.onclick = () => {
    $("#date").value = b.dataset.date; loadDay();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function renderInlineGlossary() {
  const wanted = ["12 Trực","Hoàng đạo / Hắc đạo","Xung tuổi","Tiết khí"];
  $("#glossaryInline").innerHTML = state.meta.glossary.filter(x => wanted.includes(x.term))
    .map(x => `<div class="glossary-pill"><b>${escapeHtml(x.term)}</b><small>${escapeHtml(x.definition)}</small></div>`)
    .join("");
}

async function findDays() {
  $("#planLoading").hidden = false; $("#planResults").innerHTML = "";
  const p = new URLSearchParams({
    activity: $("#activity").value,
    from: $("#planFrom").value,
    days: $("#planDays").value
  });
  if (state.profile?.birthDate) {
    p.set("birth", state.profile.birthDate);
    if (state.profile.birthTime) p.set("birthTime", state.profile.birthTime);
  }
  try {
    const data = await api("/api/plan?" + p);
    $("#planResults").innerHTML = data.results.map((d, i) =>
      `<article class="plan-card">
        <div class="plan-date"><b>#${i + 1}</b><small>${escapeHtml(shortDay(d.date))}</small></div>
        <div><h3>${escapeHtml(d.verdict.label)} · ngày ${escapeHtml(d.canChi.day)}</h3>
        <p>${escapeHtml(d.reasons[0])}</p>
        <p>Trực ${escapeHtml(d.duty)} · ${escapeHtml(d.ecliptic)}${d.personal ? " · " + escapeHtml(d.personal.label) : ""}</p></div>
        <span class="badge">${escapeHtml(d.match)}</span>
      </article>`
    ).join("");
  } catch (e) {
    $("#planResults").innerHTML = `<p class="note">${escapeHtml(e.message)}</p>`;
  } finally { $("#planLoading").hidden = true; }
}

async function saveProfile() {
  const birthDate = $("#birthDate").value;
  if (!birthDate) return toast("Hãy nhập ngày sinh.");
  state.profile = {
    name: $("#profileName").value.trim(),
    birthDate,
    birthTime: $("#birthTime").value || null
  };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(state.profile));
  await renderProfile();
  toast("Đã lưu hồ sơ trên thiết bị này.");
  loadDay();
}

async function renderProfile() {
  if (!state.profile?.birthDate) {
    $("#profileResult").innerHTML = '<p class="note">Chưa có hồ sơ. Có thể dùng app ngay; hồ sơ chỉ giúp thêm lớp xung/hợp cơ bản.</p>';
    return;
  }
  $("#profileName").value = state.profile.name || "";
  $("#birthDate").value = state.profile.birthDate;
  $("#birthTime").value = state.profile.birthTime || "";
  const p = new URLSearchParams({ birth: state.profile.birthDate });
  if (state.profile.birthTime) p.set("birthTime", state.profile.birthTime);
  const data = await api("/api/profile?" + p);
  $("#profileResult").innerHTML =
    `<p><b>${escapeHtml(state.profile.name || "Hồ sơ")}</b> · chi năm sinh ${escapeHtml(data.yearBranchVi)}</p>
     <div class="pillars">${data.pillars.map((x, i) =>
       `<span class="pillar">${["Năm","Tháng","Ngày","Giờ"][i]} · ${escapeHtml(x)}</span>`
     ).join("")}</div><p class="note">${escapeHtml(data.note)}</p>`;
}

function setupTabs() {
  $$(".tab").forEach(btn => btn.onclick = () => {
    $$(".tab").forEach(x => x.classList.toggle("active", x === btn));
    $$(".tabpanel").forEach(x => x.hidden = x.id !== btn.dataset.tab);
  });
}

async function enableReminder() {
  if (!("Notification" in window)) return toast("Trình duyệt này không hỗ trợ thông báo.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return toast("Bạn chưa cho phép thông báo.");
  const reminder = { enabled: true, time: $("#reminderTime").value || "07:30", last: null };
  localStorage.setItem(REMINDER_KEY, JSON.stringify(reminder));
  $("#reminderNote").textContent = `Đã bật nhắc lúc ${reminder.time}. V1 ưu tiên thông báo khi app/PWA có cơ hội chạy.`;
  await registerPeriodicSync();
  toast("Đã bật nhắc hằng ngày.");
}

async function maybeNotify(dayData) {
  const r = JSON.parse(localStorage.getItem(REMINDER_KEY) || "null");
  if (!r?.enabled || Notification.permission !== "granted") return;
  const now = new Date();
  const localDate = todayVN();
  const hm = new Intl.DateTimeFormat("en-GB", {
    timeZone:"Asia/Ho_Chi_Minh", hour:"2-digit", minute:"2-digit", hour12:false
  }).format(now);
  if (hm < r.time || r.last === localDate || dayData.date !== localDate) return;
  const registration = await navigator.serviceWorker?.ready;
  if (!registration) return;
  await registration.showNotification(`Hôm nay: ${dayData.verdict.label}`, {
    body: `Nên: ${dayData.recommended.slice(0,2).join(", ")}. Tránh: ${dayData.avoid[0]}.`,
    icon: "/icon.svg", badge: "/icon.svg", tag: "daily-brief"
  });
  r.last = localDate;
  localStorage.setItem(REMINDER_KEY, JSON.stringify(r));
}

async function registerPeriodicSync() {
  try {
    const reg = await navigator.serviceWorker.ready;
    if ("periodicSync" in reg) {
      await reg.periodicSync.register("daily-brief", { minInterval: 12 * 60 * 60 * 1000 });
    }
  } catch {}
}

async function init() {
  setupTabs();
  $("#date").value = todayVN(); $("#planFrom").value = todayVN();
  state.meta = await api("/api/meta");
  $("#activity").innerHTML = state.meta.activities
    .map(x => `<option value="${x.id}">${escapeHtml(x.label)}</option>`).join("");
  $("#todayBtn").onclick = () => { $("#date").value = todayVN(); loadDay(); };
  $("#date").onchange = loadDay;
  $("#findDays").onclick = findDays;
  $("#saveProfile").onclick = saveProfile;
  $("#enableReminder").onclick = enableReminder;
  const reminder = JSON.parse(localStorage.getItem(REMINDER_KEY) || "null");
  if (reminder?.time) $("#reminderTime").value = reminder.time;
  if ("serviceWorker" in navigator) await navigator.serviceWorker.register("/sw.js");
  await renderProfile();
  await loadDay();
}

init().catch(e => toast(e.message));
