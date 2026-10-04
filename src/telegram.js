const MAX_TEXT = 4000;

export function telegramStatus() {
  return {
    enabled: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    provider: "telegram-bot-api",
    chatConfigured: Boolean(process.env.TELEGRAM_CHAT_ID),
    tokenConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN)
  };
}

function chunks(text) {
  const value = String(text || "").trim();
  if (!value) return [];
  const parts = [];
  let rest = value;

  while (rest.length > MAX_TEXT) {
    let cut = rest.lastIndexOf("\n", MAX_TEXT);
    if (cut < MAX_TEXT * 0.6) cut = rest.lastIndexOf(" ", MAX_TEXT);
    if (cut < MAX_TEXT * 0.6) cut = MAX_TEXT;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }

  if (rest) parts.push(rest);
  return parts;
}

async function postMessage(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    throw new Error("Telegram chưa cấu hình TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      "https://api.telegram.org/bot" + encodeURIComponent(token) + "/sendMessage",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          disable_web_page_preview: true
        }),
        signal: controller.signal
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.ok) {
      throw new Error(data?.description || "Telegram Bot API lỗi");
    }

    return data.result?.message_id || null;
  } finally {
    clearTimeout(timer);
  }
}

export async function sendTelegramText(text, options = {}) {
  const title = String(options.title || "").trim();
  const body = title ? title + "\n\n" + String(text || "") : String(text || "");
  const parts = chunks(body);

  if (!parts.length) {
    return { enabled: telegramStatus().enabled, sent: false, count: 0 };
  }

  const messageIds = [];
  for (const part of parts) {
    messageIds.push(await postMessage(part));
  }

  return {
    enabled: true,
    sent: true,
    count: messageIds.length
  };
}

export async function sendTelegramBestEffort(text, options = {}) {
  const status = telegramStatus();

  if (!status.enabled) {
    return { enabled: false, sent: false, reason: "not-configured" };
  }

  try {
    return await sendTelegramText(text, options);
  } catch (error) {
    return {
      enabled: true,
      sent: false,
      reason: "delivery-failed",
      error: String(error?.message || error).slice(0, 300)
    };
  }
}
