# Migration vers AWS ECS Fargate

## 🎯 Objectif

Migrer l'infrastructure de déploiement d'EC2 vers ECS Fargate pour bénéficier du scale-to-zero automatique, réduire les coûts et améliorer la maintenabilité.

## 📊 Contexte & Bénéfices

### Coûts actuels (EC2)
- **EC2 t3.medium spot 24/7** : ~10-12€/mois
- **VPC + autres** : ~2-3€/mois
- **Total** : ~12-15€/mois

### Coûts cibles (ECS Fargate)
- **Fargate (usage effectif)** : ~2-4€/mois
- **ALB** : ~15-20€/mois
- **Total** : ~17-24€/mois (mais scale-to-zero = économie réelle)

### Bénéfices fonctionnels
- ✅ **Scale-to-zero** : Arrêt automatique après 5 min d'inactivité
- ✅ **Scale-up rapide** : Redémarrage en 30-60 secondes
- ✅ **Auto-scaling** : Gestion automatique de la charge
- ✅ **Maintenance zéro** : AWS gère l'infrastructure
- ✅ **Fiabilité** : Redondance et health checks intégrés

## 🏗️ Architecture proposée

### 1. Choix d'implémentation

#### Option A : Mode dual (recommandée)
```
infra/provisioning/
├── aws/
│   ├── scripts/
│   │   ├── provision.ts          # Script unifié avec option --mode
│   │   └── update-config.ts      # Mise à jour config (commun)
│   └── lib/
│       ├── ec2-stack.ts          # Stack EC2 existante
│       └── ecs-stack.ts          # Nouvelle stack ECS
```

#### Option B : Branches séparées
```
main branch: EC2 only
feature/ecs-fargate: ECS only
```

**Décision** : Option A (mode dual) pour maintenir la compatibilité.

### 2. Structure CDK

```typescript
// infra/provisioning/aws/lib/ecs-stack.ts
export class CityGuidedEcsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC (partagé ou dédié)
    const vpc = ec2.Vpc.fromLookup(this, 'VPC', { /* ... */ });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'Cluster', { vpc });

    // Application Load Balancer
    const alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
      vpc,
      internetFacing: true,
      idleTimeout: cdk.Duration.seconds(60)
    });

    // Target Group avec health checks
    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      vpc,
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      healthCheck: {
        path: '/api/health',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 2
      }
    });

    // Task Definition (migration docker-compose)
    const taskDef = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      cpu: 1024,  // 1 vCPU
      memoryLimitMiB: 2048  // 2 GB
    });

    // Container: API
    taskDef.addContainer('api', {
      image: ecs.ContainerImage.fromRegistry(
        `ghcr.io/elzinko/city-guided-api:${process.env.IMAGE_TAG || 'latest'}`
      ),
      environment: {
        NODE_ENV: 'production',
        PORT: '4000',
        // ... autres vars d'env depuis SSM
      },
      logging: new ecs.AwsLogDriver({
        streamPrefix: 'api',
        logGroup: new logs.LogGroup(this, 'ApiLogGroup')
      })
    });

    // Container: Web
    taskDef.addContainer('web', {
      image: ecs.ContainerImage.fromRegistry(
        `ghcr.io/elzinko/city-guided-web:${process.env.IMAGE_TAG || 'latest'}`
      ),
      environment: {
        NODE_ENV: 'production',
        PORT: '3000',
        NEXT_PUBLIC_API_URL: `http://localhost:4000`
      }
    });

    // Container: Caddy (reverse proxy)
    taskDef.addContainer('caddy', {
      image: ecs.ContainerImage.fromRegistry('caddy:alpine'),
      portMappings: [{ containerPort: 80, hostPort: 80 }],
      environment: {
        SITE_DOMAIN: process.env.SITE_DOMAIN
      }
    });

    // ECS Service avec auto-scaling
    const service = new ecs.FargateService(this, 'Service', {
      cluster,
      taskDefinition: taskDef,
      desiredCount: 1,
      minHealthyPercent: 0,  // Permet scale-to-zero
      maxHealthyPercent: 200
    });

    // Auto-scaling basé sur les requêtes
    const scaling = service.autoScaleTaskCount({
      minCapacity: 0,  // Scale-to-zero
      maxCapacity: 10
    });

    // Scale UP immédiat
    scaling.scaleOnRequestCount('ScaleUp', {
      requestsPerTarget: 10,
      targetGroup: targetGroup,
      scaleOutCooldown: cdk.Duration.seconds(30)
    });

    // Scale DOWN après inactivité
    scaling.scaleToZeroWhenIdle('ScaleToZero', {
      idleDuration: cdk.Duration.minutes(5),
      targetGroup: targetGroup
    });

    // Listener ALB
    new elbv2.ApplicationListener(this, 'Listener', {
      loadBalancer: alb,
      port: 80,
      defaultTargetGroups: [targetGroup]
    });
  }
}
```

### 3. Migration docker-compose → ECS

#### Variables d'environnement
- **EC2** : Chargées depuis SSM Parameter Store
- **ECS** : Injectées directement dans les containers via CDK

#### Réseau
- **EC2** : Containers communiquent via réseau Docker bridge
- **ECS** : Containers dans même task definition (localhost)

#### Volumes
- **EC2** : Bind mounts pour logs, SSL certs
- **ECS** : EFS pour persistence, ou CloudWatch pour logs

## 🚀 Plan d'implémentation

### Phase 1 : Proof of Concept
```bash
# 1. Créer branche feature
git checkout -b feature/ecs-fargate-migration

