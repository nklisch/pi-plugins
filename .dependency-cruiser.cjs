/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "domain-no-outer-layer-imports",
      comment: "Domain contracts must remain independent of adapters and runtime integrations.",
      severity: "error",
      from: { path: "^src/domain(?:/|$)" },
      to: { path: "^src/(?:application|formats|infrastructure|runtime|pi)(?:/|$)" },
    },
    {
      name: "domain-no-node-builtins",
      comment: "Node APIs belong behind application ports and infrastructure adapters.",
      severity: "error",
      from: { path: "^src/domain(?:/|$)" },
      to: { dependencyTypes: ["core"] },
    },
    {
      name: "domain-no-undeclared-packages",
      comment: "Domain package imports must be declared package dependencies.",
      severity: "error",
      from: { path: "^src/domain(?:/|$)" },
      to: {
        dependencyTypes: ["unknown", "npm-no-pkg", "npm-unknown"],
      },
    },
    {
      name: "no-circular",
      comment: "Circular dependencies make contract initialization order implicit and fragile.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    tsConfig: { fileName: "tsconfig.json" },
    doNotFollow: { path: "node_modules" },
    parser: "swc",
    moduleSystems: ["es6"],
    enhancedResolveOptions: {
      extensions: [".ts", ".js", ".mjs", ".cjs"],
    },
  },
};
