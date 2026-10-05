export const $ = s => document.querySelector(s);
export const $$ = s => [...document.querySelectorAll(s)];

const PROFILE_KEY = "lichviet.profile.v2";
const OLD_PROFILE_KEY = "lichviet.profile.v1";
const FAMILY_KEY = "lichviet.family.v1";
const FAMILY_SELECTION_KEY = "lichviet.family.selection.v1";
const FAMILY_ACTIVE_KEY = "lichviet.family.active.v1";
const PLANS_KEY = "lichviet.plans.v2";
const REMINDER_KEY = "lichviet.reminder.v2";

function read(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
  catch { return fallback; }
}

const legacyProfile = read(PROFILE_KEY) || read(OLD_PROFILE_KEY);
const storedFamily = read(FAMILY_KEY, []);
const migratedFamily = Array.isArray(storedFamily) && storedFamily.length
  ? storedFamily
  : legacyProfile?.birthDate
    ? [{
        id:"primary",
        name:legacyProfile.name || "Tôi",
        birthDate:legacyProfile.birthDate,
        birthTime:legacyProfile.birthTime || null
      }]
    : [];

if (!storedFamily?.length && migratedFamily.length) {
  localStorage.setItem(FAMILY_KEY, JSON.stringify(migratedFamily));
}

const storedSelection = read(FAMILY_SELECTION_KEY, []);
const selectedIds = Array.isArray(storedSelection) && storedSelection.length
  ? storedSelection.filter(id => migratedFamily.some(x => x.id === id))
  : migratedFamily.map(x => x.id);

const activeId = read(FAMILY_ACTIVE_KEY, null) ||
  migratedFamily[0]?.id || null;
const activeProfile = migratedFamily.find(x => x.id === activeId) ||
  migratedFamily[0] || legacyProfile || null;

export const state = {
  meta: null,
  profile: activeProfile,
  family: migratedFamily,
  selectedFamilyIds:selectedIds,
  activeFamilyId:activeProfile?.id || null,
  plans: read(PLANS_KEY, []),
  reminder: read(REMINDER_KEY, null)
};

function persistFamily() {
  localStorage.setItem(FAMILY_KEY, JSON.stringify(state.family));
  localStorage.setItem(
    FAMILY_SELECTION_KEY,
    JSON.stringify(state.selectedFamilyIds)
  );
  if (state.activeFamilyId) {
    localStorage.setItem(FAMILY_ACTIVE_KEY, JSON.stringify(state.activeFamilyId));
  } else {
    localStorage.removeItem(FAMILY_ACTIVE_KEY);
  }
}

function newMemberId() {
  return globalThis.crypto?.randomUUID?.() ||
    "member-" + Date.now() + "-" + Math.random().toString(36).slice(2,8);
}

export function startNewFamilyMember() {
  state.activeFamilyId = null;
  state.profile = null;
  persistFamily();
}

export function saveProfile(profile) {
  const id = state.activeFamilyId || newMemberId();
  const member = {
    id,
    name:String(profile.name || "").trim().slice(0,40),
    birthDate:profile.birthDate,
    birthTime:profile.birthTime || null
  };

  const index = state.family.findIndex(x => x.id === id);
  if (index >= 0) state.family[index] = member;
  else state.family = [...state.family, member].slice(0,8);

  state.activeFamilyId = id;
  state.profile = member;
  if (!state.selectedFamilyIds.includes(id)) {
    state.selectedFamilyIds = [...state.selectedFamilyIds, id];
  }
  localStorage.setItem(PROFILE_KEY, JSON.stringify(member));
  persistFamily();
  return member;
}

export function setActiveFamilyMember(id) {
  const member = state.family.find(x => x.id === id);
  if (!member) return null;
  state.activeFamilyId = member.id;
  state.profile = member;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(member));
  persistFamily();
  return member;
}

export function removeFamilyMember(id) {
  state.family = state.family.filter(x => x.id !== id);
  state.selectedFamilyIds = state.selectedFamilyIds.filter(x => x !== id);
  if (state.activeFamilyId === id) {
    const next = state.family[0] || null;
    state.activeFamilyId = next?.id || null;
    state.profile = next;
    if (next) localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    else localStorage.removeItem(PROFILE_KEY);
  }
  persistFamily();
}

export function setSelectedFamilyIds(ids = []) {
  const valid = new Set(state.family.map(x => x.id));
  state.selectedFamilyIds = [...new Set(ids)]
    .filter(id => valid.has(id))
    .slice(0,8);
  persistFamily();
}

export function familyPayload(selectedOnly = false) {
  const members = selectedOnly
    ? state.family.filter(x => state.selectedFamilyIds.includes(x.id))
    : state.family;
  return members.slice(0,8).map(x => ({
    id:x.id,
    name:x.name || "",
    birthDate:x.birthDate,
    birthTime:x.birthTime || null
  }));
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
    id:state.profile.id || null,
    name:state.profile.name || "",
    birthDate: state.profile.birthDate,
    birthTime: state.profile.birthTime || null
  };
}

export function selectedFamilyPayload() {
  return familyPayload(true);
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
