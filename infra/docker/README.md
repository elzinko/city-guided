# Docker Compose - Architecture découplée

> **📖 [Complete English Documentation](./DOCKER.md)** - Comprehensive guide with all commands and troubleshooting

Cette architecture sépare les préoccupations en trois composants indépendants :

1. **Application** (`docker-compose.yml`) - Frontend + API
2. **Service OSRM** (`docker-compose.osrm.yml`) - Service de routage
3. **Données OSRM** (`docker-compose.osrm-data.yml`) - Chargement des données géographiques

**Un seul set de fichiers** pour tous les environnements (local, staging, prod), configurés via fichiers `.env`.

## 📋 Configuration par environnement

```bash
# Copier le template
cp .env.example .env.local

# Éditer selon l'environnement
# .env.local    → Développement local (Monaco, ports 3000/3001)
# .env.staging  → Staging AWS (Île-de-France, nginx, DuckDNS)
# .env.prod     → Production (France entière, nginx, domaine custom)
```

**Important** : Les fichiers `.env.*` sont gitignored. Seul `.env.example` est versionné.

## 🚀 Démarrage rapide

### Scripts NPM (recommandé)

```bash
# 1. Configuration initiale (une seule fois)
npm run docker:setup

# 2. Démarrer l'environnement local
npm run docker:local:start

# 3. Voir les logs
npm run docker:local:logs

# 4. Arrêter
npm run docker:local:stop
```

### Commandes manuelles (si besoin)

```bash
# 1. Créer le réseau partagé
docker network create osrm-network

# 2. Créer le volume pour les données OSRM
docker volume create osrm-data

# 3. Charger les données OSRM
docker-compose --env-file .env.local -f docker-compose.osrm-data.yml up

# 4. Démarrer le service OSRM
docker-compose --env-file .env.local -f docker-compose.osrm.yml up -d

# 5. Démarrer l'application
docker-compose --env-file .env.local up -d
```

### Première installation - Staging/Prod

```bash
# 1. Setup initial (identique)
docker network create osrm-network
docker volume create osrm-data

# 2. Charger les données (région selon env)
docker-compose --env-file .env.staging -f docker-compose.osrm-data.yml up

# 3. Démarrer OSRM
docker-compose --env-file .env.staging -f docker-compose.osrm.yml up -d

# 4. Démarrer l'application avec nginx
docker-compose --env-file .env.staging --profile nginx up -d
```

### Utilisation quotidienne

```bash
# Local
docker-compose --env-file .env.local up -d
docker-compose --env-file .env.local down

# Staging
docker-compose --env-file .env.staging --profile nginx up -d
docker-compose --env-file .env.staging --profile nginx down

# Voir les logs
docker-compose --env-file .env.local logs -f
docker-compose --env-file .env.local -f docker-compose.osrm.yml logs -f
```

## 📦 Composants

### 1. Application (`docker-compose.yml`)

Services principaux de l'application :
- **web** : Frontend Next.js (port 3000)
- **api** : Backend API (port 3001)

Connecte automatiquement au service OSRM via le réseau `osrm-network`.

### 2. Service OSRM (`docker-compose.osrm.yml`)

Service de routage OSRM avec :
- Port 5000 exposé
- Données en lecture seule depuis le volume `osrm-data`
- Healthcheck automatique
- Redémarrage automatique sauf arrêt manuel

**Cycle de vie indépendant** : Peut tourner sans interruption même pendant le redéploiement de l'application.

### 3. Chargement de données (`docker-compose.osrm-data.yml`)

Pipeline de préparation des données en 4 étapes :
1. **Download** : Télécharge le fichier PBF depuis Geofabrik
2. **Extract** : Extrait les données pour OSRM
3. **Partition** : Partitionne le graphe routier
4. **Customize** : Optimise pour l'algorithme MLD

## 🌍 Régions disponibles

Les régions sont configurées dans les fichiers `.env.*` :

```bash
# .env.local → Monaco (rapide, 5MB)
OSRM_REGION=europe/monaco
OSRM_REGION_BASE=europe-monaco

# .env.staging → Île-de-France (500MB)
OSRM_REGION=europe/france/ile-de-france
OSRM_REGION_BASE=europe-france-ile-de-france

# .env.prod → France entière (3.5GB)
OSRM_REGION=europe/france
OSRM_REGION_BASE=europe-france
```

**Override ponctuel** :
```bash
# Tester une autre région sans modifier .env
OSRM_REGION=europe/andorra docker-compose --env-file .env.local -f docker-compose.osrm-data.yml up
```

### Autres régions

