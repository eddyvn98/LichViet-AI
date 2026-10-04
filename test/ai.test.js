import test from "node:test";
import assert from "node:assert/strict";
import { aiStatus } from "../src/ai-service.js";
import { telegramStatus } from "../src/telegram.js";

test("AI provider is locked to Gemini CLI OAuth", () => {
  const prevModel = process.env.GEMINI_MODEL;
  const prevEnabled = process.env.AI_ENABLED;

  process.env.GEMINI_MODEL = "gemini-3.8-flash";
  process.env.AI_ENABLED = "true";

  const status = aiStatus();

  assert.equal(status.enabled, true);
  assert.equal(status.provider, "gemini-cli");
  assert.equal(status.model, "gemini-3.8-flash");
  assert.equal(status.auth, "google-oauth");
  assert.equal(status.apiKeysAllowed, false);

  if (prevModel === undefined) delete process.env.GEMINI_MODEL;
  else process.env.GEMINI_MODEL = prevModel;

  if (prevEnabled === undefined) delete process.env.AI_ENABLED;
  else process.env.AI_ENABLED = prevEnabled;
});


test("Telegram status hides secrets", () => {
  const oldToken = process.env.TELEGRAM_BOT_TOKEN;
  const oldChat = process.env.TELEGRAM_CHAT_ID;
  process.env.TELEGRAM_BOT_TOKEN = "secret-token";
  process.env.TELEGRAM_CHAT_ID = "123456";

  const status = telegramStatus();
  assert.equal(status.enabled, true);
  assert.equal(status.chatConfigured, true);
  assert.equal(status.tokenConfigured, true);
  assert.equal("token" in status, false);
  assert.equal("chatId" in status, false);

  if (oldToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
  else process.env.TELEGRAM_BOT_TOKEN = oldToken;
  if (oldChat === undefined) delete process.env.TELEGRAM_CHAT_ID;
  else process.env.TELEGRAM_CHAT_ID = oldChat;
});
