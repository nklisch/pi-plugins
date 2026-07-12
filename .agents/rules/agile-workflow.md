<!-- agile-workflow:rules:start -->
## Agile-Workflow Rules

### Tag semantics

The `tags` field on items routes them to the right design skill. A few tags carry load-bearing routing semantics — get these right:

- **`[refactor]`** — behavior-preserving structural change ONLY. Apply the black-box test: would any observable behavior change for a caller of the public surface? If yes, this is NOT a refactor — drop the tag and let the item route through `feature-design`.
  - Counts as refactor: extract a helper to dedupe, split a god file, rename for clarity, remove dead code, inline a one-call abstraction.
  - Does NOT count as refactor (even if it feels "structural"): change an API signature, swap a storage backend with different consistency guarantees, replace a silent failure with an explicit error, split a function in a way that changes call-site contracts, or perform a major behavior-changing rework.
- **`[perf]`** — performance work. Routes to `perf-design`.
- **`[prose]`** — a no-code-surface deliverable such as documentation, conventions, rules, copy, or config-as-prose. Routes to `prose-author` and implements inline. If the item has a real code surface, it is not prose.
- **`[research]`** — a grounded research engagement: an input that grounds other work, not a shippable deliverable. Routes cross-plugin to `agentic-research:research-orchestrator`, not a design-family skill. The item carries the commissioning subset of the engagement registration in a `research_dials:` block (`scope_authority`, `verification_rigor`, `intent`, `output_kind`). Scoping the item is the dispatch act. A research item does not bind to a release and its verification gates run inline in the orchestrator. At epic scope, the tag denotes a research program whose child features carry their own registrations.

All other tags are project-specific and do not affect skill routing. See `.work/CONVENTIONS.md`.

### Test integrity

When running, writing, or modifying tests:

- **File real production bugs as backlog items.** When a test failure surfaces an actual product bug rather than a stale fixture, drifted assertion, or broken mock, park it via `/agile-workflow:park` instead of silently fixing it mid-test-pass.
- **Fix bad tests in-session.** Repair stale fixtures, drifted assertions, broken mocks, and outdated snapshots so the suite stays meaningful.
- **Then drain small backlog bugs with a full pass.** Once tests are green, pick up a small parked production bug through scope, design, and implementation. Larger bugs remain for prioritization.
- **Never game a test to make it pass.** A failing test that honestly documents a known bug is better than a green test that lies. Do not add tautological assertions, assert whatever the implementation happens to return, or delete a test as flaky without finding the cause.

Cross-model advisory review follows explicit user and project instructions first. When a different model class is available, large or risky autopilot design decisions may use one advisory pass; small, low-risk work skips it. Autopilot runs a final fresh-context review before reporting completion and fixes or files accepted findings. Same-model peers fall back to local sub-agents.

Broad entry points:
`/agile-workflow:ideate`, `/agile-workflow:epicize`, autopilot goals such as "Use agile-workflow autopilot to drain --all", and `/agile-workflow:release-deploy`.
<!-- agile-workflow:rules:end -->