Toutes les régions de [Geofabrik](https://download.geofabrik.de/) sont supportées :

```bash
# Format: continent/pays/region OU continent/pays
OSRM_REGION=europe/germany/berlin docker-compose -f docker-compose.osrm-data.yml up
OSRM_REGION=north-america/us/california docker-compose -f docker-compose.osrm-data.yml up
OSRM_REGION=asia/japan docker-compose -f docker-compose.osrm-data.yml up
```

## 🔄 Migration de données OSRM

Le service OSRM peut continuer à tourner pendant la préparation de nouvelles données :

```bash
# 1. Créer un nouveau volume pour les nouvelles données
docker volume create osrm-data-new

# 2. Charger les nouvelles données (par ex: passer de Monaco à Île-de-France)
# Modifier temporairement docker-compose.osrm-data.yml pour utiliser osrm-data-new
OSRM_REGION=europe/france/ile-de-france docker-compose -f docker-compose.osrm-data.yml up

# 3. Arrêter le service OSRM
docker-compose -f docker-compose.osrm.yml down

# 4. Modifier docker-compose.osrm.yml pour pointer vers osrm-data-new
# volumes:
#   - osrm-data-new:/data:ro

# 5. Redémarrer OSRM avec les nouvelles données
OSRM_REGION_BASE=europe-france-ile-de-france docker-compose -f docker-compose.osrm.yml up -d

# 6. Supprimer l'ancien volume (optionnel)
docker volume rm osrm-data

# 7. Renommer le nouveau volume (optionnel)
docker volume create osrm-data
# Copier les données de osrm-data-new vers osrm-data
# Puis supprimer osrm-data-new
```

## 🧪 Tests E2E

Les tests E2E utilisent automatiquement Monaco (rapide) via GitHub Actions.

Voir `.github/workflows/e2e-tests.yml` pour le workflow complet.

## 🛠 Commandes utiles

```bash
# Vérifier l'état des services
docker-compose ps
docker-compose -f docker-compose.osrm.yml ps

# Voir les logs en temps réel
docker-compose logs -f api
docker-compose -f docker-compose.osrm.yml logs -f

# Redémarrer OSRM (après changement de données)
docker-compose -f docker-compose.osrm.yml restart

# Nettoyer tout
docker-compose down -v
docker-compose -f docker-compose.osrm.yml down
docker network rm osrm-network
docker volume rm osrm-data

# Tester OSRM
curl "http://localhost:5000/route/v1/driving/2.3522,48.8566;2.2945,48.8584?overview=false"
```

## 📊 Ressources requises

| Région | Taille PBF | RAM requise | Temps de préparation |
|--------|-----------|-------------|---------------------|
| Monaco | ~5 MB | 512 MB | 1-2 min |
| Andorre | ~10 MB | 512 MB | 2-3 min |
| Île-de-France | ~500 MB | 2-4 GB | 10-15 min |
| France | ~3.5 GB | 8-16 GB | 45-60 min |
| Europe | ~25 GB | 32+ GB | 3-4 h |

## 🏗 Architecture

```
┌─────────────────────────────────────────────────┐
│  Application (docker-compose.yml)               │
│  ┌──────────┐  ┌──────────┐                    │
│  │ Frontend │  │   API    │                     │
│  │  :3000   │  │  :3001   │                     │
│  └────┬─────┘  └────┬─────┘                     │
│       │             │                            │
│       └─────────────┴──────┐                     │
└────────────────────────────┼─────────────────────┘
                             │
                        osrm-network
                             │
┌────────────────────────────┼─────────────────────┐
│  Service OSRM (docker-compose.osrm.yml)         │
│                            │                     │
│                      ┌─────┴─────┐               │
│                      │   OSRM    │               │
│                      │   :5000   │               │
│                      └─────┬─────┘               │
│                            │                     │
│                            │ (read-only)         │
│                      ┌─────┴─────┐               │
│                      │ osrm-data │               │
│                      │  volume   │               │
│                      └─────▲─────┘               │
└────────────────────────────┼─────────────────────┘
                             │
                             │ (write once)
                             │
┌────────────────────────────┼─────────────────────┐
│  Data Loader (docker-compose.osrm-data.yml)     │
│                            │                     │
│  ┌──────────┐   ┌─────────┴────┐   ┌──────────┐│
│  │ Download │→→→│   Extract    │→→→│ Partition││
│  └──────────┘   └──────────────┘   └────┬─────┘│
│                                          │      │
│                                    ┌─────▼─────┐│
│                                    │ Customize ││
│                                    └───────────┘│
└─────────────────────────────────────────────────┘
```

## 🎯 Principes de conception

1. **Séparation des préoccupations** : Chaque compose a une responsabilité unique
2. **Cycle de vie indépendant** : OSRM peut tourner sans redémarrage de l'app
3. **Migration sans downtime** : Préparer de nouvelles données pendant que OSRM tourne
4. **Simplicité** : Pas de profiles, composition claire
5. **12-factor** : Configuration via variables d'environnement

## 📝 Notes

- Les données OSRM sont montées en **lecture seule** dans le service OSRM
- Le volume `osrm-data` doit être créé **avant** le premier usage
- Le réseau `osrm-network` doit être créé **avant** de démarrer les services
- Les données sont **réutilisées** : pas besoin de re-télécharger à chaque démarrage
- Pour changer de région, il faut **redémarrer OSRM** (pas l'application)
