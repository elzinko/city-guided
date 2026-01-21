# Lambdas ECS Scale-to-Zero

Ce dossier contient les fonctions Lambda pour la gestion automatique du scaling ECS.

## Architecture

Le système utilise deux Lambdas complémentaires :

### 1. Scale-to-Zero Lambda (`scale-to-zero/`)

**Déclencheur** : EventBridge (toutes les minutes)

**Fonction** : Surveille l'activité et scale le service ECS à 0 après 5 minutes d'inactivité.

**Logique** :
1. Vérifie l'état actuel du service ECS (desired count)
2. Si déjà à 0, publie une métrique "idle" et termine
3. Si > 0, interroge CloudWatch pour les métriques ALB des 5 dernières minutes
4. Si aucune requête détectée → scale à 0
5. Si des requêtes détectées → publie métrique "active"

**Variables d'environnement** :
- `CLUSTER_NAME` : Nom du cluster ECS
- `SERVICE_NAME` : Nom du service ECS
- `TARGET_GROUP_NAME` : Nom complet du target group ALB

**Métriques CloudWatch publiées** :
- `CityGuided/ECS/ServiceDesiredCount` : Nombre d'instances désirées
- `CityGuided/ECS/ServiceStatus` : 1 = actif, 0 = inactif

### 2. Scale-Up Lambda (`scale-up/`)

**Déclencheur** : EventBridge (toutes les minutes)

**Fonction** : Détecte les requêtes entrantes sur l'ALB et scale le service ECS de 0 à 1.

**Pourquoi cette Lambda ?** : L'auto-scaling ECS natif ne peut pas détecter les requêtes quand le service est à 0 (RequestCountPerTarget = undefined). Cette Lambda surveille les métriques globales de l'ALB qui fonctionnent même quand il n'y a pas de targets.

**Logique** :
1. Vérifie l'état actuel du service ECS
2. Si déjà ≥ 1, ne fait rien
3. Si à 0, interroge les métriques ALB globales (2 dernières minutes)
4. Si des requêtes détectées → scale à 1
5. Si aucune requête → reste à 0

**Variables d'environnement** :
- `CLUSTER_NAME` : Nom du cluster ECS
- `SERVICE_NAME` : Nom du service ECS
- `ALB_FULL_NAME` : Nom complet de l'ALB

**Métriques CloudWatch publiées** :
- `CityGuided/ECS/ServiceDesiredCount` : Nombre d'instances désirées
- `CityGuided/ECS/ServiceStatus` : 1 = actif, 0 = inactif

## Workflow complet

```
┌─────────────────────────────────────────────────────────────┐
│ État initial : Service à 0                                   │
└─────────────────────────────────────────────────────────────┘
                             │
                             │ Requête arrive sur ALB
                             ▼
                   ┌─────────────────────┐
                   │ Scale-Up Lambda     │ ◄── EventBridge (1 min)
                   │ Détecte requête     │
                   │ Scale 0 → 1         │
                   └─────────────────────┘
                             │
                             │ ECS démarre task (~30-60s)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ Service actif : traite les requêtes                         │
└─────────────────────────────────────────────────────────────┘
                             │
                             │ 5 minutes sans requête
                             ▼
                   ┌─────────────────────┐
                   │ Scale-to-Zero Lambda│ ◄── EventBridge (1 min)
                   │ Pas de requêtes     │
                   │ Scale 1 → 0         │
                   └─────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ Service inactif : 0 task, attente requêtes                  │
└─────────────────────────────────────────────────────────────┘
```

## Dashboard CloudWatch

Un dashboard `CityGuided-ECS-ScaleToZero` est créé automatiquement avec :
- État du service (actif/inactif)
- Nombre d'instances désirées
- Requêtes ALB
- Tâches ECS en cours d'exécution

## Build et déploiement

Les Lambdas sont compilées et empaquetées automatiquement par CDK lors du déploiement :

```bash
cd infra/provisioning/aws
npm run cdk:deploy
```