# 2. Créer stack ECS basique
cd infra/provisioning/aws
cp lib/staging-stack.ts lib/ecs-stack.ts

# 3. Test déploiement
cdk deploy CityGuidedEcsStack --require-approval never
```

### Phase 2 : Migration complète
```bash
# 1. Migrer docker-compose.yml → task definition
# 2. Configurer ALB + auto-scaling
# 3. Migrer variables d'environnement
# 4. Tests end-to-end
# 5. Switch DNS si réussi
```

### Phase 3 : Mode dual
```bash
# Script provision unifié
pnpm provision staging --mode ecs  # ECS
pnpm provision staging --mode ec2  # EC2 (default)
```

## 🧪 Tests requis

### 1. Scale-to-zero
```bash
# Tester arrêt automatique
curl https://staging.domain.com  # Génère trafic
sleep 310  # Attendre 5min + marge
aws ecs describe-services --cluster cluster --services service
# Vérifier desiredCount = 0
```

### 2. Scale-up rapide
```bash
# Tester relance automatique
time curl https://staging.domain.com
# Mesurer temps de réponse (doit être < 60s au premier appel)
```

### 3. Health checks
```bash
# Vérifier health checks ALB
aws elbv2 describe-target-health --target-group-arn $TG_ARN
```

## 🔒 Sécurité

### IAM Roles
- **Task Role** : Accès SSM, CloudWatch
- **Execution Role** : Pull ECR, écriture logs

### Secrets
- **SSM Parameters** : Variables sensibles
- **Secrets Manager** : Mots de passe, clés API

## 📊 Monitoring

### CloudWatch
```typescript
// Métriques ECS
new cloudwatch.Alarm(this, 'ScaleToZeroAlarm', {
  metric: service.metricCpuUtilization(),
  threshold: 0,
  evaluationPeriods: 1,
  alarmDescription: 'Service scaled to zero'
});

// Logs unifiés
new logs.LogGroup(this, 'AppLogGroup', {
  retention: logs.RetentionDays.ONE_WEEK
});
```

### X-Ray (optionnel)
- **Distributed tracing** pour debug performance
- **Service map** visualisation des appels

## 💰 Budget & Alertes

### Alertes CloudWatch
```typescript
// Alerte coût mensuel
new cloudwatch.Alarm(this, 'MonthlyCostAlarm', {
  metric: new cloudwatch.MathExpression({
    expression: 'SEARCH(\'{AWS/Billing,ServiceName} MetricName="EstimatedCharges"\', \'Maximum\', 300)',
    usingMetrics: {}
  }),
  threshold: 30,  // 30€/mois max
  evaluationPeriods: 1
});
```

## 🔄 Rollback Plan

### Stratégie
1. **Blue/Green** : Maintenir EC2 en parallèle pendant tests
2. **DNS Switch** : Changement rapide si problème
3. **Feature Flags** : Toggle entre EC2/ECS via DNS

### Commandes rollback
```bash
# Revenir à EC2
aws ecs update-service --cluster cluster --service service --desired-count 0
# Switch DNS vers EC2
# Vérifier que EC2 répond
```

## 🎯 Critères de succès

- [ ] Scale-to-zero fonctionne (arrêt après 5 min)
- [ ] Scale-up < 60 secondes
- [ ] Coût mensuel < 25€
- [ ] Zéro maintenance infrastructure
- [ ] Logs et monitoring opérationnels
- [ ] Rollback possible en < 5 minutes

## 📋 Checklist migration

### Prérequis
- [ ] Tests ECS en staging validés
- [ ] Monitoring configuré
- [ ] Alertes coût en place
- [ ] Plan rollback documenté

### Migration
- [ ] Créer stack ECS
- [ ] Migrer configuration
- [ ] Tests fonctionnels
- [ ] Tests performance
- [ ] Switch traffic
- [ ] Monitor 24h
- [ ] Détruire EC2 si succès