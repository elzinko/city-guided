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

4. **Infra Provisioning** : `pnpm infra:provision:aws staging`

5. **Infra status** : `pnpm infra:status`

## Configuration

Voir les configurations de déploiement dans [config](./infra/config).

## Scripts disponibles

Toutes les commandes dans [package.json](./package.json) :

## Infrastructure AWS

Déploiement sur AWS ECS Fargate avec scale-to-zero automatique pour optimiser les coûts.

## Projets annexes

### Packages npm réutilisables

Ce projet contient deux packages npm qui peuvent être installés dans d'autres projets:

- **[@bacasable/lifefindsaway](./.lifefindsaway/)** - Système d'idéation et exploration de features (Phase A)
- **[@bacasable/iamthelaw](./.iamthelaw/)** - Système de gestion de règles LLM pour développement

**📚 Documentation:**
- [PACKAGES.md](./PACKAGES.md) - Guide complet d'installation et publication
- [QUICKSTART-PACKAGES.md](./QUICKSTART-PACKAGES.md) - Démarrage rapide
- [ALTERNATIVE-VERDACCIO.md](./ALTERNATIVE-VERDACCIO.md) - Configuration registre privé

**🚀 Utilisation rapide:**

```bash
# Publier sur GitHub Packages
./scripts/publish-package.sh both patch

# Installer dans un autre projet
echo "@bacasable:registry=https://npm.pkg.github.com" > .npmrc
pnpm add @bacasable/lifefindsaway @bacasable/iamthelaw
```