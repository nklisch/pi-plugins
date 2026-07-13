# Project Conventions

## Release mapping

tag-based

## Tag taxonomy

- `security` — source trust, path containment, secrets, process execution, and supply-chain safety
- `compatibility` — Claude, Codex, Pi, Agent Skills, hooks, MCP, and marketplace contract alignment
- `perf` — throughput, startup cost, context cost, latency, memory, and I/O; routes to `perf-design`
- `refactor` — behavior-preserving structural change only; routes to `refactor-design`
- `infra` — packaging, build, release, CI, runtime integration, and developer infrastructure
- `prose` — no-code-surface documentation, conventions, rules, and copy; routes to `prose-author`
- `research` — grounded research input carrying `research_dials`; routes to `agentic-research:research-orchestrator`, does not bind to a release, and runs verification inline

## Slug conventions

Use kebab-case. Child item slugs qualify themselves with their parent or capability context so they remain unique and understandable outside their directory.

## Stage overrides

None. Use the standard agile-workflow stage flows.

## Review policy

review_weight: standard

Apply a practical plugin-installer bar. Block completion for realistic normal-use data loss, broken installation or activation, secret exposure, scope confusion, or concurrency failures between ordinary Pi sessions. Same-user malicious filesystem replacement, deliberately contract-violating adapters, cryptographically improbable identifier collisions, and unsupported recursive use of internal coordination APIs are non-blocking residual risks unless they reproduce in normal operation or have a small simplifying fix.

Feature and epic review uses one complementary pass followed by one focused adversarial pass when a different model class is available. Do not repeat convergence loops for theoretical edge cases; record residuals as review comments or backlog ideas and favor understandable, maintainable code over bulletproof machinery.

## Terminal-tier retention

delete-refs

## Gate config

gates_for_release: [security, tests, cruft, docs, patterns]
gate_finding_routing:
  critical: implementing
  high: implementing
  medium: drafting
  low: backlog
  info: skip
gate_refactor_scan_library_roots:
  - .agents/skills
  - .claude/skills
binding_guard: warn
epic_cohesion: phased
backlog_staleness_days: 90

## Rules context

rules_context: on
rules_context_max_bytes: 12000
