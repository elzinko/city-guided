# CityGuided — Monorepo MVP

Structure minimale : `apps/`, `services/`, `packages/`, `infra/`

## Quick start (très rapide)
Prérequis : pnpm (v7+), Node 18+, git

1) Installer les dépendances (depuis la racine du repo) :

   pnpm install

   > Sur la première installation le script `prepare` initialise Husky.

2) Lancer en mode développement (frontend + API en parallèle) :

   pnpm dev

   - Frontend : http://localhost:3002
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
- Ports dev : le frontend démarre sur `3002` (pour éviter le fallback Next.js sur `3001` quand `3000` est occupé) et l'API sur `3001`. Tu peux changer le port frontend avec `pnpm --filter apps/web-frontend dev -- --port 3000`.

## Docker / infra
- Un docker-compose minimal est disponible dans `infra/docker/docker-compose.yml` pour lancer frontend + api.

## Prochaines étapes recommandées
- Affiner la CI (GitHub Actions) : build + test + lint
- Ajouter tests E2E (Playwright) et coverage
- Améliorer TTS côté serveur (post-MVP)

---

Si tu veux, j'ajoute une section « checklist pour contribution » (hooks, conventions commit, PR template).
