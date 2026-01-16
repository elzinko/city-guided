# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CityGuided is a fluid, segmented audio guide tailored for taxi passengers and pedestrians with a mobile-first UX. It's a monorepo using pnpm workspaces and Turborepo for orchestration.

**Tech Stack:**
- Frontend: Next.js 13 (React 18) on port 3080
- API: Fastify with TypeScript on port 4000
- Testing: Vitest (unit), Cucumber + Playwright (E2E/BDD)
- Orchestration: Turborepo, Docker Compose, GitHub Actions
- Infrastructure: AWS CDK (staging), Docker with Caddy reverse proxy, GHCR for images
- Routing: OSRM (OpenStreetMap Routing Machine) in Docker

## Essential Commands

### Development
```bash
pnpm dev                 # Start OSRM + API + Frontend in parallel
SKIP_OSRM=1 pnpm dev       # Start only API + Frontend (skip OSRM)
pnpm build                  # Build all packages via Turborepo
pnpm test                   # Run all unit tests (Vitest)
pnpm test:e2e              # Run E2E tests (Cucumber/Playwright)
pnpm lint                   # Lint entire workspace
```

**Note:** E2E tests require:
- Playwright browsers installed: `cd apps/web-frontend && pnpm exec playwright install chromium`
- Frontend server running: `pnpm dev` (in another terminal)

### Individual Services
```bash
# API only
cd services/api
pnpm dev                    # ts-node-dev with hot reload
pnpm test                   # Vitest unit tests

# Frontend only
cd apps/web-frontend
pnpm dev                    # Next.js dev server on port 3080
pnpm test:e2e              # Run Cucumber/Playwright E2E tests
```

### Docker Operations
```bash
pnpm docker:setup           # Initial Docker setup
pnpm docker:start           # Start all services (local env)
pnpm docker:stop            # Stop all services
pnpm docker:logs            # View logs
pnpm docker:clean           # Clean up volumes and containers
pnpm docker:deploy          # Deploy to staging/prod
```

### Infrastructure
```bash
pnpm provision              # Provision AWS infrastructure (staging)
pnpm ssh                    # SSH into EC2 instance
```

### Git Workflow
The pre-commit hook runs automatic local CI:
1. Installs dependencies (if node_modules missing)
2. Runs `pnpm build`
3. Runs `pnpm test`
4. Runs `pnpm lint`

Bypass with `git commit --no-verify` (avoid unless necessary).

## Architecture

### Monorepo Structure
```
apps/
  web-frontend/          # Next.js app (port 3080)
    tests/e2e/          # Cucumber features + Playwright steps
services/
  api/                   # Fastify API (port 4000)
    src/
      domain/           # Entities and use cases (hexagonal)
      infrastructure/   # HTTP routes, persistence, geo utilities
      main.ts          # Bootstrap: Fastify server + CORS + routes
packages/
  domain/              # Shared domain entities (POI types)
  tts/                 # Text-to-Speech utilities (browser-based)
infra/
  docker/              # Docker Compose, Dockerfiles, Caddy config
  provisioning/aws/    # AWS CDK stacks for staging infrastructure
  scripts/             # Helper scripts (SSH, dev start/stop)
```

### Hexagonal Architecture (API)

The API follows hexagonal/ports-and-adapters pattern:
- **Domain layer** (`domain/`): Pure business logic, entities (`poi.ts`), and use cases (`get-nearby-pois.ts`)
- **Infrastructure layer** (`infrastructure/`):
  - `http/`: Fastify routes and controllers
  - `persistence/`: Repository implementations (currently in-memory)
  - `geo/`: Haversine distance calculations

**Key principle:** Domain layer has no dependencies on frameworks or infrastructure. Repositories are injected via constructor.

### Frontend Architecture

Next.js 13 app with:
- Client-side TTS using browser SpeechSynthesis API
- Leaflet for maps
- Isomorphic fetch for API calls
- E2E tests using Cucumber (BDD) with Playwright

### Docker Architecture

**Local Development:**
- Services connect via `osrm-network` (external) and project-specific network
- OSRM runs separately via `docker-compose.osrm.yml` on port 5001
- Monaco dataset loaded on first run (fast for local dev)

**Staging/Production:**
- Images pulled from GHCR (`ghcr.io/elzinko/city-guided-{api|web}`)
- Caddy provides reverse proxy with automatic HTTPS
- Configuration via `.env.{local|staging|prod}` files
- Health checks for all services

### CI/CD Pipeline

**GitHub Actions workflow** (`.github/workflows/ci.yml`):
1. **Build & Test**: Lint, build, cache artifacts
2. **E2E Tests**: Start services via Docker, run Cucumber tests via Caddy (port 80)
3. **Build Images**: Push to GHCR (on main branch)
4. **Deploy Staging**: Deploy to AWS EC2 via SSM, update DuckDNS, verify deployment

**Auto-deploy**: Pushes to `main` automatically deploy to staging at `https://cityguided.duckdns.org`

### Environment Variables

