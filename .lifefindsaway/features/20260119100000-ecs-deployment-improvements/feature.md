# Feature – ECS Deployment Improvements

## Identifiant
FEAT-INFRA-003

## Résumé
Améliorer le processus de déploiement ECS pour garantir zero-downtime, cohérence des scripts, et compatibilité avec le scale-to-zero automatique.

## Problème adressé
- Déploiement ne gérait pas le scale-to-zero (service restait à 0 après déploiement)
- Scripts incohérents (mix de `pnpm --filter`, `cd && pnpm run`, chemins relatifs incorrects)
- Dépendances manquantes dans le CI (workspace `infra/deployment` non inclus)
- Pas de validation du lockfile avant commit
- Risque de coupure de service pendant les déploiements

## Hypothèse de valeur
Un processus de déploiement robuste et cohérent permet de déployer en toute confiance, sans coupure de service, avec une maintenance facilitée.

## Utilisateurs concernés
- DevOps / Admin (déploiement)
- Développeurs (scripts locaux)
- CI/CD (workflow GitHub Actions)

## Scénarios d'usage pressentis

### Scénario 1 : Déploiement avec scale-to-zero
1. Service ECS scaled à 0 (aucune tâche en cours)
2. CI/CD lance le déploiement
3. Script détecte `desiredCount=0`
4. Scale temporairement à 1 pour déployer
5. Rolling update sans coupure
6. Scale-to-zero reprend après 5min si inactif

### Scénario 2 : Déploiement avec service actif
1. Service ECS à `desiredCount=1` (tâche en cours)
2. CI/CD lance le déploiement
3. ECS démarre nouvelle tâche (nouvelle version)
4. Nouvelle tâche devient healthy
5. Ancienne tâche est arrêtée
6. → Zero-downtime deployment

### Scénario 3 : Développeur local
1. Développeur tape `pnpm app:deploy staging --tag test123`
2. Script cohérent (même que CI)
3. Toutes les dépendances installées
4. Déploiement fonctionne identiquement

## Idées de solution (non exclusives)

### Option A : Scripts cohérents + workspace (choisie)
- Pattern uniforme : `cd infra/provisioning/aws && pnpm run <script>`
- Workspace pnpm pour `infra/deployment` et `infra/provisioning/aws`
- Hook pre-commit vérifie lockfile et dépendances
- Simple et maintenable

### Option B : Monorepo complet
- Tout dans des workspaces
- Plus complexe pour un petit projet
- Overhead de configuration

## Critères d'acceptation (brouillon)

### Déploiement
- [x] Déploiement détecte si service scaled à 0
- [x] Scale à 1 pendant déploiement si nécessaire
- [x] Rolling update sans coupure (minHealthyPercent: 0, maxHealthyPercent: 200)
- [x] Compatible scale-to-zero automatique
- [x] Message informatif si service était à 0

### Scripts cohérents
- [x] Pattern `cd ... && pnpm run` partout
- [x] Chemins relatifs corrects (`../../deployment/scripts/`)
- [x] Scripts locaux = scripts CI
- [x] `app:deploy`, `app:deploy:verify` fonctionnels

### Dépendances
- [x] `infra/deployment` ajouté à `pnpm-workspace.yaml`
- [x] `chalk` et `tsx` disponibles pour les scripts
- [x] Workflow CI installe tous les workspaces
- [x] Hook pre-commit vérifie et met à jour lockfile

### Observabilité
- [x] CloudWatch Container Insights activé
- [x] Dashboard Docker-like pour ECS
- [x] Métriques CPU, mémoire, réseau par container
- [x] Logs intégrés par container

## Contraintes connues

### Techniques
- Rolling deployment nécessite au moins 1 tâche
- Premier déploiement peut prendre 2-3 minutes (cold start)
- Scale-to-zero reprend après 5min d'inactivité

### Organisationnelles
- Lockfile doit être committé à chaque changement de dépendances
- CI et local doivent être synchronisés

## Hypothèses explicites
- ✅ Rolling deployment suffit (pas besoin de blue/green pour l'instant)
- ✅ 1 seule instance max suffit pour le staging
- ✅ CloudWatch Container Insights est gratuit pour métriques standard
- ⚠️ Scale-to-zero + déploiement = bonne combinaison

## Dépendances pressenties
- Feature ECS Fargate Migration (FEAT-INFRA-001) - prérequis
- Feature ECS Scale-to-Zero (FEAT-INFRA-002) - prérequis

## Risques identifiés

### Technique
- ⚠️ Déploiement pendant scale-to-zero pourrait échouer si mal géré
  - **Mitigation** : Force `desiredCount=1` pendant déploiement

### Organisationnel
- ⚠️ Lockfile obsolète bloque CI
  - **Mitigation** : Hook pre-commit vérifie et met à jour automatiquement

## Métriques de succès pressenties
- Zéro coupure de service pendant les déploiements
- Déploiement fonctionne identiquement en local et en CI
- Lockfile toujours à jour (hook pre-commit)
- Temps de déploiement < 5 minutes

## Notes implémentation

### Fichiers modifiés
- `.github/workflows/ci.yml` : Installation workspaces, utilise `pnpm app:deploy`
- `package.json` : Scripts cohérents (`app:deploy`, `app:deploy:verify`)
- `pnpm-workspace.yaml` : Ajout `infra/deployment`
- `infra/deployment/scripts/deploy.ts` : Logique scale temporaire à 1
- `infra/provisioning/aws/lib/ecs-stack.ts` : Container Insights activé
- `.husky/pre-commit` : Vérification lockfile

### Commandes disponibles
```bash
# Local
pnpm app:deploy staging --tag abc123
pnpm app:deploy:verify staging

# CI (automatique)
pnpm app:deploy staging --tag "$IMAGE_TAG"
```

### Rolling deployment configuration
```typescript
minHealthyPercent: 0,   // Permet scale-to-zero
maxHealthyPercent: 200  // Permet démarrage nouvelle version avant arrêt ancienne
```

## Statut
✅ **TERMINÉ** - 2026-01-19

### Implémenté
- ✅ Déploiement compatible scale-to-zero
- ✅ Scripts cohérents racine + workspaces
- ✅ Workspace `infra/deployment` ajouté
- ✅ Hook pre-commit vérifie lockfile
- ✅ CloudWatch Container Insights activé
- ✅ Workflow CI mis à jour
- ✅ Documentation dashboards AWS

### Tests effectués
- ✅ `pnpm app:deploy staging --tag test123` fonctionne localement
- ✅ Déploiement démarre le service si scaled à 0
- ✅ Rolling update sans coupure
- ✅ Scripts cohérents entre local et CI