Le processus de bundling :
1. `npm install` dans chaque dossier Lambda
2. Compilation TypeScript → JavaScript (`npx tsc`)
3. Copie de `node_modules`, `package.json` et `index.js` dans l'asset
4. Upload vers AWS Lambda

## Développement local

Pour travailler sur une Lambda :

```bash
cd lambdas/scale-to-zero  # ou scale-up
npm install
npx tsc --watch
```

## Tests manuels

Pour tester le scale-to-zero :
1. Assurez-vous que le service ECS est actif (desired count = 1)
2. Attendez 5 minutes sans envoyer de requêtes à l'ALB
3. Consultez les logs CloudWatch de la Lambda scale-to-zero
4. Vérifiez que le service est passé à 0

Pour tester le scale-up :
1. Assurez-vous que le service ECS est à 0 (desired count = 0)
2. Envoyez une requête à l'ALB : `curl http://<alb-dns>`
3. Attendez jusqu'à 2 minutes (EventBridge trigger)
4. Consultez les logs CloudWatch de la Lambda scale-up
5. Vérifiez que le service est passé à 1

## Coûts estimés

- **Scale-to-Zero Lambda** : ~43 800 invocations/mois (1/min) → ~0,01€/mois
- **Scale-Up Lambda** : ~43 800 invocations/mois (1/min) → ~0,01€/mois
- **EventBridge** : 2 règles, gratuit jusqu'à 1M d'événements/mois
- **CloudWatch Metrics** : Métriques personnalisées → ~0,30€/mois (10 métriques)
- **Total estimé** : ~0,50€/mois

## Permissions IAM

Les Lambdas ont les permissions suivantes :

**Scale-to-Zero et Scale-Up** :
- `ecs:UpdateService` : Modifier le desired count
- `ecs:DescribeServices` : Lire l'état actuel du service
- `cloudwatch:GetMetricStatistics` : Lire les métriques ALB
- `cloudwatch:PutMetricData` : Publier les métriques personnalisées

## Logs CloudWatch

Les logs des Lambdas sont disponibles dans CloudWatch Logs :
- `/aws/lambda/CityGuidedEcsStack-ScaleToZeroLambda...`
- `/aws/lambda/CityGuidedEcsStack-ScaleUpLambda...`

## Troubleshooting

### Le service ne scale pas à 0

1. Vérifiez les logs de la Lambda scale-to-zero
2. Vérifiez qu'il n'y a vraiment aucune requête dans CloudWatch Metrics (ALB RequestCount)
3. Assurez-vous que l'EventBridge rule est active

### Le service ne scale pas à 1

1. Vérifiez que la requête arrive bien sur l'ALB (logs ALB)
2. Vérifiez les logs de la Lambda scale-up
3. Vérifiez que les métriques ALB sont disponibles dans CloudWatch (peut prendre 1-2 min)
4. L'auto-scaling ECS natif peut aussi faire le scale-up (si configuré)

### Métriques manquantes

1. Attendez 5-10 minutes après le déploiement (propagation CloudWatch)
2. Vérifiez les logs des Lambdas pour les erreurs de `PutMetricData`
3. Vérifiez les permissions IAM

## Configuration avancée

### Changer le délai d'inactivité (défaut : 5 minutes)

Éditez `lambdas/scale-to-zero/index.ts` :

```typescript
const IDLE_DURATION_MINUTES = 10; // au lieu de 5
```

Puis redéployez.

### Changer la fréquence de vérification (défaut : 1 minute)

Éditez `infra/provisioning/aws/lib/ecs-stack.ts` :

```typescript
const scaleToZeroRule = new events.Rule(this, 'ScaleToZeroRule', {
  schedule: events.Schedule.rate(cdk.Duration.minutes(2)), // au lieu de 1
  // ...
});
```

⚠️ **Attention** : Si vous augmentez la fréquence, le délai de scale-to-zero sera également augmenté (fréquence × délai).
