# I AM THE LAW ⚖️

> *"I am the law!"* — Judge Dredd

Point d'entrée unique pour tous les LLM/agents conversationnels.

## How to Read

- **🔴 MUST / DOIT** : Non-negotiable requirement
- **🟡 SHOULD / DEVRAIT** : Recommended, exceptions must be justified
- **🟢 MAY / PEUT** : Optional, use when beneficial

## Modules activés

### clean-code (v1.0.0) [core]

Clean Code principles by Robert C. Martin

#### 🔴 Use Meaningful Names [MUST]

- Variables, functions, and classes MUST have intention-revealing names
- Avoid abbreviations unless universally understood
- Use pronounceable names
- Use searchable names (avoid single-letter variables except for loops)

#### 🟡 Keep Functions Small [SHOULD]

- Functions SHOULD do one thing and do it well
- Functions SHOULD be under 20 lines when possible
- Extract logic into well-named helper functions
- If a function needs a comment to explain what it does, extract it

#### 🟡 Avoid Side Effects [SHOULD]

- Functions SHOULD not modify global state
- Functions SHOULD be predictable (same input = same output)
- If side effects are necessary, make them explicit in the function name

#### 🟡 Don't Repeat Yourself (DRY) [SHOULD]

- Avoid duplicating code logic
- Extract common patterns into reusable functions
- BUT: Don't over-abstract prematurely (Rule of Three)

#### 🟢 Comments Are a Last Resort [MAY]

- Code SHOULD be self-documenting
- Comments MAY explain "why", not "what"
- Delete commented-out code (use version control instead)
- TODOs are acceptable but should be tracked

### hexagonal (v1.0.0) [core]

Hexagonal Architecture (Ports & Adapters) principles

#### 🔴 Domain Must Be Isolated [MUST]

- Domain (entities, business rules, use-cases) MUST be independent of frameworks
- Domain MUST NOT import from infrastructure or adapters
- Domain MUST be testable without I/O

#### 🔴 Invert Dependencies via Ports [MUST]

- External dependencies (DB, HTTP, providers) MUST be inverted via ports (interfaces)
- Ports are defined in domain/application layer
- Adapters implement ports and live in infrastructure

#### 🔴 Adapters Live in Infrastructure [MUST]

- HTTP controllers → infrastructure/http/
- Database repositories → infrastructure/persistence/
- External API clients → infrastructure/clients/

#### 🟡 Wiring at the Edge [SHOULD]

- Assembly of ports/adapters SHOULD happen at application entry point
- Dependency injection configured at startup, not in domain
- Configuration reading SHOULD NOT happen in domain

#### 🟡 Shared Libraries Don't Read Config [SHOULD]

