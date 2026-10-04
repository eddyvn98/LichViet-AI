import { buildBrief } from "./brief.js";
import { listSubscriptions, removeSubscription, upsertSubscription } from "./push-store.js";

function config() {
  return {
    publicKey:process.env.VAPID_PUBLIC_KEY || "",
    privateKey:process.env.VAPID_PRIVATE_KEY || "",
    subject:process.env.VAPID_SUBJECT || "mailto:admin@example.com"
  };
}

export function pushStatus() {
  const c = config();
  return { enabled:Boolean(c.publicKey && c.privateKey), publicKey:c.publicKey || null };
}

export async function subscribePush(payload) {
  if (!pushStatus().enabled) throw new Error("Server chưa cấu hình VAPID");
  return upsertSubscription(payload);
}

export async function unsubscribePush(endpoint) {
  return removeSubscription(endpoint);
}

export async function sendDailyPush(date) {
  const c = config();
  if (!c.publicKey || !c.privateKey) return { enabled:false, sent:0, failed:0 };

  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(c.subject, c.publicKey, c.privateKey);

  const all = await listSubscriptions();
  let sent = 0, failed = 0;

  for (const item of all) {
    try {
      const brief = buildBrief({ date, profile:item.profile, plans:item.plans });
      const payload = JSON.stringify({
        title:`Lịch Việt · ${brief.today.verdict.label}`,
        body:brief.alerts[0]?.message || brief.headline,
        url:"/"
      });
      await webpush.sendNotification(item.subscription, payload);
      sent += 1;
    } catch (error) {
      failed += 1;
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await removeSubscription(item.subscription.endpoint);
      }
    }
  }

  return { enabled:true, sent, failed };
}
