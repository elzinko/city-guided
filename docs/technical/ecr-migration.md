# Migration de GHCR vers AWS ECR

> **Date** : 2026-01-20  
> **Statut** : ✅ Complété (Phase 1)

## 📋 Contexte

Migration des images Docker de GitHub Container Registry (GHCR) vers Amazon Elastic Container Registry (ECR) pour résoudre les problèmes d'authentification et améliorer l'intégration avec ECS.

### Problème résolu

- ❌ **GHCR** : Images privées nécessitant authentification → ECS ne pouvait pas pull les images
- ✅ **ECR** : Authentification automatique via IAM → ECS peut pull directement

### Avantages ECR

| Critère | GHCR | ECR |
|---------|------|-----|
| **Authentification ECS** | ❌ Token GitHub requis | ✅ Automatique (IAM) |
| **Latence pull** | ⚠️ Variable | ✅ Optimisée (même région) |
| **Coût** | ✅ Gratuit | ✅ 500 MB/mois gratuits |
| **Rate limiting** | ⚠️ Oui | ✅ Non |
| **Scan de vulnérabilités** | ❌ Non | ✅ Oui (intégré) |

---

## ✅ Phase 1 : Migration ECR (Complété)

### Changements effectués

#### 1. Infrastructure CDK (`infra/provisioning/aws/lib/ecs-stack.ts`)

Ajout des repositories ECR :

```typescript
// Création des repositories ECR
const apiRepository = new ecr.Repository(this, 'ApiRepository', {
  repositoryName: 'city-guided-api',
  imageScanOnPush: true,
  lifecycleRules: [{ maxImageCount: 10 }],
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});

const webRepository = new ecr.Repository(this, 'WebRepository', {
  repositoryName: 'city-guided-web',
  imageScanOnPush: true,
  lifecycleRules: [{ maxImageCount: 10 }],
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});
```

**Outputs ajoutés** :
- `ApiRepositoryUri` : URI du repository ECR API
- `WebRepositoryUri` : URI du repository ECR Web

#### 2. Workflow CI/CD (`.github/workflows/ci.yml`)

**Avant (GHCR)** :
```yaml
- name: Login to GitHub Container Registry
  uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}

- name: Build and push API image
  with:
    tags: ghcr.io/${{ github.repository }}-api:${{ github.sha }}
```

**Après (ECR)** :
```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-access-key-id: ${{ secrets.SECRET_AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.SECRET_AWS_SECRET_ACCESS_KEY }}
    aws-region: eu-west-3

- name: Login to Amazon ECR
  uses: aws-actions/amazon-ecr-login@v2

- name: Get ECR repository URIs
  run: |
    API_REPO=$(aws ecr describe-repositories --repository-names city-guided-api ...)
    WEB_REPO=$(aws ecr describe-repositories --repository-names city-guided-web ...)

- name: Build and push API image
  with:
    tags: ${{ steps.ecr-repos.outputs.api_repo }}:${{ github.sha }}
```

#### 3. Script de déploiement (`infra/deployment/scripts/deploy.ts`)

**Avant** :
```typescript
container.image = `ghcr.io/elzinko/city-guided-api:${imageTag}`;
```

**Après** :
```typescript
// Récupération dynamique des URIs ECR
const apiRepoUri = execSilent(`
  aws ecr describe-repositories \
    --repository-names city-guided-api \
    --query 'repositories[0].repositoryUri' \
    --output text
`);

container.image = `${apiRepoUri}:${imageTag}`;
```

---

## 🚀 Déploiement de la Phase 1

### Étapes à suivre

#### 1. Provisionner les repositories ECR

```bash
cd infra/provisioning/aws
pnpm run provision staging --mode ecs
```

**Sortie attendue** :
```
✓ ECS infrastructure deployed
   Cluster: city-guided-staging
   Service: city-guided-staging-service
   API Repository: 766050776787.dkr.ecr.eu-west-3.amazonaws.com/city-guided-api
   Web Repository: 766050776787.dkr.ecr.eu-west-3.amazonaws.com/city-guided-web
```

#### 2. Vérifier les repositories

```bash
aws ecr describe-repositories --region eu-west-3
```

