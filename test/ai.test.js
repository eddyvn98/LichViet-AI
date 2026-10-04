import test from "node:test";
import assert from "node:assert/strict";
import { aiStatus } from "../src/ai-service.js";

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
