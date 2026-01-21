# ECS Scale-to-Zero - Documentation Technique

## Vue d'ensemble

Système automatique de gestion du scaling ECS permettant de réduire les coûts en mettant à l'échelle le service à 0 instance après 5 minutes d'inactivité, avec réactivation automatique dès la première requête.

## Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                         ALB (Application Load Balancer)                │
│                                                                         │
│  ┌──────────────────┐                    ┌──────────────────┐        │
│  │  Web Target Group │                    │  API Target Group │        │
│  │  (Port 3080)      │                    │  (Port 4000)      │        │
│  └──────────────────┘                    └──────────────────┘        │
└───────────┬──────────────────────────────────────┬──────────────────┘
            │                                       │
            │                                       │
            ▼                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        ECS Service (Fargate)                            │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────┐          │
│  │  Task Definition                                         │          │
│  │  ├─ Web Container (Next.js) - Port 3080                 │          │
│  │  └─ API Container (Express) - Port 4000                 │          │
│  └─────────────────────────────────────────────────────────┘          │
│                                                                          │
│  Desired Count: 0-1 (scale-to-zero enabled)                           │
└────────────────────────────────────────────────────────────────────────┘
            ▲                                       ▲
            │                                       │
┌───────────┴───────────┐           ┌──────────────┴────────────┐
│  Scale-Up Lambda       │           │  Scale-to-Zero Lambda      │
│                        │           │                            │
│  • Triggered: 1/min    │           │  • Triggered: 1/min        │
│  • Checks: ALB metrics │           │  • Checks: Target metrics  │
│  • Action: 0 → 1       │           │  • Action: 1 → 0           │
└───────────┬───────────┘           └──────────────┬────────────┘
            │                                       │
            │                                       │
            └───────────────┬───────────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │  EventBridge      │
                  │  Rules (1/min)    │
                  └──────────────────┘
```

## Composants

### 1. Scale-to-Zero Lambda

**Localisation** : `infra/provisioning/aws/lambdas/scale-to-zero/index.ts`

**Responsabilité** : Détecter l'inactivité et scaler le service ECS de 1 à 0.

**Déclencheur** : EventBridge Rule (toutes les minutes)

**Algorithme** :
1. Récupère l'état actuel du service ECS (`DescribeServices`)
2. Si `desiredCount === 0` → Publie métrique "idle" et termine
3. Si `desiredCount > 0` → Interroge les métriques ALB Target Group
4. Analyse les requêtes des 5 dernières minutes
5. Si `recentRequests === 0` :
   - Scale le service à 0 (`UpdateService`)
   - Publie métrique "scaled_to_zero"
6. Sinon :
   - Publie métrique "active"

**Métriques CloudWatch consultées** :
- `AWS/ApplicationELB/RequestCount` (dimension: TargetGroup)
  - Namespace: `AWS/ApplicationELB`
  - Period: 60s
  - Statistic: Sum
  - Lookback: 5 minutes

**Métriques CloudWatch publiées** :
- `CityGuided/ECS/ServiceDesiredCount` : Nombre d'instances désirées
- `CityGuided/ECS/ServiceStatus` : 1 = actif, 0 = inactif

**Variables d'environnement** :
- `CLUSTER_NAME` : Nom du cluster ECS
- `SERVICE_NAME` : Nom du service ECS
- `TARGET_GROUP_NAME` : Nom complet du Target Group (format: `targetgroup/xxx/yyy`)

**Permissions IAM** :
- `ecs:UpdateService` sur le service
- `ecs:DescribeServices` sur le service
- `cloudwatch:GetMetricStatistics` sur toutes les ressources
- `cloudwatch:PutMetricData` sur toutes les ressources

### 2. Scale-Up Lambda

**Localisation** : `infra/provisioning/aws/lambdas/scale-up/index.ts`

**Responsabilité** : Détecter les requêtes entrantes et scaler le service ECS de 0 à 1.

**Pourquoi ?** : L'auto-scaling ECS natif utilise `RequestCountPerTarget`, qui est `undefined` quand il n'y a pas de targets (service à 0). Cette Lambda contourne ce problème en surveillant les métriques globales de l'ALB.

**Déclencheur** : EventBridge Rule (toutes les minutes)

**Algorithme** :
1. Récupère l'état actuel du service ECS (`DescribeServices`)
2. Si `desiredCount >= 1` → Termine (déjà actif)
3. Si `desiredCount === 0` → Interroge les métriques ALB globales
4. Analyse les requêtes des 2 dernières minutes
5. Si `recentRequests > 0` :
   - Scale le service à 1 (`UpdateService`)
   - Publie métrique "scaled_up"
6. Sinon :
   - Termine (reste à 0)

**Métriques CloudWatch consultées** :
- `AWS/ApplicationELB/RequestCount` (dimension: LoadBalancer)
  - Namespace: `AWS/ApplicationELB`
  - Period: 60s
  - Statistic: Sum
  - Lookback: 2 minutes

**Métriques CloudWatch publiées** :
- `CityGuided/ECS/ServiceDesiredCount` : Nombre d'instances désirées
- `CityGuided/ECS/ServiceStatus` : 1 = actif, 0 = inactif

**Variables d'environnement** :
- `CLUSTER_NAME` : Nom du cluster ECS
- `SERVICE_NAME` : Nom du service ECS
- `ALB_FULL_NAME` : Nom complet de l'ALB (format: `app/xxx/yyy`)

**Permissions IAM** :
- `ecs:UpdateService` sur le service
- `ecs:DescribeServices` sur le service
- `cloudwatch:GetMetricStatistics` sur toutes les ressources
- `cloudwatch:PutMetricData` sur toutes les ressources

### 3. EventBridge Rules

Deux règles EventBridge déclenchent les Lambdas toutes les minutes :

**Scale-to-Zero Rule** :
- Schedule: `rate(1 minute)`
- Target: Scale-to-Zero Lambda
- Description: "Check for inactivity and scale ECS service to zero"

**Scale-Up Rule** :
- Schedule: `rate(1 minute)`
- Target: Scale-Up Lambda
- Description: "Check for incoming requests and scale up ECS service if needed"

### 4. CloudWatch Dashboard

**Nom** : `CityGuided-ECS-ScaleToZero`

**Widgets** :
1. **État du Service** : `CityGuided/ECS/ServiceStatus` (1 = actif, 0 = inactif)
2. **Instances Désirées** : `CityGuided/ECS/ServiceDesiredCount`
3. **Requêtes ALB** : `AWS/ApplicationELB/RequestCount`
4. **Tâches en Cours** : `AWS/ECS/RunningTaskCount`

**Accès** : Console CloudWatch → Dashboards → CityGuided-ECS-ScaleToZero

## Workflow détaillé

### Scénario 1 : Service actif → Inactif

```
t=0     : Service à 1, traite des requêtes
t=5min  : Dernière requête reçue
t=6min  : Scale-to-Zero Lambda s'exécute
          - Vérifie les 5 dernières minutes
          - Détecte 1 requête (à t=5min)
          - Ne scale pas (encore actif)
