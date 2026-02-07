# Infrastructure Docker - City-Guided

Architecture unifiée pour le déploiement Docker de City-Guided.

## 📁 Structure

```
infra/deployment/
├── compose/
│   ├── docker-compose.yml              # Application (API + Frontend + Caddy)
│   ├── docker-compose.build.yml        # Build local (override)
│   ├── docker-compose.osrm.yml         # Service OSRM
│   ├── docker-compose.osrm-data.yml    # Chargement données OSRM
│   ├── Dockerfile.api                  # Build API
│   └── Dockerfile.frontend             # Build Frontend
├── scripts/
│   ├── setup.sh                        # Configuration initiale
│   ├── start.sh                        # Démarrage environnement
│   ├── stop.sh                         # Arrêt environnement
│   ├── logs.sh                         # Consultation logs
│   ├── status.sh                       # État des services
│   ├── build.sh                        # Build images
│   ├── deploy.sh                       # Déploiement Docker Compose (local / host)
│   ├── deploy.ts                       # Déploiement ECS (AWS, pnpm deploy)
│   └── clean.sh                        # Nettoyage complet
└── reverse-proxy/
    ├── Caddyfile.local                 # Config Caddy local
    ├── Caddyfile.staging               # Config Caddy staging
    └── Caddyfile.prod                  # Config Caddy production
```

## 🚀 Démarrage rapide

### 1. Configuration initiale (une fois)

```bash
pnpm docker:setup
```

Crée :
- Le réseau Docker `osrm-network`
- Le volume Docker `osrm-data`
- Le fichier `infra/config/.env.local` (depuis `.env.template`)

### 2. Démarrer l'environnement local

```bash
pnpm docker:start local
```

