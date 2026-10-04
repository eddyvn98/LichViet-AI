import test from "node:test";
import assert from "node:assert/strict";
import { aiGuardrailPolicy, aiStatus } from "../src/ai-service.js";
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


test("V7 AI guardrail preserves policy, family and constraint semantics", () => {
  const policy = aiGuardrailPolicy();
  assert.match(policy, /PRODUCT_POLICY/);
  assert.match(policy, /không được gọi là cổ thư|không được gọi là.*nguyên điển/);
  assert.match(policy, /tie-break/);
  assert.match(policy, /historical-proleptic-utc7/);
  assert.match(policy, /family-personalization-v1/);
  assert.match(policy, /selection-constraints-v1/);
  assert.match(policy, /không dùng nguồn mạnh của miền này để nâng kết luận miền khác/);
});

test("AI status exposes v7 family selection policies", () => {
  const status = aiStatus();
  assert.equal(status.evidencePolicy, "verified-engine-v7");
  assert.equal(status.decisionPolicy, "activity-composition-v2");
  assert.equal(status.rankingPolicy, "ranking-tiebreak-v2");
  assert.equal(status.familyPolicy, "family-personalization-v1");
  assert.equal(status.constraintPolicy, "selection-constraints-v1");
  assert.equal(status.comparisonPolicy, "deterministic-date-comparison-v1");
});
