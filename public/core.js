export const $ = s => document.querySelector(s);
export const $$ = s => [...document.querySelectorAll(s)];

const PROFILE_KEY = "lichviet.profile.v2";
const OLD_PROFILE_KEY = "lichviet.profile.v1";
const PLANS_KEY = "lichviet.plans.v2";
const REMINDER_KEY = "lichviet.reminder.v2";

function read(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
  catch { return fallback; }
}

export const state = {
  meta: null,
  profile: read(PROFILE_KEY) || read(OLD_PROFILE_KEY),
  plans: read(PLANS_KEY, []),
  reminder: read(REMINDER_KEY, null)
};

export function saveProfile(profile) {
  state.profile = profile;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function savePlans(plans) {
  state.plans = plans.slice(0, 20);
  localStorage.setItem(PLANS_KEY, JSON.stringify(state.plans));
}

export function saveReminder(reminder) {
  state.reminder = reminder;
  localStorage.setItem(REMINDER_KEY, JSON.stringify(reminder));
}

export async function api(path, options = {}) {
  const init = { ...options, headers: { ...(options.headers || {}) } };
  if (init.body && typeof init.body !== "string") {
    init.headers["content-type"] = "application/json";
    init.body = JSON.stringify(init.body);
  }
  const r = await fetch(path, init);
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Không tải được dữ liệu");
  return data;
}

export function todayVN() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(new Date());
}

export function profileQuery() {
  if (!state.profile?.birthDate) return "";
  const p = new URLSearchParams({ birth: state.profile.birthDate });
  if (state.profile.birthTime) p.set("birthTime", state.profile.birthTime);
  return "&" + p.toString();
}

export function profilePayload() {
  if (!state.profile?.birthDate) return null;
  return {
    birthDate: state.profile.birthDate,
    birthTime: state.profile.birthTime || null
  };
}

export function vnDate(iso) {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric"
  }).format(new Date(iso + "T12:00:00+07:00"));
}

export function shortDay(iso) {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short", day: "2-digit", month: "2-digit"
  }).format(new Date(iso + "T12:00:00+07:00"));
}

export function escapeHtml(s = "") {
  const map = { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" };
  return String(s).replace(/[&<>"']/g, c => map[c]);
}

export function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, 2600);
}

export function renderItems(el, items) {
  el.innerHTML = items.map(x =>
    '<div class="item">' + escapeHtml(x) + '</div>'
  ).join("");
}

export function setMeta(meta) {
  state.meta = meta;
}
