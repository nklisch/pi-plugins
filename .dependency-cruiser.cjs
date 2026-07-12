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
      name: "application-no-outer-layer-imports",
      comment: "Application policy depends on inward contracts, never adapters, formats, or host runtime modules.",
      severity: "error",
      from: { path: "^src/application(?:/|$)" },
      to: { path: "^src/(?:formats|infrastructure|runtime|pi)(?:/|$)" },
    },
    {
      name: "inspection-contracts-no-compatibility-policy",
      comment: "Inspection contracts and content indexing stop before compatibility policy.",
      severity: "error",
      from: {
        path: "^src/(?:domain/(?:bundle-ingestion|component-identity)|application/(?:inspection-contract|content-index|ports/(?:content-read|bundle-readers)))(?:\\.ts)?$", 
      },
      to: { path: "^src/domain/compatibility(?:/|$)" },
    },
    {
      name: "application-no-node-builtins",
      comment: "Application code stays portable and receives filesystem/process behavior through ports.",
      severity: "error",
      from: { path: "^src/application(?:/|$)" },
      to: { dependencyTypes: ["core"] },
    },
    {
      name: "infrastructure-no-outer-layer-imports",
      comment: "Infrastructure adapters may depend inward but not on format readers or host-specific outer integrations.",
      severity: "error",
      from: { path: "^src/infrastructure(?:/|$)" },
      to: { path: "^src/(?:formats|runtime|pi)(?:/|$)" },
    },
    {
      name: "formats-no-infrastructure-imports",
      comment: "Format readers emit domain declarations and do not acquire or materialize content.",
      severity: "error",
      from: { path: "^src/formats(?:/|$)" },
      to: { path: "^src/(?:application|infrastructure|runtime|pi)(?:/|$)" },
    },
    {
      name: "formats-no-node-builtins",
      comment: "Format readers remain runtime-independent.",
      severity: "error",
      from: { path: "^src/formats(?:/|$)" },
      to: { dependencyTypes: ["core"] },
    },
    {
      name: "formats-no-outer-or-node-imports",
      comment: "All format code is limited to domain contracts and sibling format adapters, never outer layers or Node built-ins.",
      severity: "error",
      from: { path: "^src/formats(?:/|$)" },
      to: { path: "^(?:src/(?:application|infrastructure|runtime|pi)(?:/|$)|node:)" },
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
