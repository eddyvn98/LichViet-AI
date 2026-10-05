import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const PATH = process.env.NOTIFICATION_SETTINGS_PATH ||
  "./data/runtime/notification-settings.json";

const DEFAULTS = {
  enabled: false,
  reminderTime: "07:30",
  topics: {
    overview: true,
    plans: true,
    upcoming: true,
    personal: true
  },
  profile: null,
  profiles: [],
  plans: [],
  lastSentDate: null
};

export async function getNotificationSettings() {
  try {
    const data = JSON.parse(await readFile(PATH, "utf8"));
    return {
      ...DEFAULTS,
      ...data,
      topics: { ...DEFAULTS.topics, ...(data.topics || {}) },
      profiles: Array.isArray(data.profiles) ? data.profiles.slice(0,8) : [],
      plans: Array.isArray(data.plans) ? data.plans.slice(0, 20) : []
    };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export async function saveNotificationSettings(input = {}) {
  const current = await getNotificationSettings();
  const next = {
    ...current,
    enabled: Boolean(input.enabled),
    reminderTime: /^\d{2}:\d{2}$/.test(input.reminderTime || "")
      ? input.reminderTime
      : current.reminderTime,
    topics: {
      overview: Boolean(input.topics?.overview),
      plans: Boolean(input.topics?.plans),
      upcoming: Boolean(input.topics?.upcoming),
      personal: Boolean(input.topics?.personal)
    },
    profile: input.profile?.birthDate ? {
      birthDate: input.profile.birthDate,
      birthTime: input.profile.birthTime || null
    } : null,
    profiles:Array.isArray(input.profiles)
      ? input.profiles.filter(x => x?.birthDate).slice(0,8).map((x,index) => ({
          id:String(x.id || `member-${index + 1}`).slice(0,80),
          name:String(x.name || `Thành viên ${index + 1}`).slice(0,40),
          birthDate:x.birthDate,
          birthTime:x.birthTime || null
        }))
      : [],
    plans: Array.isArray(input.plans) ? input.plans.slice(0, 20) : [],
    updatedAt: new Date().toISOString()
  };

  await mkdir(dirname(PATH), { recursive: true });
  await writeFile(PATH, JSON.stringify(next, null, 2), { mode: 0o600 });
  return next;
}

export async function markNotificationSent(date) {
  const current = await getNotificationSettings();
  current.lastSentDate = date;
  current.lastSentAt = new Date().toISOString();
  await mkdir(dirname(PATH), { recursive: true });
  await writeFile(PATH, JSON.stringify(current, null, 2), { mode: 0o600 });
  return current;
}
