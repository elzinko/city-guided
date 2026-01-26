# Epic – ECS Infrastructure

## Identifiant
epic-ecs-infrastructure

## Contexte
CityGuided a besoin d'une infrastructure de déploiement fiable, économique et maintenable. Le projet initial utilisait une infrastructure legacy (EC2 ou équivalent) avec des coûts fixes même sans trafic.

Cette Epic regroupe toutes les initiatives liées à la migration vers ECS Fargate et aux améliorations de l'infrastructure de déploiement.

## Problème / Opportunité
**Problèmes initiaux :**
- Coûts infrastructure fixes (~12-15€/mois) même sans trafic
- Maintenance manuelle (patches, mises à jour)
- Pas de scale automatique
- Déploiements risqués (downtime potentiel)

**Opportunité :**
- ECS Fargate offre scale-to-zero natif
- Paiement à l'usage uniquement
- Infrastructure managée par AWS
- Déploiements zero-downtime

## Hypothèse de valeur
La migration vers ECS Fargate permet de :
- Réduire les coûts (paiement à l'usage)
- Éliminer la maintenance infrastructure
- Améliorer la fiabilité des déploiements
- Faciliter les tests et le staging

✅ Hypothèses validées par l'implémentation

## Objectifs (non contractuels)
- ✅ Déploiement automatisé via CDK
- ✅ Scale-to-zero après inactivité
- ✅ Zero-downtime deployments
- ✅ Observabilité (CloudWatch Container Insights)
- ✅ Coût mensuel < 25€ en staging

## Utilisateurs / Parties prenantes
- **DevOps / Admin** : Gestion et monitoring infrastructure
- **Développeurs** : Déploiements simplifiés
- **CI/CD** : Workflows automatisés
- **Utilisateurs finaux** : Disponibilité et performance

## Périmètre pressenti
### Inclus
- Migration vers ECS Fargate
- Configuration ALB et health checks
- Scale-to-zero automatique (Lambda warmkeeper)
- Déploiements zero-downtime (rolling update)
- Observabilité CloudWatch
- Scripts de déploiement cohérents
- Documentation technique

### Exclus
- Blue/green deployments (suffisant avec rolling update)
- Multi-région (pas nécessaire actuellement)
- Kubernetes (ECS suffit pour ce projet)

## Features (implémentées)

### ✅ FEAT-INFRA-001 : ECS Fargate Migration
**Fichier :** `20260115100000-ecs-fargate-migration/feature.md`
- Stack CDK complète pour ECS
- Containers API + Web + Caddy
- ALB avec health checks
- Mode dual (legacy/ECS) puis full ECS

### ✅ FEAT-INFRA-002 : ECS Scale-to-Zero
**Fichier :** `20260116100000-ecs-scale-to-zero/feature.md`
- Lambda warmkeeper pour le scale-up
- CloudWatch alarms pour détecter l'inactivité
- Webhook Caddy pour maintenir le service actif
- Dashboard monitoring

### ✅ FEAT-INFRA-003 : ECS Deployment Improvements
**Fichier :** `20260119100000-ecs-deployment-improvements/feature.md`
- Déploiement compatible scale-to-zero
- Scripts cohérents (local = CI)
- Rolling update zero-downtime
- Hook pre-commit pour lockfile
- CloudWatch Container Insights

### ❌ Docker Compose ECS Unification (discarded)
**Fichier :** `20260120171923-docker-compose-ecs-unification/feature.md`
- Tentative d'unification docker-compose et ECS
- Abandonné : complexité trop élevée pour le bénéfice

## Hypothèses explicites
- ✅ Cold start < 60s acceptable
- ✅ ALB fixe compensé par économies scale-to-zero
- ✅ Une seule instance max suffit pour staging
- ✅ Rolling deployment suffit (pas blue/green)

## Questions ouvertes
- Production : même configuration ou ajustements ?
- Multi-environnement : stack CDK générique ?
- OSRM : ajouter comme service ECS plus tard ?

## Risques pressentis
- ~~Cold start trop long~~ → Validé OK (< 60s)
- ~~Coût ALB~~ → Compensé par scale-to-zero
- ~~Debugging ECS complexe~~ → Container Insights aide

## Métriques de succès
- ✅ Scale-to-zero fonctionne après 5 min
- ✅ Scale-up < 60 secondes
- ✅ Coût < 25€/mois en staging
- ✅ Zero downtime deployments
- ✅ Scripts locaux = CI

## Documentation technique
- `docs/technical/ecs-fargate-migration.md`
- `docs/technical/ecs-scale-to-zero.md`
- `infra/provisioning/aws/lib/ecs-stack.ts`
- `infra/deployment/scripts/deploy.ts`

## Statut
✅ **TERMINÉ** - Toutes les features sont implémentées et validées.

## Notes libres
Infrastructure legacy entièrement supprimée. Le mode `--mode legacy` n'existe plus.

Cette Epic est considérée comme terminée mais peut être réouverte si :
- Besoin d'optimisations de performance
- Migration vers production avec ajustements
- Ajout de nouveaux services (OSRM, etc.)
