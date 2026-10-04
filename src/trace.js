import { createHash } from "node:crypto";
import { engineManifest } from "./version.js";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map(key => [key, stable(value[key])])
    );
  }
  return value;
}

export function reproducibilityTrace(payload) {
  const manifest = engineManifest();
  const normalized = stable({
    engine:manifest.engine,
    knowledgeBase:manifest.knowledgeBase,
    decisionPolicy:manifest.decisionPolicy,
    rankingPolicy:manifest.rankingPolicy,
    payload
  });
  const hash = createHash("sha256")
    .update(JSON.stringify(normalized))
    .digest("hex");

  return {
    algorithm:"sha256",
    hash,
    engine:manifest.engine,
    knowledgeBase:manifest.knowledgeBase,
    decisionPolicy:manifest.decisionPolicy,
    rankingPolicy:manifest.rankingPolicy
  };
}
