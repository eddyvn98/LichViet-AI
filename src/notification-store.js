import { readJsonFile, writeJsonAtomic } from "./atomic-json-store.js";

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
  const data = await readJsonFile(PATH, DEFAULTS);
  return {
    ...DEFAULTS,
    ...data,
    topics:{ ...DEFAULTS.topics, ...(data.topics || {}) },
    profiles:Array.isArray(data.profiles) ? data.profiles.slice(0,8) : [],
    plans:Array.isArray(data.plans) ? data.plans.slice(0,20) : []
  };
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

  await writeJsonAtomic(PATH, next);
  return next;
}

export async function markNotificationSent(date) {
  const current = await getNotificationSettings();
  current.lastSentDate = date;
  current.lastSentAt = new Date().toISOString();
  await writeJsonAtomic(PATH, current);
  return current;
}