#### 3. Pusher le code et déclencher le CI

```bash
git add .
git commit -m "feat(infra): migrate from GHCR to ECR for better ECS integration"
git push origin main
```

Le workflow CI/CD va :
1. ✅ Builder les images
2. ✅ Les pousser vers ECR (au lieu de GHCR)
3. ✅ Déployer sur ECS avec les nouvelles images

#### 4. Vérifier le déploiement

```bash
# Vérifier les images dans ECR
aws ecr list-images --repository-name city-guided-api --region eu-west-3
aws ecr list-images --repository-name city-guided-web --region eu-west-3

# Vérifier le service ECS
cd infra/provisioning/aws
pnpm run status
```

---

## 📊 Résultat attendu

Après le premier push sur `main` avec ces changements :

1. **Images poussées vers ECR** :
   ```
   766050776787.dkr.ecr.eu-west-3.amazonaws.com/city-guided-api:abc1234
   766050776787.dkr.ecr.eu-west-3.amazonaws.com/city-guided-web:abc1234
   ```

2. **ECS peut pull les images** :
   - ✅ Pas besoin de token GitHub
   - ✅ Authentification IAM automatique
   - ✅ Tâches démarrent correctement

3. **Site accessible** :
   - ✅ https://cityguided.duckdns.org fonctionne
   - ✅ Auto-scaling opérationnel

---

## 🔮 Phase 2 : Externalisation de la config (À venir)

### Objectifs

Rendre le setup plus 12-factors compliant en externalisant la configuration infrastructure dans les `.env.*`.

### Changements prévus

#### 1. Ajouter variables d'infra dans `.env.staging`

```bash
# .env.staging

# ===== SECRETS =====
SECRET_DATABASE_URL=...
SECRET_GITHUB_TOKEN=...

# ===== CONFIG APPLICATIVE =====
NODE_ENV=staging
API_URL=https://api.cityguided.duckdns.org

# ===== INFRASTRUCTURE (nouveau) =====
INFRA_ECS_CPU=1024
INFRA_ECS_MEMORY=2048
INFRA_WEB_PORT=80
INFRA_API_PORT=4000
INFRA_MAX_CAPACITY=1
```

#### 2. Utiliser les variables dans CDK

```typescript
// ecs-stack.ts
import * as dotenv from 'dotenv';
dotenv.config({ path: `../../config/.env.${env}` });

const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
  cpu: parseInt(process.env.INFRA_ECS_CPU || '1024'),
  memoryLimitMiB: parseInt(process.env.INFRA_ECS_MEMORY || '2048'),
});

const scaling = service.autoScaleTaskCount({
  minCapacity: 0,
  maxCapacity: parseInt(process.env.INFRA_MAX_CAPACITY || '1'),
});
```

#### 3. Optionnel : Docker Compose pour ECS

Utiliser `docker compose --context ecs` pour unifier local et production :

```yaml
# docker-compose.yml (unifié)
services:
  web:
    image: ${WEB_IMAGE:-nginx:latest}
    environment:
      - NODE_ENV=${NODE_ENV:-development}
    deploy:
      resources:
        limits:
          cpus: '${INFRA_ECS_CPU:-1.0}'
          memory: ${INFRA_ECS_MEMORY:-2048M}
```

**Utilisation** :
```bash
# Local
docker-compose up

# ECS
docker context create ecs myecs --from-env
docker compose --context ecs up
```

---

## 📚 Références

- [AWS ECR Documentation](https://docs.aws.amazon.com/ecr/)
- [ECS Task Definition Images](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html#container_definition_image)
- [12-Factor App](https://12factor.net/)
- [Docker Compose ECS Integration](https://docs.docker.com/cloud/ecs-integration/)

---

## ✅ Checklist de migration

- [x] Créer repositories ECR dans CDK
- [x] Mettre à jour workflow CI/CD pour ECR
- [x] Mettre à jour script de déploiement
- [x] Documenter la migration
- [ ] Provisionner les repositories (à faire lors du prochain push)
- [ ] Vérifier le premier déploiement
- [ ] Désactiver/supprimer les images GHCR (optionnel)
- [ ] Phase 2 : Externaliser config infrastructure
