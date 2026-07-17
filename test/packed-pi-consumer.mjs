import { mkdtemp, mkdir, readFile, realpath, rename, rm, symlink, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = await mkdtemp(join(tmpdir(), "pi-plugin-host-consumer-"));
try {
  const packed = spawnSync("npm", ["pack", "--json", "--silent", "--pack-destination", root], { cwd: project, encoding: "utf8" });
  if (packed.status !== 0) throw new Error(packed.stderr || "npm pack failed");
  const [{ filename }] = JSON.parse(packed.stdout);
  const extracted = join(root, "extracted");
  await mkdir(extracted);
  const untar = spawnSync("tar", ["-xzf", join(root, filename), "-C", extracted], { encoding: "utf8" });
  if (untar.status !== 0) throw new Error(untar.stderr || "package extraction failed");
  const consumer = join(root, "consumer");
  const packageRoot = join(consumer, "node_modules", "@nklisch", "pi-plugin-host");
  await mkdir(dirname(packageRoot), { recursive: true });
  await rename(join(extracted, "package"), packageRoot);
  const metadata = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
  const dependencies = [...Object.keys(metadata.dependencies ?? {}), ...Object.keys(metadata.peerDependencies ?? {})];
  for (const dependency of dependencies) {
    let source;
    try { source = await realpath(join(project, "node_modules", ...dependency.split("/"))); }
    catch (error) {
      // Secret Service is dynamically loaded only on Linux startup. This
      // import/discovery test intentionally does not require that optional
      // local provider to be present in the development checkout.
      if (dependency === "dbus-next" && error?.code === "ENOENT") continue;
      throw error;
    }
    const destination = join(consumer, "node_modules", ...dependency.split("/"));
    await mkdir(dirname(destination), { recursive: true });
    await symlink(source, destination, "dir");
  }
  await writeFile(join(consumer, "package.json"), JSON.stringify({ private: true, type: "module" }));
  await writeFile(join(consumer, "verify.mjs"), `
    import * as api from "@nklisch/pi-plugin-host/pi";
    import metadata from "@nklisch/pi-plugin-host/package.json" with { type: "json" };
    if (typeof api.createPackagedPluginHost !== "function") throw new Error("Pi composition factory missing");
    if (JSON.stringify(metadata.pi?.extensions) !== JSON.stringify(["./dist/pi/extension.js"])) throw new Error("Pi extension metadata missing");
  `);
  // package.json is not an exported subpath by design; verify metadata from
  // installed bytes in this harness, and package APIs through package specifiers.
  const verification = await readFile(join(consumer, "verify.mjs"), "utf8");
  await writeFile(join(consumer, "verify.mjs"), verification.replace(
    'import metadata from "@nklisch/pi-plugin-host/package.json" with { type: "json" };',
    `const metadata = ${JSON.stringify(metadata)};`,
  ));
  const run = spawnSync(process.execPath, [join(consumer, "verify.mjs")], { cwd: consumer, encoding: "utf8", env: { ...process.env, HOME: join(root, "empty-home") } });
  if (run.status !== 0) throw new Error(run.stderr || "packed consumer import failed");
  console.log("packed Pi consumer discovery passed");
} finally {
  await rm(root, { recursive: true, force: true });
}
