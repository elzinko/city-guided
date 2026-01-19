# I AM THE LAW ⚖️

> *"I am the law!"* — Judge Dredd

Point d'entrée unique pour tous les LLM/agents conversationnels.

## How to Read

- **🔴 MUST / DOIT** : Non-negotiable requirement
- **🟡 SHOULD / DEVRAIT** : Recommended, exceptions must be justified
- **🟢 MAY / PEUT** : Optional, use when beneficial

## Contexte du projet

- **DOIT** : Lire [RESUME.md](../RESUME.md) pour le contexte complet du projet

## Méthode agile

- **DOIT** : Lire et respecter [agile/README.md](../agile/README.md)
- **DOIT** : Appliquer les rôles définis dans [agile/AGENTS.md](../agile/AGENTS.md)

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

## Règles du projet

Les règles suivantes **DOIVENT** être lues et appliquées :

- **DOIT** : Lire et appliquer [ARCHITECT_STARTER_RULES](../rules/ARCHITECT_STARTER_RULES.md)
- **DOIT** : Lire et appliquer [CI_STARTER_RULES](../rules/CI_STARTER_RULES.md)
- **DOIT** : Lire et appliquer [DEV_STARTER_RULES](../rules/DEV_STARTER_RULES.md)
- **DOIT** : Lire et appliquer [TESTS_STARTER_RULES](../rules/TESTS_STARTER_RULES.md)