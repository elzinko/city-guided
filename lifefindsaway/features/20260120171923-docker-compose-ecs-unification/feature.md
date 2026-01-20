# Feature – Docker Compose ECS Unification (Enabler)

## Identifiant
FEAT-INFRA-004

## Résumé
Explorer la migration vers une approche unifiée Docker Compose pour déployer sur ECS, permettant d'utiliser le même `docker-compose.yml` du développement local jusqu'à la production, tout en restant indépendant d'AWS.

## Problème adressé

### Problèmes actuels identifiés

1. **Builds multiples et redondants** (problème majeur)
   - `build-and-test` : `pnpm run build` → Build tous les packages
   - `e2e-tests` : `pnpm install` → RE-BUILD tous les packages (cache mal utilisé)
   - `build-images` : `docker build` → RE-BUILD ENCORE dans les Dockerfiles
   - **Impact** : Temps de CI/CD ~15-20 min au lieu de ~8-10 min

2. **Dualité de configuration**
   - `docker-compose.yml` pour local/staging/prod (EC2)
   - `ecs-stack.ts` (CDK) pour ECS avec Task Definitions manuelles
   - Script `deploy.ts` qui met à jour les Task Definitions
   - **Impact** : Maintenance de 2 systèmes, risque de désynchronisation

3. **Steps CI/CD incohérents**
   - Step "Verify deployment (EC2)" s'exécute même en mode ECS (bug SSM)
   - DuckDNS update ne fonctionne pas en ECS (nécessite IP, pas DNS ALB)

4. **Manque de cohérence 12-Factor**
   - Même stack du dev jusqu'à la prod = principe 12-Factor
   - Actuellement : docker-compose local, CDK pour ECS

## Hypothèse de valeur

Unifier le déploiement avec Docker Compose permettrait :
- ✅ **Même stack dev → prod** (12-Factor App compliance)
- ✅ **Réduction des builds redondants** (cache partagé)
- ✅ **Maintenance simplifiée** (un seul fichier docker-compose.yml)
- ✅ **Indépendance d'AWS** (docker-compose peut cibler d'autres clouds)
- ✅ **Workflow plus simple** : `docker compose up` partout

⚠️ **Hypothèse non validée** : Docker Compose ECS contexts sont **dépréciés depuis novembre 2023**.

## Utilisateurs concernés

- **Développeurs** : Workflow unifié local/prod
- **DevOps** : Maintenance simplifiée, moins de duplication
- **CI/CD** : Pipeline plus rapide (moins de builds)

## Scénarios d'usage pressentis

### Scénario 1 : Développement local
```bash
# Actuel
docker compose --env-file .env.local up -d

# Avec unification ECS
docker compose --env-file .env.local up -d  # Même commande !
```

### Scénario 2 : Déploiement staging/prod
```bash
# Actuel
pnpm app:deploy staging --tag abc123  # Script custom qui met à jour Task Definitions

# Avec unification ECS
docker compose --context ecs --env-file .env.staging up -d  # Si contexts fonctionnent
# OU
docker compose --env-file .env.staging up -d  # Si outil tiers traduit vers ECS
```

### Scénario 3 : CI/CD simplifié
```yaml
# Actuel : 3 jobs (build-and-test, e2e-tests, build-images)
# Avec unification : 2 jobs (build-and-test, deploy)
# → Moins de builds redondants
```

## Idées de solution (non exclusives)

### Option A : Docker Compose ECS Contexts (⚠️ DÉPRÉCIÉ)

**Status** : Déprécié en novembre 2023, repository archivé

**Comment ça fonctionnait** :
```bash
docker context create ecs myecs --from-env
docker compose --context ecs up
```

**Avantages** :
- ✅ Natif Docker
- ✅ Un seul fichier docker-compose.yml
- ✅ Génération automatique CloudFormation

**Inconvénients** :
- ❌ **Déprécié** - Plus maintenu activement
- ❌ Risque de bugs non corrigés
- ❌ Pas de nouvelles features

**Verdict** : ❌ **Non recommandé** - Trop risqué pour un projet en production

---

### Option B : ECS Compose-X (Alternative tierce)

**Description** : Outil open-source qui traduit docker-compose.yml en CloudFormation/CDK

**Référence** : https://ecs-composex.readthedocs.io/

**Avantages** :
- ✅ Supporte docker-compose.yml standard
- ✅ Génère CloudFormation/CDK
- ✅ Features avancées (X-Ray, AppMesh, etc.)
- ✅ Actif et maintenu