- Shared packages (packages/*) SHOULD NOT read environment variables
- Configuration MUST be passed from apps/services

### typescript-2026 (v1.0.0) [core]

TypeScript best practices for modern projects (2026)

#### 🔴 Strict Configuration [MUST]

Enable all strict options in tsconfig.json:
- strict: true
- noUncheckedIndexedAccess: true
- exactOptionalPropertyTypes: true
- noImplicitOverride: true

#### 🔴 Prefer unknown over any [MUST]

- Use `unknown` instead of `any` for uncertain types
- Narrow types with type guards before use
- `any` is only acceptable when interfacing with untyped libraries

#### 🟡 Explicit Return Types for Exports [SHOULD]

- Exported functions SHOULD have explicit return types
- Exception: simple arrow functions in callbacks
- This improves documentation and catches errors early

#### 🟡 Use const assertions [SHOULD]

Prefer `as const` for literal types:
```typescript
const STATUSES = ['pending', 'done'] as const;
type Status = typeof STATUSES[number];
```

#### 🟡 Prefer Discriminated Unions [SHOULD]

Use discriminated unions for state modeling:
```typescript
type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: Error };
```

#### 🟢 Avoid Enums [MAY]

- Consider using `as const` objects instead of enums
- Enums have runtime overhead and quirky behavior
- Exception: Numeric enums for bit flags are acceptable

### architecture (v1.0.0) [core]

Architecture principles for scalable and maintainable applications

#### 🔴 MVP-First Product Intent [MUST]

- Design MUST aim for the simplest possible MVP (time-to-first-feature) while preserving evolvability
- Design MUST NOT over-optimize for unproven constraints (load, high availability, microservices, distributed cache, etc.)
- If a technical constraint can be abstracted/deferred without endangering product trajectory, it MUST be deferred (accelerate development)

#### 🔴 Repository Structure (Conceptual) [MUST]

Codebase MUST separate conceptually:
- Applications (entrypoints / delivery)
- Runtime services (API/worker)
- Shared libraries (reusable, pure)
- Infrastructure (execution/deployment)

For JS/TS monorepo (workspaces), structure SHOULD be:
- apps/ (UI, backoffice, CLI, etc.)
- services/ (API, workers)
- packages/ (domain, shared libs)
- infra/ (docker, provisioning IaC, scripts)

If not JS/TS monorepo, structure MAY differ, but MUST preserve these 4 concepts (even if names change)

#### 🔴 Hexagonal Architecture (Ports & Adapters) [MUST]

Domain (entities, business rules, use-cases) MUST be:
- Independent of frameworks
- Testable without I/O
- Stable facing adapter changes

External dependencies (persistence, HTTP, providers, third-party systems) MUST be inverted via ports (interfaces) defined in domain/application layer

Adapters (HTTP/controllers, DB repositories, external clients) MUST live in infrastructure layer

Wiring (assembly ports/adapters, injection, config reading) MUST happen at the edge (service/app entrypoint), not in domain

Shared libraries (packages/* or equivalent) MUST NOT read environment variables directly; configuration MUST come from apps/services

#### 🟡 Data & Persistence (MVP Approach) [SHOULD]

MVP MAY start with simple persistence (in-memory, file, mock), but:
- Data access MUST go through a port (repository interface)
- Concrete implementation (in-memory, file, DB) MUST be a replaceable adapter

Design MUST NOT impose a "real DB" or cache from the start if the product doesn't need it

Transition to a DB later SHOULD be an adapter substitution, not a domain rewrite

#### 🔴 Configuration, Secrets, and 12-Factor [MUST]

- Runtime configuration MUST be provided via environment variables (or equivalent runtime mechanism)
- Secrets MUST NOT be committed; a configuration template MUST exist (without secrets)
- Secrets SHOULD be distinguished (e.g., SECRET_ prefix) to facilitate:
  - Encrypted storage (secret manager / parameter store)
  - Audit and rotation
- Logs MUST output to stdout/stderr, and be exploitable in local/CI/prod (readable or structured format)

#### 🔴 Containerization & Local Execution [MUST]

- Template MUST allow reproducible local startup (ideally "one-command")
- If Docker is used:
  - Environment configuration SHOULD be based on .env.<env> files (or equivalent) with versioned .env.template
  - Critical services SHOULD expose healthcheck endpoints used by Compose/CI
- A build-dedicated override file (e.g., docker-compose.build.yml) MAY exist, but IS NOT mandatory:
  - If single docker-compose.yml can cover "pull & run" and "build & run" via commands/variables, acceptable
  - Otherwise, an override remains a simple and readable solution
- A single reverse-proxy/ingress entry point MAY be used (TLS, single access point, routing), but IS NOT a constraint: choose the most appropriate option

#### 🟡 Operational Scripts (DX & Runbooks) [SHOULD]

- Template SHOULD provide operational scripts (bash or equivalent) to manage lifecycle:
  - setup, start, stop, logs, wait, deploy, clean (names adaptable)
- These scripts MUST be called by project manager scripts (e.g., npm/pnpm scripts) and constitute the standard execution interface
- Scripts SHOULD accept an environment parameter (local|ci|staging|prod) and apply corresponding config (.env.<env> or config store)

#### 🟡 Provisioning / Deployment (Generic) [SHOULD]

- A staging environment SHOULD be provisioned via IaC (tool of choice) to avoid drift
- Config and secrets SHOULD be centralized (secret manager / parameter store), with stable naming convention (e.g., /<project>/<env>/*)
- Deployment SHOULD avoid manual SSH:
  - Prefer an authenticated remote execution mechanism (agent, session manager, runner, etc.)
  - And idempotent scripts

#### 🔴 Documentation (On-Demand Only) [MUST]

- Documentation MUST be generated ONLY when explicitly requested by the user
- When documentation is requested, it MUST be created in the docs/ directory
- DO NOT create documentation files (.md) proactively without explicit user request
- Exception: README.md files at package/module level for library usage are acceptable

### development (v1.0.0) [core]

Development workflow rules for rapid feedback and quality

#### 🔴 Local-First Feedback Loop [MUST]

- Reproduce and validate changes LOCALLY before triggering CI pipelines
- Use targeted verification (focused tests) closest to the change before running full suite
- DO NOT spam CI reruns without significant changes or locally tested hypothesis
- Run smoke tests locally (start services + verify healthchecks) before push

#### 🔴 Stop and Inform on Blockers [MUST]

When a problem persists and cannot be fixed properly:
- MUST suspend modifications and inform the user with:
  - What is blocking (symptom)
  - What has been tried
  - What remains uncertain
- MUST explicitly propose next steps:
  - Continue (with timebox), OR
  - Alternative/workaround (to ship/progress), OR
  - Scope reduction
- SHOULD timebox investigations before expanding scope

#### 🔴 Document Workarounds and Decisions [MUST]

- DO NOT introduce silent workarounds without explanation
- When a workaround or non-obvious decision is needed, MUST add an English comment near the code explaining:
  - Context (why this exists)
  - Trade-off (what we accept / what we lose)
  - Alternatives considered (at least 1)
  - Why this choice is acceptable for now
- SHOULD create a document in choices/ describing the decision and link it from the comment

Example comment format:
```
// WORKAROUND: <short summary>
// Context: <why this exists>
// Trade-off: <what we accept / what we lose>
// Alternatives: <option A>, <option B>
// Decision record: choices/0001-short-title.md
```

#### 🔴 Testing Philosophy [MUST]

- Fix bugs with a test that captures them (when realistic and stable)
- Maintain clear separation:
  - Unit tests (fast) for domain
  - Integration tests for adapters
  - E2E for critical paths
- DO NOT disable tests to "go faster" without reactivation plan
- SHOULD maintain a smoke test "it starts" (even minimal) to avoid CI round-trips

#### 🔴 Use Project Scripts as Source of Truth [MUST]

- MUST prioritize and maximize use of npm/pnpm scripts defined in package.json files:
  - Root project package.json
  - Sub-folders (apps, services, packages) if specific scripts are defined
- DO NOT execute underlying commands directly (turbo, eslint, docker compose) if equivalent npm/pnpm script exists
- If operational scripts exist (infra/docker/scripts/*):
  - MUST be the standard interface used by npm/pnpm scripts
  - SHOULD manage lifecycle by environment (local|ci|staging|prod)
  - SHOULD centralize setup/start/stop/logs/wait/deploy

#### 🔴 Quality and Consistency Guardrails [MUST]

- Apply lint/format/type-check before push when repo uses them
- SHOULD make small and reversible changes (focused PRs/commits)
- DO NOT mix massive refactor + behavioral fix without necessity (hard to review/debug)

#### 🔴 Playwright MCP Usage [MUST]

- Use Playwright MCP ONLY if necessary (high token cost)
- MUST request user approval before using Playwright MCP
- MUST use it minimally (as light as possible), unless really necessary and approved by user

### ci-cd (v1.0.0) [core]

CI/CD workflow and debugging rules

#### 🔴 Investigate CI Build Failures [MUST]

When a CI build fails:
- MUST use GitHub MCP to examine logs and failure details
- MUST attempt to reproduce the problem LOCALLY first using npm/pnpm commands from package.json files (root and sub-folders)
- MUST use the same commands executed in CI to ensure reproducibility
- DO NOT rerun CI build without attempting local reproduction, unless the problem is clearly CI-environment specific only
- SHOULD document differences between local and CI environment if problem cannot be reproduced locally

#### 🔴 Local Reproduction Commands [MUST]

- MUST consult root package.json to identify available scripts
- MUST consult package.json in sub-folders (apps, services, packages) for specific commands
- MUST use npm/pnpm scripts defined in these files rather than executing underlying commands directly
- SHOULD check CI workflow (.github/workflows/*.yml) to understand exactly which commands are executed

#### 🟡 CI Fix Workflow [SHOULD]

1. Investigation: Use GitHub MCP to examine failure logs
2. Local reproduction: Attempt to reproduce with project npm/pnpm scripts
3. Fix: Apply the correction
4. Local validation: Verify problem is resolved locally
5. Push: Push changes and verify CI passes

#### 🔴 CI Coverage Requirements [MUST]

CI MUST cover at minimum:
- Lint
- Build
- Unit tests
- Type-check (if typed language)

#### 🟡 Smoke Tests in CI [SHOULD]

CI SHOULD execute a smoke/startup test (proof that "it boots"):
- Start the application (docker or dev mode)
- Wait for availability (healthchecks)
- Verify some essential endpoints

E2E tests MAY be executed:
- In the same job after build + startup, OR
- In a separate job (if duration/cost is higher)

#### 🟡 Build Artifact Strategy [SHOULD]

If images are built, strategy SHOULD support:
- Immutable tag (commit SHA)
- Optionally a "latest" tag (or equivalent)
- Deployment path that REUSES these artifacts (no rebuild on target, unless explicit choice)

### testing (v1.0.0) [core]

Testing rules for web applications with browser automation

#### 🔴 Mobile-First Testing (Mandatory) [MUST]

- All browser tests MUST be performed in mobile-first mode
- Use mobile viewport (375×812 or equivalent) by default
- Test mobile view FIRST before testing desktop if necessary
- DO NOT test only on desktop without testing mobile first

Recommended viewports:
- Mobile (priority): 375×812 (iPhone 12/13/14 Pro)
- Desktop (secondary): 1280×800 (for browser compatibility)

#### 🔴 Mobile Interaction Testing [MUST]

- Test touch interactions (clicks, swipes, drags) as priority
- Verify elements are accessible and usable on mobile
- Test bottom menu and bottom sheets which are critical for mobile UX

#### 🔴 Visual Validation [MUST]

- Take screenshots in mobile mode as priority
- Document tests with mobile screenshots
- Desktop screenshots MAY be added for reference, but after mobile tests

#### 🟡 Playwright Testing Workflow [SHOULD]

Example workflow:
1. browser_navigate({ url: "http://localhost:3080" })
2. browser_resize({ width: 375, height: 812 })  // Mobile FIRST
3. browser_take_screenshot({ filename: "feature-mobile.png" })
4. browser_resize({ width: 1280, height: 800 })  // Desktop if needed
5. browser_take_screenshot({ filename: "feature-desktop.png" })