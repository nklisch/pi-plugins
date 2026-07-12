import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

function cruise(root: string, fixture: string): string {
  const result = spawnSync(
    resolve(root, "node_modules/.bin/depcruise"),
    [fixture, "--config", ".dependency-cruiser.cjs"],
    { cwd: root, encoding: "utf8" },
  );
  expect(result.status).not.toBe(0);
  return `${result.stdout}\n${result.stderr}`;
}

describe("dependency boundary regression", () => {
  it("keeps the committed rule able to reject domain-to-Node and domain-to-outer-layer imports", () => {
    const root = process.cwd();
    const fixture = resolve(root, "src/domain/.boundary-regression-fixture.ts");
    const applicationDirectory = resolve(root, "src/application");
    const outerLayer = resolve(applicationDirectory, ".boundary-regression-target.ts");
    const hadApplicationDirectory = existsSync(applicationDirectory);
    mkdirSync(applicationDirectory, { recursive: true });
    writeFileSync(outerLayer, "export const boundaryRegressionTarget = true;\n", "utf8");
    writeFileSync(fixture, [
      'import { readFile } from "node:fs/promises";',
      'import { boundaryRegressionTarget } from "../application/.boundary-regression-target.js";',
      "void readFile;",
      "void boundaryRegressionTarget;",
    ].join("\n"), "utf8");

    try {
      const output = cruise(root, "src/domain/.boundary-regression-fixture.ts");
      expect(output).toContain("domain-no-node-builtins");
      expect(output).toContain("domain-no-outer-layer-imports");
    } finally {
      rmSync(fixture, { force: true });
      rmSync(outerLayer, { force: true });
      if (!hadApplicationDirectory) rmSync(applicationDirectory, { recursive: true, force: true });
    }
  });

  it("rejects format Node and outer-layer imports", () => {
    const root = process.cwd();
    const formatFixture = resolve(root, "src/formats/.boundary-regression-fixture.ts");
    const applicationDirectory = resolve(root, "src/application");
    const applicationTarget = resolve(applicationDirectory, ".format-boundary-regression-target.ts");
    mkdirSync(applicationDirectory, { recursive: true });
    writeFileSync(applicationTarget, "export const formatBoundaryRegressionTarget = true;\n", "utf8");
    writeFileSync(formatFixture, [
      'import { readFile } from "node:fs/promises";',
      'import { formatBoundaryRegressionTarget } from "../application/.format-boundary-regression-target.js";',
      "void readFile;",
      "void formatBoundaryRegressionTarget;",
    ].join("\n"), "utf8");
    try {
      const output = cruise(root, "src/formats/.boundary-regression-fixture.ts");
      expect(output).toContain("formats-no-outer-or-node-imports");
    } finally {
      rmSync(formatFixture, { force: true });
      rmSync(applicationTarget, { force: true });
    }
  });

  it("rejects application runtime/adapter imports and infrastructure-to-format imports", () => {
    const root = process.cwd();
    const applicationFixture = resolve(root, "src/application/.boundary-regression-fixture.ts");
    const infrastructureDirectory = resolve(root, "src/infrastructure");
    const infrastructureFixture = resolve(infrastructureDirectory, ".boundary-regression-fixture.ts");
    mkdirSync(infrastructureDirectory, { recursive: true });
    writeFileSync(applicationFixture, [
      'import { readFile } from "node:fs/promises";',
      'import { boundaryRegressionTarget } from "../infrastructure/.boundary-regression-target.js";',
      "void readFile;",
      "void boundaryRegressionTarget;",
    ].join("\n"), "utf8");
    writeFileSync(resolve(infrastructureDirectory, ".boundary-regression-target.ts"), "export const boundaryRegressionTarget = true;\n", "utf8");
    writeFileSync(infrastructureFixture, 'import { MarketplaceSourceSchema } from "../formats/marketplace-reader-support.js";\nvoid MarketplaceSourceSchema;\n', "utf8");
    try {
      const appOutput = cruise(root, "src/application/.boundary-regression-fixture.ts");
      expect(appOutput).toContain("application-no-node-builtins");
      expect(appOutput).toContain("application-no-outer-layer-imports");
      const infraOutput = cruise(root, "src/infrastructure/.boundary-regression-fixture.ts");
      expect(infraOutput).toContain("infrastructure-no-outer-layer-imports");
    } finally {
      rmSync(applicationFixture, { force: true });
      rmSync(infrastructureFixture, { force: true });
      rmSync(resolve(infrastructureDirectory, ".boundary-regression-target.ts"), { force: true });
    }
  });
});