**Inconvénients** :
- ⚠️ Outil externe (dépendance)
- ⚠️ Courbe d'apprentissage
- ⚠️ Nécessite configuration supplémentaire

**Exemple** :
```bash
# docker-compose.yml avec extensions ECS
services:
  web:
    image: ${WEB_IMAGE}
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 2048M
    x-aws-cloudformation:
      # Extensions spécifiques ECS
```

**Verdict** : ✅ **À explorer** - Alternative viable

---

### Option C : Script de traduction docker-compose → Task Definition

**Description** : Créer un script qui lit `docker-compose.yml` et génère/update les Task Definitions ECS

**Avantages** :
- ✅ Contrôle total
- ✅ Pas de dépendance externe
- ✅ Peut réutiliser le script `deploy.ts` existant
- ✅ Compatible avec l'infrastructure actuelle

**Inconvénients** :
- ⚠️ Maintenance du script de traduction
- ⚠️ Doit gérer les différences docker-compose vs ECS
- ⚠️ Pas de "vraie" unification (script intermédiaire)

**Exemple** :
```typescript
// infra/deployment/scripts/compose-to-ecs.ts
import { parseComposeFile } from 'docker-compose-parser';
import { updateTaskDefinition } from './deploy';

async function deployComposeToECS(env: string) {
  const compose = parseComposeFile('docker-compose.yml', `.env.${env}`);
  const taskDef = convertComposeToTaskDefinition(compose);
  await updateTaskDefinition(taskDef);
}
```

**Verdict** : ✅ **Pragmatique** - Quick win, réutilise l'existant

---

### Option D : Optimiser les builds sans changer l'architecture

**Description** : Garder l'approche actuelle mais optimiser les builds

**Avantages** :
- ✅ Pas de changement d'architecture
- ✅ Quick win immédiat
- ✅ Réduit les builds redondants

**Inconvénients** :
- ❌ Ne résout pas la dualité de configuration
- ❌ Toujours 2 systèmes à maintenir

**Exemple** :
```yaml
# CI/CD optimisé
build-and-test:
  - pnpm build
  - Cache: node_modules, dist, .next

e2e-tests:
  - Restore cache
  - pnpm install (rapide avec cache)
  - Pas de rebuild

build-images:
  - Restore cache
  - docker build (utilise cache layers)
```

**Verdict** : ✅ **Quick win** - Peut être fait en parallèle

---

## Critères d'acceptation (brouillon)

### Unification
- [ ] Même `docker-compose.yml` utilisé local et ECS
- [ ] Configuration via `.env.*` uniquement
- [ ] Pas de duplication de configuration

### Performance
- [ ] Builds CI/CD réduits de 30-50%
- [ ] Cache efficace entre jobs
- [ ] Temps total CI/CD < 10 min

### Simplicité
- [ ] Workflow unifié : `docker compose up` partout
- [ ] Moins de scripts custom
- [ ] Documentation claire

### Indépendance
- [ ] Solution fonctionne sans dépendre d'AWS uniquement
- [ ] Peut être adaptée à d'autres clouds

## Contraintes connues

### Techniques
- ⚠️ **Docker Compose ECS contexts dépréciés** (novembre 2023)
- ⚠️ ECS a des limitations vs docker-compose (volumes, networks, etc.)
- ⚠️ Fargate ne supporte pas tous les features docker-compose
- ⚠️ ALB routing doit être configuré séparément (pas dans docker-compose)

### Organisationnelles
- ⚠️ Migration nécessite tests approfondis
- ⚠️ Formation de l'équipe si nouvel outil (ECS Compose-X)
- ⚠️ Risque de régression pendant la transition

## Hypothèses explicites

- ⚠️ Unification docker-compose = meilleure expérience dev
- ⚠️ Réduction des builds = gain de temps significatif
- ⚠️ Solution doit rester indépendante d'AWS (portabilité)
- ⚠️ 12-Factor App compliance = valeur ajoutée

## Dépendances pressenties

- Feature ECS Fargate Migration (FEAT-INFRA-001) - prérequis
- Feature ECS Deployment Improvements (FEAT-INFRA-003) - peut être améliorée
- Infrastructure ECR opérationnelle - prérequis

## Questions ouvertes

### Architecture
1. **Docker Compose ECS contexts** : Vaut-il le coup malgré la dépréciation ?
   - Peut-on utiliser la version archivée ?
   - Y a-t-il des forks actifs ?

2. **ECS Compose-X** : 
   - Compatible avec notre stack actuelle (CDK) ?
   - Supporte-t-il scale-to-zero ?
   - Complexité d'intégration ?

