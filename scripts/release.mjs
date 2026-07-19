#!/usr/bin/env node
/**
 * Release preparation: bump every version-bearing file, scaffold the release
 * work item, commit, and tag. Pushing the tag triggers the publish workflow.
 *
 *   node scripts/release.mjs <patch|minor|major|x.y.z> [--dry-run]
 *
 * Version holders are package.json and package-lock.json (via npm version)
 * plus .work/releases/<v>/release-<v>.md. Test harnesses derive the expected
 * version from package.json (E2E_PACKAGE_VERSION), so nothing else drifts.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const bump = args.find((arg) => arg !== "--dry-run");
if (bump === undefined) {
  console.error("usage: node scripts/release.mjs <patch|minor|major|x.y.z> [--dry-run]");
  process.exit(2);
}

const manifestPath = join(root, "package.json");
const current = JSON.parse(readFileSync(manifestPath, "utf8")).version;

function nextVersion(from, request) {
  const [major, minor, patch] = from.split(".").map((part) => Number.parseInt(part, 10));
  if ([major, minor, patch].some((part) => !Number.isSafeInteger(part))) {
    throw new Error(`current version ${from} is not x.y.z`);
  }
  if (request === "patch") return `${major}.${minor}.${patch + 1}`;
  if (request === "minor") return `${major}.${minor + 1}.0`;
  if (request === "major") return `${major + 1}.0.0`;
  if (/^\d+\.\d+\.\d+$/.test(request)) return request;
  throw new Error(`invalid version request ${request}`);
}

const version = nextVersion(current, bump);
const tag = `v${version}`;
const releaseDir = join(root, ".work", "releases", version);
const releaseFile = join(releaseDir, `release-${version}.md`);
const today = new Date().toISOString().slice(0, 10);

function git(...gitArgs) {
  return execFileSync("git", gitArgs, { cwd: root, encoding: "utf8" }).trim();
}

console.log(`${current} -> ${version}`);
console.log(`tag: ${tag}`);
console.log(`release item: ${releaseFile}`);
if (dryRun) {
  console.log("dry run: no changes made");
  process.exit(0);
}

// Guards -----------------------------------------------------------------
const tracked = git("status", "--porcelain", "--untracked-files=no");
if (tracked !== "") {
  console.error(`tracked working tree must be clean before releasing:\n${tracked}`);
  process.exit(1);
}
try {
  git("rev-parse", "--verify", "--quiet", `refs/tags/${tag}`);
  console.error(`tag ${tag} already exists`);
  process.exit(1);
} catch { /* tag does not exist: good */ }

const template = `---
id: release-${version}
kind: release
stage: implementing
tags: []
parent: null
depends_on: []
release_binding: ${version}
gate_origin: null
created: ${today}
updated: ${today}
---

# ${version}

<one-line release summary>

## Included work

- <work items>

## Gate runs

Release gates skipped by explicit maintainer instruction. The standard package verification remains required by the publish workflow.

## Candidate verification

- Local \`npm test\`: <results>

## Publication

- Pending.

## Shipped items

Bodies live in git history under the \`delete-refs\` retention policy.
`;

// Bump package.json + package-lock.json without committing or tagging.
execFileSync("npm", ["version", version, "--no-git-tag-version"], { cwd: root, stdio: "inherit" });

if (!existsSync(releaseFile)) {
  mkdirSync(releaseDir, { recursive: true });
  writeFileSync(releaseFile, template);
  console.log("release item scaffolded; edit the summary, included work, and verification sections");
}

git("add", "package.json", "package-lock.json", releaseFile);
git("commit", "-m", `release: prepare ${version}`);
git("tag", "-a", tag, "-m", `release: ${version}`);

console.log(`\nPrepared ${tag}. Publish with:`);
console.log(`  git push origin main ${tag}`);
