# CityGuided — Monorepo MVP

[![CI](https://github.com/elzinko/city-guided/actions/workflows/ci.yml/badge.svg)](https://github.com/elzinko/city-guided/actions/workflows/ci.yml)

Fluid, segmented audio guide tailored for taxi passengers (and pedestrians) with mobile-first UX.

Structure minimale : `apps/`, `services/`, `packages/`, `infra/`

## Quick start (très rapide)
Prérequis : pnpm (v7+), Node 18+, git

1) Installer les dépendances (depuis la racine du repo) :

   pnpm install

   > Sur la première installation le script `prepare` initialise Husky.

2) Lancer en mode développement (frontend + API en parallèle) :

   pnpm dev

   - Frontend : http://localhost:3080
   - API : http://localhost:3001

3) Build (pour production) :

   pnpm build

4) Tests :

   pnpm test

   - Un hook Husky `pre-commit` exécute une mini CI locale : if needed `pnpm -w install` (only when node_modules missing), then `pnpm -w build`, `pnpm -w test` et `pnpm -w lint`. Le commit est annulé si une étape échoue.
   - Pour passer outre localement (à éviter) : `git commit --no-verify`

## Commandes utiles (monorepo)
- `pnpm install` — installer toutes les dépendances
- `pnpm dev` — démarrer les apps/services en dev (via Turborepo)
- `pnpm build` — builder tous les packages
- `pnpm test` — exécuter tous les tests
- `pnpm -w lint` — lint sur tout le workspace

## Démarrage local individuel
- API :
  - cd services/api
  - pnpm install
  - pnpm run dev (ou `pnpm run test` pour lancer les tests unitaires)

- Frontend :
  - cd apps/web-frontend
  - pnpm install
  - pnpm run dev

## Variables d'environnement (dev)
- `apps/web-frontend/.env.local` :

  NEXT_PUBLIC_API_URL=http://localhost:3001
  NEXT_PUBLIC_ADMIN_TOKEN=dev-secret

- `services/api/.env.example` contient des exemples (ne commit pas de secrets).

## Notes importantes
- TTS (MVP) : le frontend utilise l'API SpeechSynthesis du navigateur (Text-to-Speech côté client). Pas de fichiers audio nécessaires pour l'instant.
- Mocks : `packages/mocks/pois.json` contient les POI de démonstration.
- Admin : endpoints CRUD sous `/api/admin/pois` protégé par header `X-ADMIN-TOKEN` (dev: `dev-secret`).
- Architecture : séparation hexagonale (domain/use-cases/infrastructure). Les packages sont purs et ne lisent pas `process.env` directement.
- Ports dev : le frontend démarre sur `3080` (pour éviter le fallback Next.js sur `3001` quand `3000` est occupé) et l'API sur `3001`. Tu peux changer le port frontend avec `pnpm --filter apps/web-frontend dev -- --port 3000`.
- Routage local (optionnel) : OSRM est packagé dans `infra/docker/docker-compose.yml` (profil `osrm`).
  - depuis `infra/docker/`: `OSRM_REGION_BASE=ile-de-france-latest OSRM_PBF_URL=https://download.geofabrik.de/europe/france/ile-de-france-latest.osm.pbf docker compose --profile osrm up osrm-download osrm-prep osrm`
  - chaîne complète : `osrm-download` (télécharge le PBF avec curl) → `osrm-prep` (extract/partition/customize) → `osrm` (écoute sur :5001 côté host, 5000 dans le conteneur). Données dans `infra/docker/osrm-data/`.
  - Dans le frontend, mettre `NEXT_PUBLIC_OSRM_URL=http://localhost:3001/api/osrm` (ou `http://localhost:5001/route` si tu appelles OSRM direct), sinon le fallback utilise `NEXT_PUBLIC_API_URL` + `/api/osrm`.
- `pnpm dev` démarre automatiquement OSRM via Docker Compose (profil `osrm`). Si Docker n'est pas dispo ou pour ignorer OSRM : `SKIP_OSRM=1 pnpm dev` ou `OSRM_AUTO=0 pnpm dev`.

## Docker / infra
- Un docker-compose minimal est disponible dans `infra/docker/docker-compose.yml` pour lancer frontend + api.

## Prochaines étapes recommandées
- ✅ CI/CD avec GitHub Actions (build, lint, tests, auto-deploy staging)
- Ajouter tests E2E (Playwright) et coverage
- Améliorer TTS côté serveur (post-MVP)

---

Si tu veux, j'ajoute une section « checklist pour contribution » (hooks, conventions commit, PR template).