3. **Script de traduction** :
   - Quelle librairie pour parser docker-compose.yml ?
   - Comment gérer les différences ECS vs docker-compose ?
   - Maintenance à long terme ?

### Performance
4. **Builds** : 
   - Peut-on vraiment éliminer les builds redondants ?
   - Cache Docker layers suffisant ?
   - Build context partagé possible ?

### Migration
5. **Stratégie** :
   - Migration progressive ou big bang ?
   - Comment tester sans casser la prod ?
   - Rollback possible ?

## Risques pressentis

### Technique
- ⚠️ **Docker Compose ECS contexts dépréciés** → Risque de bugs non corrigés
- ⚠️ **Outils tiers** → Dépendance externe, risque d'abandon
- ⚠️ **Script custom** → Maintenance à long terme
- ⚠️ **Régression** → Casser le déploiement actuel qui fonctionne

### Organisationnel
- ⚠️ **Courbe d'apprentissage** → Nouvel outil à maîtriser
- ⚠️ **Temps de migration** → Investissement initial important
- ⚠️ **Documentation** → Nécessite mise à jour

## Indicateurs de succès (indicatifs)

### Performance
- Temps CI/CD réduit de 30-50%
- Builds redondants éliminés
- Cache efficace (>80% hit rate)

### Simplicité
- Un seul fichier docker-compose.yml
- Workflow unifié local/prod
- Moins de scripts custom

### Maintenabilité
- Configuration centralisée
- Moins de duplication
- Documentation à jour

## Notes libres

### État actuel

**Docker Compose** :
- ✅ `infra/deployment/compose/docker-compose.yml` : Unifié local/staging/prod
- ✅ Configuration via `.env.*` fichiers
- ✅ Utilisé pour local et EC2 (staging/prod)

**ECS** :
- ✅ `infra/provisioning/aws/lib/ecs-stack.ts` : Stack CDK
- ✅ Task Definitions avec images placeholder
- ✅ Script `deploy.ts` met à jour les images ECR

**CI/CD** :
- ⚠️ 3 builds redondants (build-and-test, e2e-tests, build-images)
- ⚠️ Cache partiellement efficace

### Recherche effectuée

**Docker Compose ECS Integration** :
- Déprécié en novembre 2023
- Repository `docker/compose-ecs` archivé
- Plus de support actif

**Alternatives identifiées** :
1. **ECS Compose-X** : Outil open-source actif
2. **Script de traduction custom** : Contrôle total
3. **Optimisation builds** : Quick win sans changement d'archi

### Recommandation préliminaire

**Approche hybride** :
1. **Court terme** : Optimiser les builds (Option D) - Quick win
2. **Moyen terme** : Explorer ECS Compose-X (Option B) - Si viable
3. **Long terme** : Script de traduction custom (Option C) - Si besoin de contrôle total

**À éviter** : Docker Compose ECS contexts natifs (dépréciés)

### Prochaines étapes d'exploration

1. **Tester ECS Compose-X** :
   - Installer et tester avec notre docker-compose.yml
   - Vérifier compatibilité avec CDK existant
   - Évaluer complexité d'intégration

2. **Prototyper script de traduction** :
   - Parser docker-compose.yml
   - Convertir en Task Definition
   - Tester avec notre stack

3. **Optimiser builds CI/CD** :
   - Améliorer cache entre jobs
   - Réduire builds redondants
   - Mesurer gains

4. **Documenter différences ECS vs docker-compose** :
   - Volumes (ECS = EFS uniquement)
   - Networks (ECS = VPC)
   - Ports (ECS = ALB routing)
   - Healthchecks (ECS = Target Group)

## Statut
🔍 **EXPLORING** - 2026-01-20

### À explorer
- [ ] Tester ECS Compose-X avec notre docker-compose.yml
- [ ] Prototyper script de traduction docker-compose → Task Definition
- [ ] Mesurer gains potentiels d'optimisation builds
- [ ] Documenter différences ECS vs docker-compose

### Références
- [Docker Compose ECS Integration (déprécié)](https://github.com/docker/compose-ecs)
- [ECS Compose-X Documentation](https://ecs-composex.readthedocs.io/)
- [AWS Blog: Deploy with Docker Compose on ECS](https://aws.amazon.com/blogs/containers/deploy-applications-on-amazon-ecs-using-docker-compose/)
- [Docker Blog: From Local to ECS](https://www.docker.com/blog/docker-compose-from-local-to-amazon-ecs/)
