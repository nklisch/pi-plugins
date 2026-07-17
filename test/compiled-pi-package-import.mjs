import { readFile } from "node:fs/promises";
import * as piApi from "@nklisch/pi-plugin-host/pi";

const expected = [
  "PackagedPluginHostError",
  "PackagedPluginHostErrorCode",
  "createPackagedPluginHost",
].sort();
const actual = Object.keys(piApi).sort();
if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  throw new Error(`compiled Pi subpath export allowlist mismatch\nexpected: ${JSON.stringify(expected)}\nactual: ${JSON.stringify(actual)}`);
}
const metadata = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
if (!metadata.keywords?.includes("pi-package") || JSON.stringify(metadata.pi?.extensions) !== JSON.stringify(["./dist/pi/extension.js"])) {
  throw new Error("Pi package discovery metadata is invalid");
}
await import(new URL("../dist/pi/extension.js", import.meta.url));
console.log(`compiled Pi package import passed (${actual.length} exports)`);
