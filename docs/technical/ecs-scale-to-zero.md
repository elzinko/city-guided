# Scale-to-Zero Automatique pour ECS

## 🎯 Objectif

Mettre à l'échelle automatiquement le service ECS à 0 instance après 5 minutes d'inactivité consécutives, avec un indicateur visible dans un dashboard CloudWatch pour savoir quand le service était actif ou non.

## 📊 Architecture

### Composants

1. **Lambda Scale-to-Zero** : Vérifie toutes les minutes les métriques ALB pour détecter l'inactivité
2. **Lambda Scale-Up** : Met à l'échelle le service à 1 instance (peut être appelée manuellement)
3. **EventBridge Rule** : Déclenche la Lambda scale-to-zero toutes les minutes
4. **CloudWatch Dashboard** : Affiche l'état actif/inactif du service
5. **Métriques personnalisées** : Suivent les changements d'état du service

### Flux de fonctionnement

```
Requête ALB → Service ECS (1 instance)
     ↓
Pas de requête pendant 5 minutes
     ↓
EventBridge (toutes les minutes) → Lambda Scale-to-Zero
     ↓
Vérifie métriques ALB (5 dernières minutes)
     ↓
Si aucune requête → Scale à 0
     ↓
Publie métrique "idle" dans CloudWatch
     ↓
Dashboard affiche état "Inactif"
```

## 🔧 Configuration

### Paramètres

- **Durée d'inactivité** : 5 minutes consécutives
- **Vérification** : Toutes les minutes via EventBridge
- **Max instances** : 1 (comme demandé)
- **Min instances** : 0 (scale-to-zero)

### Métriques CloudWatch

Le système publie deux métriques personnalisées dans le namespace `CityGuided/ECS` :

1. **ServiceDesiredCount** : Nombre d'instances désirées
   - Dimensions : Service, Cluster, Status
   - Valeurs possibles : 0 (idle), 1 (active)

2. **ServiceStatus** : État du service (binaire)
   - Dimensions : Service, Cluster
   - Valeurs : 0 (inactif), 1 (actif)

## 📈 Dashboard CloudWatch

Le dashboard `CityGuided-ECS-ScaleToZero` affiche :

1. **État du Service (Actif/Inactif)** : Graphique binaire (0=Inactif, 1=Actif)
2. **Nombre d'Instances Désirées** : Graphique montrant 0 ou 1
3. **Requêtes ALB** : Nombre de requêtes reçues par l'ALB
4. **Tâches ECS en Cours d'Exécution** : Nombre de tâches actuellement en cours

### Accès au Dashboard

L'URL du dashboard est disponible dans les outputs de la stack CDK :

```bash
aws cloudformation describe-stacks --stack-name CityGuidedEcsStack \
  --query 'Stacks[0].Outputs[?OutputKey==`DashboardUrl`].OutputValue' \
  --output text
```

Ou directement dans la console AWS CloudWatch :
- CloudWatch → Dashboards → `CityGuided-ECS-ScaleToZero`

## 🚀 Utilisation

### Déploiement de la Stack

Le système de provisioning est **idempotent** : vous pouvez lancer la commande plusieurs fois, et CDK ne fera que les changements nécessaires.

```bash
# Depuis la racine du projet
pnpm infra:provision staging --mode=ecs

# Ou avec espace (les deux formats fonctionnent)
pnpm infra:provision staging --mode ecs

# Ou directement depuis le dossier provisioning
cd infra/provisioning/aws
pnpm provision staging --mode=ecs
```

**Note** : Le CDK est idempotent par nature. Si vous ajoutez de nouvelles ressources (comme les Lambdas, EventBridge, Dashboard), CDK les ajoutera à la stack existante. Si vous modifiez des ressources existantes, CDK les mettra à jour. Si rien n'a changé, CDK ne fera rien.

### Scale-to-Zero Automatique

Le scale-to-zero est **automatique** et ne nécessite aucune intervention :