t=7-10min: Scale-to-Zero Lambda s'exécute 4 fois
          - Détecte toujours 1 requête (à t=5min dans la fenêtre)
          - Ne scale pas
t=11min : Scale-to-Zero Lambda s'exécute
          - Vérifie t=6min à t=11min
          - Aucune requête détectée
          - Scale à 0
          - Publie métrique "scaled_to_zero"
```

**Délai effectif** : 5-6 minutes après la dernière requête.

### Scénario 2 : Service inactif → Actif

```
t=0     : Service à 0
t=1     : Requête arrive sur ALB
          - ALB retourne 503 (no healthy targets)
          - Métrique ALB RequestCount = 1
t=2     : Scale-Up Lambda s'exécute (trigger toutes les minutes)
          - Vérifie les 2 dernières minutes
          - Détecte 1 requête
          - Scale à 1
          - Publie métrique "scaled_up"
t=3-4   : ECS démarre la tâche Fargate
          - Pull image ECR
          - Start containers
          - Health checks
t=5     : Tâche "healthy", ALB route le trafic
```

**Délai effectif** : 2-4 minutes pour la première requête (temps d'attente EventBridge + démarrage ECS).

**Note** : L'utilisateur voit un 503 pour la première requête, mais le système se réveille automatiquement.

## Auto-scaling ECS natif

En plus des Lambdas, l'auto-scaling ECS natif est configuré :

```typescript
scaling.scaleOnRequestCount('ScaleOnRequests', {
  requestsPerTarget: 1,
  targetGroup: webTargetGroup,
  scaleInCooldown: Duration.minutes(5),
  scaleOutCooldown: Duration.seconds(10),
});

