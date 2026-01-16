# Guide de débogage Docker - City Guided

## 📋 Voir les containers en cours d'exécution

### Commandes Docker directes

```bash
# Voir tous les containers (y compris arrêtés)
docker ps -a

# Voir uniquement les containers en cours d'exécution
docker ps

# Filtrer par nom de projet
docker ps --filter "name=city-guided"

# Voir l'état détaillé avec ports
docker ps --filter "name=city-guided" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Via les scripts du projet

```bash
# Après avoir démarré avec pnpm docker:start local
# Le script start.sh affiche automatiquement le statut des containers
```

## 📝 Voir les logs des containers

### Commandes rapides

```bash
# Logs de tous les services (en temps réel)
pnpm docker:logs local

# Logs d'un service spécifique
pnpm docker:logs local api
pnpm docker:logs local web
pnpm docker:logs local caddy
pnpm docker:logs local osrm

# Logs avec nombre de lignes spécifique (dernières 100 lignes)
pnpm docker:logs local api 100
```

### Commandes Docker directes

```bash
# Logs d'un container spécifique (en temps réel)
docker logs -f city-guided-local-api
docker logs -f city-guided-local-web
docker logs -f city-guided-local-caddy
docker logs -f city-guided-local-osrm

# Dernières 50 lignes (sans suivi)
docker logs --tail 50 city-guided-local-api

# Logs depuis une date/heure spécifique
docker logs --since 10m city-guided-local-api
docker logs --since 2024-01-01T10:00:00 city-guided-local-api
```

### Via docker compose

```bash
cd infra/deployment

# Logs de tous les services
docker compose -f compose/docker-compose.yml --env-file ../config/.env.local logs -f

# Logs d'un service spécifique
docker compose -f compose/docker-compose.yml --env-file ../config/.env.local logs -f api
docker compose -f compose/docker-compose.yml --env-file ../config/.env.local logs -f web
docker compose -f compose/docker-compose.yml --env-file ../config/.env.local logs -f caddy

# Logs OSRM (fichier compose différent)
docker compose -f compose/docker-compose.yml --env-file ../config/.env.local -f ../docker/docker-compose.osrm.yml logs -f
```

## 🔍 Diagnostiquer un problème d'accès

### 1. Vérifier que les containers sont démarrés

```bash
docker ps --filter "name=city-guided"
```

Vous devriez voir au minimum :
- `city-guided-local-api` (ou `city-guided-<env>-api`)
- `city-guided-local-web` (ou `city-guided-<env>-web`)
- `city-guided-local-caddy` (ou `city-guided-<env>-caddy`)
- `city-guided-local-osrm` (ou `city-guided-<env>-osrm`) - optionnel

### 2. Vérifier les ports exposés

```bash
docker ps --filter "name=city-guided" --format "table {{.Names}}\t{{.Ports}}"
```

Ports attendus (par défaut en local) :
- **Caddy** : `80:80`, `443:443` (reverse proxy)
- **Web** : `3080:3080` (accès direct)
- **API** : `4000:4000` (accès direct)
- **OSRM** : `5001:5000` (accès direct)

### 3. Vérifier les logs pour les erreurs

```bash
# Logs Caddy (reverse proxy)
pnpm docker:logs local caddy

# Logs Web (frontend)
pnpm docker:logs local web

# Logs API (backend)
pnpm docker:logs local api
```

### 4. Tester la connectivité

```bash
# Tester Caddy (reverse proxy)
curl -I http://localhost

# Tester le frontend directement
curl -I http://localhost:3080

# Tester l'API directement
curl http://localhost:4000/api/health

# Tester OSRM
curl "http://localhost:5001/nearest/v1/driving/2.3522,48.8566"
```

### 5. Vérifier les healthchecks

```bash
# Voir l'état des healthchecks
docker ps --filter "name=city-guided" --format "table {{.Names}}\t{{.Status}}"
```

Un container en bonne santé devrait afficher `Up X minutes (healthy)`.

## 🛠️ Commandes utiles pour le débogage

### Redémarrer un service

```bash
# Redémarrer un container spécifique
docker restart city-guided-local-api

# Redémarrer tous les services
pnpm docker:stop local
pnpm docker:start local
```

### Entrer dans un container

```bash
# Shell interactif dans un container
docker exec -it city-guided-local-api sh
docker exec -it city-guided-local-web sh
docker exec -it city-guided-local-caddy sh
```

### Voir les variables d'environnement d'un container

```bash
docker exec city-guided-local-api env
docker exec city-guided-local-web env
```

### Voir la configuration réseau

```bash
# Voir les réseaux Docker
docker network ls

# Inspecter le réseau
docker network inspect city-guided-network
docker network inspect osrm-network
```

### Voir les volumes

```bash
# Lister les volumes
docker volume ls

# Inspecter un volume
docker volume inspect osrm-data
```

## 🚨 Problèmes courants

### Les containers ne démarrent pas

```bash
# Vérifier les logs de démarrage
docker logs city-guided-local-api
docker logs city-guided-local-web

# Vérifier les ports disponibles
lsof -i :80
lsof -i :3080
lsof -i :4000
```

### Erreur de connexion à OSRM

```bash
# Vérifier que OSRM est démarré
docker ps --filter "name=osrm"

# Vérifier les logs OSRM
pnpm docker:logs local osrm

# Tester OSRM directement
curl "http://localhost:5001/nearest/v1/driving/2.3522,48.8566"
```

### Caddy ne route pas correctement

```bash
# Vérifier la configuration Caddy
docker exec city-guided-local-caddy cat /etc/caddy/Caddyfile

# Vérifier les logs Caddy
pnpm docker:logs local caddy
```

### Le frontend ne charge pas

```bash
# Vérifier les logs du frontend
pnpm docker:logs local web

# Vérifier que l'API est accessible depuis le frontend
docker exec city-guided-local-web wget -O- http://api:4000/api/health
```

## 📚 Ressources

- Scripts de logs : `infra/deployment/scripts/logs.sh`
- Scripts de démarrage : `infra/deployment/scripts/start.sh`
- Documentation Docker : `infra/docker/README.md`
