# CityGuided — Monorepo MVP

[![CI](https://github.com/elzinko/city-guided/actions/workflows/ci.yml/badge.svg)](https://github.com/elzinko/city-guided/actions/workflows/ci.yml)

Fluid, segmented audio guide tailored for taxi passengers (and pedestrians) with mobile-first UX.

Structure minimale : `apps/`, `services/`, `packages/`, `infra/`

## Prérequis
- pnpm (v7+)
- Node 18+
- git
- Docker Desktop

## Quick start

1. **Installer** : `pnpm install`

2. **Développement** : `pnpm dev`
   > Démarre automatiquement Docker si nécessaire. Les URLs apparaissent dans les logs.

3. **Tests** : `pnpm test`

## Configuration

Voir les configurations de déploiement dans [config](./infra/config).

## Scripts disponibles

Toutes les commandes dans [package.json](./package.json) :

## Architecture

- **TTS** : API SpeechSynthesis du navigateur (côté client)
- **Mocks** : [`packages/mocks/pois.json`](./packages/mocks/pois.json)
- **Admin** : `/api/admin/pois` avec header `X-ADMIN-TOKEN`
- **OSRM** : Routage optionnel via Docker (profil `osrm`)