scaling.scaleOnCpuUtilization('ScaleOnCpu', {
  targetUtilizationPercent: 50,
  scaleInCooldown: Duration.minutes(5),
  scaleOutCooldown: Duration.seconds(30),
});
```

**Limites** :
- `minCapacity: 0`
- `maxCapacity: 1`

**Rôle de l'auto-scaling** :
- Complète le scale-up initié par la Lambda scale-up
- Réagit aux pics de trafic (mais limité à 1 instance max)
- Ne peut **pas** scaler de 0→1 (d'où la nécessité de la Lambda scale-up)

## Configuration

### Paramètres ajustables

#### Délai d'inactivité (défaut: 5 minutes)

**Fichier** : `lambdas/scale-to-zero/index.ts`

```typescript
const IDLE_DURATION_MINUTES = 5; // Modifier ici
```

**Impact** : Plus le délai est long, moins de scale-to-zero inutiles, mais coût plus élevé.

#### Fréquence de vérification (défaut: 1 minute)

**Fichier** : `lib/ecs-stack.ts`

```typescript
const scaleToZeroRule = new events.Rule(this, 'ScaleToZeroRule', {
  schedule: events.Schedule.rate(cdk.Duration.minutes(1)), // Modifier ici
});
```

**Impact** : Fréquence plus basse = économies sur les invocations Lambda, mais délai de scale-to-zero plus long.

#### Fenêtre de détection scale-up (défaut: 2 minutes)

**Fichier** : `lambdas/scale-up/index.ts`

```typescript
const startTime = new Date(endTime.getTime() - 2 * 60 * 1000); // Modifier le 2
```

**Impact** : Fenêtre plus large = détection plus fiable, mais aussi plus de faux positifs.

## Métriques et observabilité

### Métriques personnalisées

Namespace: `CityGuided/ECS`

| Métrique | Type | Description |
|----------|------|-------------|
| `ServiceDesiredCount` | Count | Nombre d'instances désirées (0 ou 1) |
| `ServiceStatus` | None | 1 = actif, 0 = inactif |

Dimensions:
- `Service`: Nom du service ECS
- `Cluster`: Nom du cluster ECS
- `Status`: État de la transition (idle, active, scaled_to_zero, scaled_up)

### Logs CloudWatch

**Scale-to-Zero Lambda** :
- Log Group: `/aws/lambda/CityGuidedEcsStack-ScaleToZeroLambda...`
- Logs clés :
  - "Scale-to-zero check triggered"
  - "Current service state"
  - "Request analysis"
  - "No requests detected, scaling to zero"

**Scale-Up Lambda** :
- Log Group: `/aws/lambda/CityGuidedEcsStack-ScaleUpLambda...`
- Logs clés :
  - "Scale-up check triggered"
  - "Service already scaled up"
  - "Request analysis"
  - "Requests detected while service at zero, scaling up to 1"

### Alertes recommandées

**Alerte 1 : Lambda en erreur**
- Métrique: `AWS/Lambda/Errors`
- Seuil: > 0
- Action: Email/SNS

**Alerte 2 : Service bloqué à 0**
- Métrique: `AWS/ApplicationELB/RequestCount` > 10 ET `AWS/ECS/RunningTaskCount` = 0
- Durée: 5 minutes
- Action: Email/SNS

## Coûts

### Estimation mensuelle

| Composant | Volume | Coût unitaire | Total |
|-----------|--------|---------------|-------|
| Scale-to-Zero Lambda | 43 800 invocations | 0,20€ / 1M | 0,01€ |
| Scale-Up Lambda | 43 800 invocations | 0,20€ / 1M | 0,01€ |
| EventBridge | 87 600 événements | Gratuit (< 1M) | 0€ |
| CloudWatch Metrics | 10 métriques custom | 0,30€ / métrique | 3,00€ |
| CloudWatch Logs | ~100 MB/mois | 0,50€ / GB | 0,05€ |
| **Total** | | | **~3,07€/mois** |

**Économies ECS (Fargate)** :
- 1 vCPU, 2 GB RAM à 0,04656$/heure
- Si service inactif 20h/jour : 0,04656 × 20 × 30 = 27,94€/mois économisés
- **ROI** : ~24,87€/mois

## Déploiement

### Prérequis

1. CDK installé et configuré
2. Cluster ECS existant
3. ALB configuré avec Target Groups

### Commandes

```bash
cd infra/provisioning/aws

# Installer les dépendances
npm install

# Synthétiser le template CloudFormation
npm run cdk:synth

# Déployer
npm run cdk:deploy
```

### Vérification post-déploiement

```bash
# Vérifier les Lambdas
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `CityGuidedEcsStack-Scale`)].FunctionName'

# Vérifier les EventBridge rules
aws events list-rules --name-prefix CityGuidedEcsStack

# Vérifier le dashboard CloudWatch
aws cloudwatch list-dashboards --query 'DashboardEntries[?DashboardName==`CityGuided-ECS-ScaleToZero`]'

# Tester manuellement le scale-to-zero
aws lambda invoke \
  --function-name <ScaleToZeroLambda-ARN> \
  --payload '{}' \
  response.json

# Tester manuellement le scale-up
aws lambda invoke \
  --function-name <ScaleUpLambda-ARN> \
  --payload '{}' \
  response.json
