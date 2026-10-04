import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const files = readdirSync(new URL("../public/", import.meta.url))
  .filter(name => name.endsWith(".js"))
  .sort();

const failures = [];
for (const name of files) {
  const path = new URL("../public/" + name, import.meta.url);
  const result = spawnSync(process.execPath, ["--check", path.pathname], {
    encoding:"utf8"
  });
  if (result.status !== 0) {
    failures.push({
      file:name,
      stderr:result.stderr || result.stdout || "syntax check failed"
    });
  }
}

if (failures.length) {
  for (const item of failures) {
    console.error("\n" + item.file + "\n" + item.stderr);
  }
  process.exit(1);
}

console.log(`Frontend syntax OK: ${files.length} modules`);
