import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("dependency boundary regression", () => {
  it("keeps the committed rule able to reject domain-to-Node and domain-to-outer-layer imports", () => {
    const root = process.cwd();
    const fixture = resolve(root, "src/domain/.boundary-regression-fixture.ts");
    const applicationDirectory = resolve(root, "src/application");
    const outerLayer = resolve(applicationDirectory, ".boundary-regression-target.ts");
    const hadApplicationDirectory = existsSync(applicationDirectory);
    mkdirSync(applicationDirectory, { recursive: true });
    writeFileSync(
      outerLayer,
      "export const boundaryRegressionTarget = true;\n",
      "utf8",
    );
    writeFileSync(
      fixture,
      [
        'import { readFile } from "node:fs/promises";',
        'import { boundaryRegressionTarget } from "../application/.boundary-regression-target.js";',
        "void readFile;",
        "void boundaryRegressionTarget;",
      ].join("\n"),
      "utf8",
    );

    try {
      const result = spawnSync(
        resolve(root, "node_modules/.bin/depcruise"),
        ["src/domain/.boundary-regression-fixture.ts", "--config", ".dependency-cruiser.cjs"],
        { cwd: root, encoding: "utf8" },
      );
      const output = `${result.stdout}\n${result.stderr}`;
      expect(result.status).not.toBe(0);
      expect(output).toContain("domain-no-node-builtins");
      expect(output).toContain("domain-no-outer-layer-imports");
    } finally {
      rmSync(fixture, { force: true });
      rmSync(outerLayer, { force: true });
      if (!hadApplicationDirectory) {
        rmSync(applicationDirectory, { recursive: true, force: true });
      }
    }
  });
});