1. Le service démarre à 0 instance (`desiredCount: 0`)
2. Toutes les minutes, EventBridge déclenche la Lambda scale-to-zero
3. La Lambda vérifie les métriques ALB des 5 dernières minutes
4. Si aucune requête n'est détectée, le service est mis à l'échelle à 0
5. Les métriques sont publiées dans CloudWatch
6. Le dashboard est mis à jour automatiquement

### Scale-Up Manuel

Pour mettre à l'échelle le service à 1 instance manuellement :

```bash
# Via AWS CLI
aws lambda invoke \
  --function-name <ScaleUpLambdaArn> \
  --payload '{}' \
  response.json

# Ou directement via ECS
aws ecs update-service \
  --cluster city-guided-cluster \
  --service city-guided-service \
  --desired-count 1
```

### Scale-Up Automatique (Optionnel)

Pour un scale-up vraiment automatique lors de la première requête, il faudrait :

1. Créer un ALB Lambda target qui intercepte les requêtes
2. Vérifier si le service est à 0
3. Scale-up si nécessaire
4. Rediriger vers le service ECS

Cette fonctionnalité n'est pas implémentée pour l'instant car elle nécessite une refonte de l'architecture ALB.

## 📊 Monitoring

### Vérifier l'état actuel

```bash
# État du service
aws ecs describe-services \
  --cluster city-guided-cluster \
  --services city-guided-service \
  --query 'services[0].{DesiredCount:desiredCount,RunningCount:runningCount}'

# Métriques CloudWatch
aws cloudwatch get-metric-statistics \
  --namespace CityGuided/ECS \
  --metric-name ServiceStatus \
  --dimensions Name=Service,Value=city-guided-service Name=Cluster,Value=city-guided-cluster \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Maximum
```

### Logs Lambda

```bash
# Logs scale-to-zero
aws logs tail /aws/lambda/CityGuidedEcsStack-ScaleToZeroLambda-* --follow

# Logs scale-up
aws logs tail /aws/lambda/CityGuidedEcsStack-ScaleUpLambda-* --follow
```

## 🔍 Dépannage

### Le service ne scale pas à 0

1. Vérifier que EventBridge déclenche bien la Lambda :
   ```bash
   aws events list-rules --name-prefix ScaleToZero
   ```

2. Vérifier les logs de la Lambda scale-to-zero

3. Vérifier que les métriques ALB sont disponibles :
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/ApplicationELB \
     --metric-name RequestCount \
     --dimensions Name=TargetGroup,Value=<target-group-name> \
     --start-time $(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 60 \
     --statistics Sum
   ```

### Le dashboard ne s'affiche pas

1. Vérifier que les métriques sont publiées :
   ```bash
   aws cloudwatch list-metrics --namespace CityGuided/ECS
   ```

2. Vérifier que le dashboard existe :
   ```bash
   aws cloudwatch list-dashboards --dashboard-name-prefix CityGuided
   ```

## 💰 Coûts

### Composants ajoutés

- **Lambda Scale-to-Zero** : ~0.20€/mois (1000 invocations/mois)
- **Lambda Scale-Up** : ~0.01€/mois (appels manuels)
- **EventBridge Rule** : Gratuit (première règle)
- **CloudWatch Dashboard** : Gratuit
- **Métriques personnalisées** : ~0.30€/mois (10 métriques)

**Total estimé** : ~0.50€/mois

## 🎯 Prochaines améliorations

1. **Scale-up automatique** : Implémenter un ALB Lambda target pour scale-up automatique
2. **Alertes** : Créer des alertes CloudWatch pour notifier les changements d'état
3. **Métriques avancées** : Ajouter des métriques sur le temps de scale-up/down
4. **API Gateway** : Exposer une API pour scale-up manuel via HTTP

## 📝 Notes

- Le scale-to-zero fonctionne uniquement si le service ECS est configuré avec `minCapacity: 0`
- Les métriques ALB peuvent avoir un délai de 1-2 minutes, donc le scale-to-zero peut prendre jusqu'à 6-7 minutes
- Le dashboard est mis à jour en temps réel (rafraîchissement automatique toutes les minutes)
- **Le provisioning est idempotent** : vous pouvez relancer `pnpm infra:provision staging --mode=ecs` autant de fois que nécessaire, CDK ne fera que les changements nécessaires
