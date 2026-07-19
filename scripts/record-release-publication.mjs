#!/usr/bin/env node
/**
 * Record a successful npm publication in the release work item. Used by the
 * publish workflow after `npm publish`; also runnable by hand:
 *
 *   node scripts/record-release-publication.mjs <version> <run-id> <source-sha>
 *
 * Idempotent: a release item whose Publication section is already filled (no
 * "- Pending." line) is left untouched and the script exits 0.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [version, runId, sourceSha] = process.argv.slice(2);
if (version === undefined || runId === undefined || sourceSha === undefined) {
  console.error("usage: node scripts/record-release-publication.mjs <version> <run-id> <source-sha>");
  process.exit(2);
}

const releaseDir = join(root, ".work", "releases", version);
const releaseFile = join(releaseDir, `release-${version}.md`);
const today = new Date().toISOString().slice(0, 10);
const shortSha = sourceSha.slice(0, 7);

const integrity = execFileSync(
  "npm", ["view", `@nklisch/pi-plugins@${version}`, "dist.integrity"],
  { cwd: root, encoding: "utf8" },
).trim();
if (integrity === "") {
  console.error(`@nklisch/pi-plugins@${version} is not on the registry; refusing to record`);
  process.exit(1);
}

const publication = [
  `- Shipped: ${today}`,
  "- Mapping: tag-based",
  `- Source commit: \`${shortSha}\``,
  `- Tag: \`v${version}\``,
  `- GitHub Actions publish run: \`${runId}\``,
  `- npm integrity: \`${integrity}\``,
  `- GitHub: https://github.com/nklisch/pi-plugins/releases/tag/v${version}`,
  `- npm: https://www.npmjs.com/package/@nklisch/pi-plugins/v/${version}`,
].join("\n");

if (!existsSync(releaseFile)) {
  // Ad-hoc tag pushed without the prepare script: scaffold a minimal record.
  mkdirSync(releaseDir, { recursive: true });
  writeFileSync(releaseFile, `---
id: release-${version}
kind: release
stage: done
tags: []
parent: null
depends_on: []
release_binding: ${version}
gate_origin: null
created: ${today}
updated: ${today}
---

# ${version}

## Publication

${publication}
`);
  console.log(`created ${releaseFile}`);
  process.exit(0);
}

const source = readFileSync(releaseFile, "utf8");
if (!source.includes("- Pending.")) {
  console.log(`${releaseFile} already records a publication; nothing to do`);
  process.exit(0);
}
const updated = source
  .replace(/^stage: implementing$/m, "stage: done")
  .replace(/^updated: \d{4}-\d{2}-\d{2}$/m, `updated: ${today}`)
  .replace("- Pending.", publication);
writeFileSync(releaseFile, updated);
console.log(`recorded publication in ${releaseFile}`);