```

## Troubleshooting

### Problème : Le service ne scale pas à 0

**Symptômes** :
- Service reste à `desiredCount: 1` après 10+ minutes sans trafic
- Logs Lambda scale-to-zero montrent "requests detected"

**Causes possibles** :
1. **Health checks ALB** : Les health checks sont comptés comme des requêtes
   - **Solution** : Vérifier que `healthCheck.interval` est > 30s (déjà configuré)
2. **Requêtes fantômes** : Bots, scanners, monitoring externe
   - **Solution** : Ajouter un filtre dans l'analyse des métriques
3. **Délai CloudWatch** : Les métriques ALB ont 1-2 min de retard
   - **Solution** : Attendre 6-7 minutes au total

**Debug** :
```bash
# Vérifier les métriques ALB directement
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name RequestCount \
  --dimensions Name=TargetGroup,Value=<TARGET_GROUP_NAME> \
  --start-time $(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Sum

# Consulter les logs Lambda
aws logs tail /aws/lambda/<ScaleToZeroLambda-Name> --follow
```

### Problème : Le service ne scale pas à 1

**Symptômes** :
- Requête sur ALB → 503 "no healthy targets"
- Service reste à `desiredCount: 0` après plusieurs minutes

**Causes possibles** :
1. **Lambda scale-up désactivée** : EventBridge rule désactivée
   - **Solution** : Vérifier `aws events describe-rule --name <RuleName>`
2. **Permissions IAM manquantes** : Lambda ne peut pas appeler `ecs:UpdateService`
   - **Solution** : Vérifier les logs Lambda pour "AccessDenied"
3. **Métriques ALB non disponibles** : Première requête après déploiement
   - **Solution** : Attendre 5 minutes que les métriques se propagent

**Debug** :
```bash
# Vérifier l'état de la rule EventBridge
aws events describe-rule --name CityGuidedEcsStack-ScaleUpRule...

# Forcer une invocation manuelle
aws lambda invoke \
  --function-name <ScaleUpLambda-ARN> \
  --payload '{}' \
  response.json

cat response.json

# Vérifier les permissions IAM
aws lambda get-policy --function-name <ScaleUpLambda-ARN>
```

### Problème : Métriques personnalisées manquantes

**Symptômes** :
- Dashboard CloudWatch vide ou incomplet
- Métriques `CityGuided/ECS/*` non trouvées

**Causes possibles** :
1. **Lambdas pas encore exécutées** : Attendre première invocation
2. **Erreur dans `PutMetricData`** : Permissions IAM manquantes
3. **Délai de propagation** : 5-10 minutes après première publication

**Debug** :
```bash
# Lister les métriques custom
aws cloudwatch list-metrics --namespace CityGuided/ECS

# Vérifier les logs Lambda pour erreurs PutMetricData
aws logs filter-log-events \
  --log-group-name /aws/lambda/<ScaleToZeroLambda-Name> \
  --filter-pattern "Error publishing metrics"
```

## Améliorations futures

### 1. Réduction du délai de scale-up

**Problème** : 2-4 minutes pour scale de 0→1.

**Solutions** :
- **Lambda@Edge** : Intercepter requêtes au niveau CloudFront, scaler instantanément
- **ALB Target Group avec Lambda** : Ajouter Lambda comme target de secours
- **ECS Anywhere** : Tâches sur EC2 Spot pré-warmed

### 2. Scale-out (> 1 instance)

**Problème** : Limité à `maxCapacity: 1`.

**Solutions** :
- Augmenter `maxCapacity` à 3-5
- Ajouter scaling basé sur `RequestCountPerTarget` (fonctionne quand > 0)
- Scaling prédictif basé sur historique de trafic

### 3. Optimisation des coûts CloudWatch

**Problème** : Métriques custom = 3€/mois.

**Solutions** :
- Utiliser DynamoDB pour stocker les transitions au lieu de métriques custom
- Réduire la granularité des métriques (1 point/5min au lieu de 1/min)
- Exporter vers S3 pour analyse long-terme

### 4. Résilience multi-région

**Problème** : Pas de failover si région principale down.

**Solutions** :
- Déployer la stack dans 2 régions
- Route 53 health checks + failover DNS
- Global Accelerator pour basculement automatique

## Références

- [AWS ECS Auto Scaling](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-auto-scaling.html)
- [ALB Target Group Metrics](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html)
- [Lambda + CDK Bundling](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda-readme.html#bundling-asset-code)
- [EventBridge Schedule Expressions](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html)

## Changelog

### v1.0.0 (2026-01-21)

- ✅ Extraction des Lambdas dans des fichiers séparés (`lambdas/scale-to-zero/`, `lambdas/scale-up/`)
- ✅ Support TypeScript pour les Lambdas
- ✅ Bundling automatique via CDK
- ✅ Dashboard CloudWatch `CityGuided-ECS-ScaleToZero`
- ✅ EventBridge rules (1/min)
- ✅ Métriques personnalisées `CityGuided/ECS`
- ✅ Scale-to-zero après 5 minutes d'inactivité
- ✅ Scale-up automatique sur première requête
- ✅ Documentation complète
