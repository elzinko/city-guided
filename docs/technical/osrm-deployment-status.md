# OSRM – Statut de déploiement

> **Statut actuel** : Code conservé, déploiement désactivé  
> **Date** : 2026-01-17  
> **Raison** : Optimisation des temps de déploiement

## Situation

OSRM (Open Source Routing Machine) est un service de calcul d'itinéraires routiers.
Il nécessite des données cartographiques volumineuses (~1-2 Go pour l'Île-de-France)
et un temps de démarrage significatif.

### Décision

Pour accélérer les déploiements de l'application principale, OSRM est temporairement
exclu du pipeline de déploiement standard. Le code reste en place pour une réactivation future.

## Ce qui est conservé

- ✅ Code du proxy API (`/api/osrm/route`)
- ✅ Configuration Docker (`docker-compose.osrm.yml`, `docker-compose.osrm-data.yml`)
- ✅ Scripts de gestion des données OSRM
- ✅ Documentation technique

## Ce qui est désactivé

- ❌ Inclusion dans le déploiement standard (`start.sh`, `deploy.sh`)
- ❌ Dépendance obligatoire pour le démarrage de l'application

## Impact sur l'application

| Fonctionnalité | Impact |
|----------------|--------|
| **Simulateur de trajet** | ✅ Fonctionne (utilise des trajets prédéfinis avec vitesses manuelles) |
| **Import GPX** | ✅ Fonctionne (pas de dépendance OSRM) |
| **Calcul d'itinéraire dynamique** | ⚠️ Non disponible (feature future) |

## Réactivation future

OSRM sera réactivé quand l'une de ces features sera implémentée :

1. **Création de trajets par l'utilisateur** : clic sur waypoints → calcul itinéraire routier
2. **Vitesses automatiques** : récupération des vitesses légales par segment via annotations OSRM
3. **Validation timing audio guide** : comparaison durée OSRM vs durée segments audio

## Déploiement OSRM indépendant

Si nécessaire, OSRM peut être déployé séparément sur une instance dédiée :

```bash
# Préparer les données (une seule fois)
cd infra/docker
docker-compose -f docker-compose.osrm-data.yml up

# Lancer OSRM
docker-compose -f docker-compose.osrm.yml up -d
```

L'application peut alors pointer vers ce service via `OSRM_URL`.

## Fichiers concernés

```
infra/docker/
├── docker-compose.osrm.yml       # Service OSRM indépendant
├── docker-compose.osrm-data.yml  # Loader de données géographiques
├── osrm-data/                    # Données cartographiques (volume)
└── scripts/
    ├── data.sh                   # Gestion des données OSRM
    └── network.sh                # Création réseau Docker

services/api/src/infrastructure/http/
├── controllers.ts                # proxyOsrmRoute()
└── routes.ts                     # /api/osrm/route
```

## Notes

- Les données OSRM Île-de-France sont déjà préparées dans le volume Docker local
- Le simulateur de trajet fonctionne sans OSRM grâce aux vitesses codées manuellement
- Future amélioration : OSRM pourrait enrichir les trajets GPX avec les vitesses légales
