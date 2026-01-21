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

## Infrastructure AWS

Déploiement sur AWS ECS Fargate avec scale-to-zero automatique pour optimiser les coûts.

### Scale-to-Zero

Le système scale automatiquement le service ECS :
- **0 → 1** : Dès la première requête (délai: 2-4 min)
- **1 → 0** : Après 5 minutes d'inactivité

**Documentation** :
- Architecture & développement : [`infra/provisioning/aws/lambdas/README.md`](./infra/provisioning/aws/lambdas/README.md)
- Guide technique complet : [`docs/technical/ecs-scale-to-zero.md`](./docs/technical/ecs-scale-to-zero.md)
- Guide développeur : [`infra/provisioning/aws/lambdas/DEV.md`](./infra/provisioning/aws/lambdas/DEV.md)

**Monitoring** : Dashboard CloudWatch `CityGuided-ECS-ScaleToZero`

**Économies estimées** : ~25€/mois (si inactif 20h/jour)

## Projets annexes

- [lifealwaysfindaway](./lifefindsaway/)
- [iamthelaw](./iamthelaw/)