import { readFileSync } from "node:fs";

const MANIFEST = JSON.parse(
  readFileSync(new URL("../data/engine-manifest.json", import.meta.url), "utf8")
);

export function engineManifest() {
  return structuredClone(MANIFEST);
}

export const ENGINE_VERSION = MANIFEST.version;
export const ENGINE_ID = MANIFEST.engine;