**Frontend** (`apps/web-frontend/.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_OSRM_URL=http://localhost:5000  # or via API proxy
NEXT_PUBLIC_ADMIN_TOKEN=dev-secret
```

**API** (reads from `process.env` in `main.ts`):
```
PORT=4000
OSRM_URL=http://osrm:5000
NODE_ENV=development
```

**Important:** Packages (`packages/*`) are pure and should NOT read `process.env` directly. Configuration flows from applications/services.

### Testing Strategy

**Unit Tests:**
- Location: `*.test.ts` next to implementation
- Runner: Vitest
- Example: `services/api/src/domain/use-cases/get-nearby-pois.test.ts`

**E2E Tests (BDD):**
- Location: `apps/web-frontend/tests/e2e/`
- Features: `features/*.feature` (Gherkin syntax)
- Steps: `steps/*-steps.ts` (Cucumber step definitions)
- Runner: Playwright via Cucumber.js
- Configuration: `tsconfig.json` in tests directory

**Running a single E2E test:**
```bash
cd apps/web-frontend
TS_NODE_PROJECT=tests/tsconfig.json npx cucumber-js tests/e2e/features/homepage.feature
```

## Key Implementation Details

### POI Management
- POIs stored in `packages/mocks/pois.json` (demo data)
- Admin endpoints at `/api/admin/pois` (CRUD operations)
- Protected via `X-ADMIN-TOKEN` header (dev token: `dev-secret`)
- Public endpoint: `/api/pois?lat=48.8566&lng=2.3522&radius=1000`

### OSRM Integration
- API proxies OSRM at `/api/osrm/route`
- Routing between waypoints for continuous audio guide
- Falls back gracefully if OSRM unavailable
- Local dev uses Monaco dataset; staging uses custom regions

### TTS (Text-to-Speech)
- MVP uses browser's native SpeechSynthesis API (client-side)
- No server-side audio files needed
- Package: `@city-guided/tts` (workspace dependency)

### Deployment Flow
1. Code pushed to `main` → GitHub Actions CI
2. Build and test pass → Docker images built and pushed to GHCR
3. SSM command sent to EC2 instance
4. Instance pulls latest images and restarts containers
5. DuckDNS updated with current IP
6. Caddy obtains/renews SSL certificate
7. Services available at `https://cityguided.duckdns.org`

### AWS Infrastructure
- Provisioned via CDK in `infra/provisioning/aws/`
- Configuration stored in SSM Parameter Store: `/city-guided/staging/*`
- EC2 instance runs Docker Compose
- Security group allows HTTP/HTTPS only
- GitHub Actions deploys via SSM (no direct SSH access needed)

## Common Patterns

### Adding a New API Route
1. Define domain entity in `packages/domain/src/entities/`
2. Create use case in `services/api/src/domain/use-cases/`
3. Add controller method in `services/api/src/infrastructure/http/controllers.ts`
4. Register route in `services/api/src/infrastructure/http/routes.ts`

### Adding a New E2E Test
1. Write feature in `apps/web-frontend/tests/e2e/features/*.feature`
2. Implement steps in `apps/web-frontend/tests/e2e/steps/*-steps.ts`
3. Use Playwright page object from `support/world.ts`

### UI/UX Validation with Playwright MCP

**MANDATORY**: After any UI/UX modification, validate changes using Playwright MCP browser tools.

**MOBILE-FIRST APPROACH**: This application is designed mobile-first. Always test on mobile viewport (375×812) FIRST, then desktop if needed.

**Validation checklist:**
1. Navigate to the modified page(s)
2. **Test on mobile viewport FIRST (375×812)** - This is the primary target
3. Test on desktop viewport (1280×800) - Secondary, for browser compatibility
4. Take screenshots for documentation (mobile screenshots are priority)
5. Verify accessibility via snapshot inspection
6. Test touch interactions (clicks, swipes, drags)
7. Verify bottom menu is always visible and functional
8. Verify bottom sheet slides correctly above the menu

**Playwright MCP commands to use:**
```
browser_navigate    → Navigate to URL
browser_click       → Interact with elements
browser_resize      → Test responsive design
browser_snapshot    → Inspect accessibility tree
browser_take_screenshot → Capture visual state
```

**Example validation flow:**
```
1. browser_navigate({ url: "http://localhost:3080" })
2. browser_resize({ width: 375, height: 812 })  # Mobile
3. browser_click({ element: "Button name", ref: "eXX" })
4. browser_take_screenshot({ filename: "feature-mobile.png" })
5. browser_resize({ width: 1280, height: 800 })  # Desktop
6. browser_take_screenshot({ filename: "feature-desktop.png" })
```

**Key pages to validate:**
- `/` — Main map interface, BottomSheet, GuideControls
- `/admin` — POI management interface

**Note:** Run frontend in dev mode (`pnpm dev`) for hot reload during UI validation. Docker mode requires rebuild to see changes.

### Updating Dependencies
```bash
pnpm -w install <package>              # Root workspace
pnpm --filter services-api add <pkg>  # Specific service
```

### Port Configuration
- Frontend: 3080 (avoids Next.js fallback to 3000)
- API: 4000
- OSRM: 5001 (host), 5000 (container)
- Caddy HTTP: 80
- Caddy HTTPS: 443

Override frontend port: `pnpm --filter apps-web-frontend dev -- --port 3000`
