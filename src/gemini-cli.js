import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const DEFAULT_MODEL = "gemini-3.8-flash";
const RUNTIME_DIR = resolve(process.env.AI_RUNTIME_DIR || "./data/runtime/ai");

export function geminiConfig() {
  return {
    enabled: process.env.AI_ENABLED !== "false",
    provider: "gemini-cli",
    model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
    auth: "google-oauth",
    apiKeysAllowed: false
  };
}

function safeEnv(prompt, model) {
  const env = { ...process.env };
  delete env.GEMINI_API_KEY;
  delete env.GOOGLE_API_KEY;
  delete env.GOOGLE_GENAI_USE_VERTEXAI;
  env.LICHVIET_GEMINI_PROMPT = prompt;
  env.LICHVIET_GEMINI_MODEL = model;
  return env;
}

function commandForPlatform(prompt, model) {
  if (process.platform === "win32") {
    return {
      command: process.env.GEMINI_POWERSHELL || "powershell.exe",
      args: [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "& gemini --model $env:LICHVIET_GEMINI_MODEL --output-format json --approval-mode plan --skip-trust --prompt $env:LICHVIET_GEMINI_PROMPT"
      ],
      env: safeEnv(prompt, model)
    };
  }

  return {
    command: process.env.GEMINI_CLI_COMMAND || "gemini",
    args: [
      "--model", model,
      "--output-format", "json",
      "--approval-mode", "plan",
      "--skip-trust",
      "--prompt", prompt
    ],
    env: safeEnv(prompt, model)
  };
}

export async function runGemini(prompt, options = {}) {
  const timeoutMs = options.timeoutMs || 90000;
  const cfg = geminiConfig();

  if (!cfg.enabled) {
    throw new Error("AI đang tắt bằng AI_ENABLED=false");
  }

  await mkdir(RUNTIME_DIR, { recursive: true });
  const proc = commandForPlatform(prompt, cfg.model);

  return new Promise((resolvePromise, reject) => {
    const child = spawn(proc.command, proc.args, {
      cwd: RUNTIME_DIR,
      env: proc.env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Gemini CLI quá thời gian phản hồi"));
    }, timeoutMs);

    child.stdout.on("data", chunk => { stdout += chunk.toString(); });
    child.stderr.on("data", chunk => { stderr += chunk.toString(); });

    child.on("error", error => {
      clearTimeout(timer);
      reject(new Error(
        "Không chạy được Gemini CLI. Hãy cài @google/gemini-cli và đăng nhập Google trước. " +
        error.message
      ));
    });

    child.on("close", code => {
      clearTimeout(timer);

      if (code !== 0) {
        return reject(new Error(
          "Gemini CLI lỗi" +
          (stderr.trim() ? ": " + stderr.trim().slice(0, 1000) : "")
        ));
      }

      try {
        const parsed = JSON.parse(stdout);

        if (parsed.error) {
          return reject(new Error(parsed.error.message || "Gemini CLI trả về lỗi"));
        }

        if (typeof parsed.response !== "string") {
          return reject(new Error("Gemini CLI không trả response hợp lệ"));
        }

        resolvePromise({
          text: parsed.response.trim(),
          model: cfg.model,
          provider: cfg.provider,
          auth: cfg.auth,
          stats: parsed.stats || null
        });
      } catch {
        reject(new Error("Không parse được JSON từ Gemini CLI"));
      }
    });
  });
}
