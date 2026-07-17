import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { createNodeProjectIntentFilePort } from "../../../src/infrastructure/project/node-project-intent-file.js";

const sha256 = (bytes: Uint8Array) => new Uint8Array(createHash("sha256").update(bytes).digest());
const roots: string[] = [];
const signal = new AbortController().signal;
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

async function fixture() {
  const path = await mkdtemp(join(tmpdir(), "project-intent-"));
  roots.push(path);
  const projectKey = `project-v1:sha256:${"1".repeat(64)}` as never;
  const identity = { kind: "path-only" as const, canonicalRoot: pathToFileURL(path).href as never, limitation: "identity-changes-with-canonical-root" as const };
  const root = { kind: "trusted-project-root-v1" as const, identity, projectKey, canonicalRoot: identity.canonicalRoot } as never;
  const projectRoots = {
    async acquire() { return root; },
    verify() { return { kind: "project" as const, identity, projectKey }; },
    async revalidate() { return { kind: "project" as const, identity, projectKey }; },
  };
  return { path, root, port: createNodeProjectIntentFilePort({ projectRoots, sha256 }) };
}
const declaration = { schemaVersion: 1 as const, marketplaces: [{ marketplace: "market", source: { kind: "github" as const, repository: "owner/market" } }], plugins: [{ plugin: "demo@market" as const, enabled: true }] };
const writeId = `project-intent-write-v1:${"A".repeat(32)}` as never;

describe("node project intent file", () => {
  it("creates only fixed .pi/plugins.json and compares exact observations", async () => {
    const { path, root, port } = await fixture();
    const missing = await port.read(root, signal);
    expect(missing.kind).toBe("missing");
    if (missing.kind !== "missing") return;
    const written = await port.replace({ root, expected: missing.observation, declaration, writeId }, signal);
    expect(written.kind).toBe("written");
    expect(JSON.parse(await readFile(join(path, ".pi", "plugins.json"), "utf8"))).toEqual(declaration);
    const found = await port.read(root, signal);
    expect(found).toMatchObject({ kind: "found" });
    if (found.kind !== "found") return;
    expect(await port.replace({ root, expected: found.observation, declaration, writeId: `project-intent-write-v1:${"B".repeat(32)}` as never }, signal)).toMatchObject({ kind: "unchanged" });
    await writeFile(join(path, ".pi", "plugins.json"), JSON.stringify({ ...declaration, plugins: [] }));
    expect(await port.replace({ root, expected: found.observation, declaration, writeId: `project-intent-write-v1:${"C".repeat(32)}` as never }, signal)).toEqual({ kind: "stale" });
  });

  it("fails closed for symlink parents and leaves external targets untouched", async () => {
    const { path, root, port } = await fixture();
    const outside = await mkdtemp(join(tmpdir(), "project-intent-outside-"));
    roots.push(outside);
    await mkdir(join(outside, "pi"));
    await symlink(join(outside, "pi"), join(path, ".pi"));
    expect(await port.read(root, signal)).toEqual({ kind: "unavailable", code: "FILE_UNSAFE" });
    expect(await readFile(join(outside, "pi", "plugins.json"), "utf8").catch(() => "missing")).toBe("missing");
  });

  it("rejects leaf replacement and invalid UTF-8 without exposing paths", async () => {
    const { path, root, port } = await fixture();
    await mkdir(join(path, ".pi"));
    await writeFile(join(path, ".pi", "plugins.json"), new Uint8Array([0xff]));
    expect(await port.read(root, signal)).toEqual({ kind: "unavailable", code: "FILE_INVALID_UTF8" });
    await rm(join(path, ".pi", "plugins.json"));
    const outside = join(path, "outside.json");
    await writeFile(outside, JSON.stringify(declaration));
    await symlink(outside, join(path, ".pi", "plugins.json"));
    expect(await port.read(root, signal)).toEqual({ kind: "unavailable", code: "FILE_UNSAFE" });
  });
});