Cette commande :
1. Arrête les conteneurs existants
2. Crée le réseau et volume si nécessaire
3. Charge les données OSRM (première fois uniquement)
4. Démarre le service OSRM
5. Build les images localement (si pas d'images GHCR spécifiées)
6. Démarre l'application (API + Frontend + Caddy)

### 3. Accéder à l'application

- **Frontend** : http://localhost
- **API** : http://localhost/api
- **OSRM** : http://localhost/osrm

### 4. Voir les logs

```bash
# Tous les services
pnpm docker:logs local

# Service spécifique
pnpm docker:logs local api
pnpm docker:logs local web
pnpm docker:logs local osrm

# Mode suivi (-f)
pnpm docker:logs local -f
```

### 5. Arrêter

```bash
pnpm docker:stop local
```

### 6. Nettoyage complet (supprime les données OSRM)

```bash
pnpm docker:clean
```

## 🌍 Environnements

### Local (`local`)

```bash
pnpm docker:start local
```

- Build local des images (ARM64/AMD64)
- Monaco pour OSRM (rapide, 5MB)
- Ports directs : 3080 (web), 4000 (api), 5001 (osrm)
- Caddy sur port 80/443
- **SHOW_DEV_OPTIONS=true** (panneau développeur visible)

### Staging (`staging`)

```bash
pnpm docker:start staging
```

- Images depuis GHCR
- Île-de-France pour OSRM (500MB)
- DuckDNS pour domaine dynamique
- **SHOW_DEV_OPTIONS=true** (tests et démo)

### Production (`prod`)

```bash
pnpm docker:start prod
```

- Images depuis GHCR
- France entière pour OSRM (3.5GB)
- Domaine custom
- **SHOW_DEV_OPTIONS=false** (pas de panneau développeur)

## 🔧 Configuration

### Variables d'environnement

Tous les environnements sont configurés via `infra/config/.env.*` :

```bash
infra/config/
├── .env.template       # Template (versionné)
├── .env.local          # Local (ignoré par git)
├── .env.staging        # Staging (ignoré par git)
└── .env.prod           # Production (ignoré par git)
```

### Variables importantes

```bash
# Environnement
ENVIRONMENT=local                    # local, staging, prod
NODE_ENV=development                 # development, production

# Application
SITE_DOMAIN=localhost                # Domaine public
API_PORT=4000                        # Port API
WEB_PORT=3080                        # Port Frontend
OSRM_PORT=5001                       # Port OSRM

# OSRM
OSRM_REGION=europe/france/ile-de-france  # Région géographique
OSRM_REGION_BASE=europe-france-ile-de-france  # Nom de fichier

# Images Docker (optionnel, sinon build local)
API_IMAGE=ghcr.io/elzinko/city-guided-api:latest
WEB_IMAGE=ghcr.io/elzinko/city-guided-web:latest

# Options développeur (runtime, lu côté serveur)
SHOW_DEV_OPTIONS=true                # Panneau dev GPS/routes
```

### SHOW_DEV_OPTIONS - Variable runtime

**Important** : `SHOW_DEV_OPTIONS` est une variable **runtime** (lue côté serveur dans `_app.tsx`), pas une variable de build.

- ✅ **Avantage** : La même image Docker peut être utilisée pour staging et prod
- ✅ **Configuration** : Via fichier `.env.*` au démarrage du conteneur
- ✅ **Changement** : Redémarrer le conteneur pour appliquer

```bash
# Exemple : activer le panneau dev sur staging
# 1. Modifier infra/config/.env.staging
SHOW_DEV_OPTIONS=true

# 2. Redémarrer le conteneur web
docker restart web
```

## 🐳 Build local vs Images GHCR

### Build local (défaut pour `local`)

```bash
# Build automatique au démarrage
pnpm docker:start local

# Ou build manuel
pnpm docker:build local
```

Avantages :
- Support ARM64 (Apple Silicon)
- Pas besoin de GHCR
- Modifications immédiates

### Images GHCR (défaut pour `staging` et `prod`)

```bash
# Spécifier les images dans .env.*
API_IMAGE=ghcr.io/elzinko/city-guided-api:v1.2.3
WEB_IMAGE=ghcr.io/elzinko/city-guided-web:v1.2.3

pnpm docker:start staging
```

Avantages :
- Images pré-buildées par CI/CD
- Déploiement rapide
- Cohérence entre environnements

## 🗺️ Service OSRM

### Régions disponibles

```bash
# Monaco (rapide, tests)
OSRM_REGION=europe/monaco
OSRM_REGION_BASE=europe-monaco

# Île-de-France (staging)
OSRM_REGION=europe/france/ile-de-france
OSRM_REGION_BASE=europe-france-ile-de-france

# France (production)
OSRM_REGION=europe/france
OSRM_REGION_BASE=europe-france
```

### Changement de région

Pour changer de région :

1. Modifier `infra/config/.env.local`
2. Supprimer les anciennes données : `docker volume rm osrm-data`
3. Redémarrer : `pnpm docker:start local`

Les données seront automatiquement téléchargées et préparées.

## 🔍 Commandes utiles

### Voir l'état

```bash
pnpm docker:status local
```

### Suivre les logs

```bash
pnpm docker:logs local -f
```

### Redémarrer un service

```bash
docker restart web
docker restart api
docker restart osrm
```

### Inspecter le réseau

```bash
docker network inspect osrm-network
```

### Inspecter le volume OSRM

```bash
docker volume inspect osrm-data
docker run --rm -v osrm-data:/data alpine ls -lh /data
```

## 🚨 Dépannage

### Le panneau développeur n'apparaît pas

1. Vérifier la variable dans `.env.local` :
   ```bash
   grep SHOW_DEV_OPTIONS infra/config/.env.local
   ```

2. Vérifier dans le conteneur :
   ```bash
   docker exec web printenv | grep SHOW_DEV
   ```

3. Redémarrer le conteneur :
   ```bash
   docker restart web
   ```

### OSRM ne démarre pas

1. Vérifier que les données sont chargées :
   ```bash
   docker run --rm -v osrm-data:/data alpine ls -lh /data
   ```

2. Recharger les données :
   ```bash
   docker volume rm osrm-data
   pnpm docker:start local
   ```

### Port déjà utilisé

```bash
# Trouver le processus
lsof -i :80
lsof -i :3080
lsof -i :4000

# Arrêter les anciens conteneurs
pnpm docker:stop local
docker ps -a  # Vérifier qu'il ne reste rien
```

## 📚 Architecture

```
┌─────────────────────────────────────────────────┐
│  Caddy (Reverse Proxy)  :80/:443                │
│  ┌──────────┬─────────────┬─────────┐           │
│  │ /        │ /api        │ /osrm   │           │
└──┼──────────┼─────────────┼─────────┼───────────┘
   │          │             │         │
   ▼          ▼             ▼         │
 ┌───┐     ┌─────┐      ┌─────┐      │
 │Web│     │ API │      │OSRM │◄─────┘
 └───┘     └─────┘      └─────┘
           │              │
           │         osrm-network
           │              │
           └──────────────┘
```

## 🔗 Liens utiles

- [Documentation Docker complète](../docker/DOCKER.md) (ancien système - à migrer)
- [Guide de déploiement](./DEPLOYMENT.md)
- [Configuration AWS](../provisioning/aws/README.md)
- [CI/CD](.github/workflows/ci.yml)

## 🗑️ Migration depuis `infra/docker/`

L'ancien système dans `infra/docker/` est **obsolète**. Tout a été migré vers `infra/deployment/`.

Si vous avez des scripts qui référencent `infra/docker/`, mettez-les à jour :

```bash
# Ancien (à NE PLUS utiliser)
cd infra/docker && ./scripts/start.sh local

# Nouveau (à utiliser)
pnpm docker:start local
# ou
cd infra/deployment && ./scripts/start.sh local
```
