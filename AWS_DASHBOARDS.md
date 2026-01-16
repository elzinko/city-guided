# Dashboards AWS pour City Guided

## 📊 CloudWatch Dashboard (Principal)

Un dashboard CloudWatch personnalisé est automatiquement créé lors du déploiement de la stack ECS.

### Accès au Dashboard

**URL directe** (affichée après le déploiement) :
```
https://eu-west-3.console.aws.amazon.com/cloudwatch/home?region=eu-west-3#dashboards:name=CityGuided-ECS-ScaleToZero
```

**Via la console AWS** :
1. Aller dans **CloudWatch** → **Dashboards**
2. Chercher `CityGuided-ECS-ScaleToZero`

### Métriques affichées

Le dashboard affiche 4 graphiques en temps réel :

1. **État du Service (Actif/Inactif)**
   - 1 = Service actif
   - 0 = Service inactif (scale-to-zero)

2. **Nombre d'Instances Désirées**
   - Nombre de tâches ECS désirées par le service
   - 0 = Scale-to-zero activé

3. **Requêtes ALB**
   - Nombre de requêtes reçues par l'Application Load Balancer
   - Utile pour voir le trafic et déclencher le scale-up

4. **Tâches ECS en Cours d'Exécution**
   - Nombre réel de tâches ECS en cours d'exécution
   - Comparer avec "Instances Désirées" pour voir les transitions

## 📝 CloudWatch Logs (Logs des Containers)

### Logs des containers ECS

Les logs des containers sont automatiquement envoyés vers CloudWatch Logs.

#### Logs API
**URL directe** :
```
https://eu-west-3.console.aws.amazon.com/cloudwatch/home?region=eu-west-3#logsV2:log-groups/log-group/$252Fecs$252Fcity-guided-api
```

**Via la console AWS** :
1. Aller dans **CloudWatch** → **Log groups**
2. Chercher `/ecs/city-guided-api`

#### Logs Web
**URL directe** :
```
https://eu-west-3.console.aws.amazon.com/cloudwatch/home?region=eu-west-3#logsV2:log-groups/log-group/$252Fecs$252Fcity-guided-web
```

**Via la console AWS** :
1. Aller dans **CloudWatch** → **Log groups**
2. Chercher `/ecs/city-guided-web`

### Utilisation des logs

Dans CloudWatch Logs, vous pouvez :
- **Voir les logs en temps réel** : Cliquer sur un log stream pour voir les logs en direct
- **Filtrer les logs** : Utiliser la barre de recherche pour filtrer par texte, timestamp, etc.
- **Exporter les logs** : Télécharger ou exporter vers S3
- **Créer des métriques** : Créer des métriques CloudWatch basées sur les logs (erreurs, patterns, etc.)

## 🎯 ECS Console (Interface principale)

### Cluster ECS

**URL directe** :
```
https://eu-west-3.console.aws.amazon.com/ecs/v2/clusters/city-guided-cluster/services?region=eu-west-3
```

**Informations disponibles** :
- **Services** : Liste des services ECS
- **Tasks** : Tâches en cours d'exécution
- **Metrics** : Métriques du cluster (CPU, mémoire, etc.)
- **Logs** : Liens directs vers CloudWatch Logs

### Service ECS

**URL directe** :
```
https://eu-west-3.console.aws.amazon.com/ecs/v2/clusters/city-guided-cluster/services/city-guided-service?region=eu-west-3
```

**Informations disponibles** :
- **Status** : État du service (ACTIVE, DRAINING, etc.)
- **Tasks** : Liste des tâches avec leur statut
- **Metrics** : Métriques du service (CPU, mémoire, réseau)
- **Events** : Événements récents (déploiements, erreurs, etc.)
- **Logs** : Liens vers les logs de chaque container
- **Configuration** : Configuration du service (task definition, scaling, etc.)

### Voir les logs depuis ECS Console

1. Aller dans le service ECS
2. Cliquer sur l'onglet **Logs**
3. Sélectionner un **Log stream** (chaque tâche a son propre stream)
4. Les logs s'affichent en temps réel

## 🔀 Application Load Balancer (ALB)

### Console ALB

**URL directe** :
```
https://eu-west-3.console.aws.amazon.com/ec2/home?region=eu-west-3#LoadBalancers:search=city-guided-alb
```

**Informations disponibles** :
- **Health checks** : État de santé des targets
- **Target groups** : Groupes de cibles (vos containers ECS)
- **Listeners** : Règles de routage
- **Monitoring** : Métriques (requêtes, latence, erreurs)

### Target Groups

**URL directe** :
```
https://eu-west-3.console.aws.amazon.com/ec2/home?region=eu-west-3#TargetGroups:search=city-guided
```

**Informations disponibles** :
- **Target health** : État de santé de chaque container
- **Health check details** : Détails des health checks
- **Metrics** : Métriques par target

## 🚀 Accès rapide via les scripts

### Obtenir toutes les URLs

```bash
cd infra/provisioning/aws
pnpm run config get
```

Cela affiche toutes les URLs de la console AWS pour :
- ECS Cluster
- ECS Service
- Application Load Balancer
- CloudWatch Logs
- CloudFormation Stack

### Voir les logs via CLI

```bash
# Logs API (dernières 50 lignes)
aws logs tail /ecs/city-guided-api --follow --region eu-west-3

# Logs Web (dernières 50 lignes)
aws logs tail /ecs/city-guided-web --follow --region eu-west-3

# Logs avec filtre (erreurs uniquement)
aws logs tail /ecs/city-guided-api --filter-pattern "ERROR" --region eu-west-3

# Logs depuis une date
aws logs tail /ecs/city-guided-api --since 1h --region eu-west-3
```

### Voir l'état des services

```bash
# État du service ECS
aws ecs describe-services \
  --cluster city-guided-cluster \
  --services city-guided-service \
  --region eu-west-3 \
  --query 'services[0].{Status:status,Desired:desiredCount,Running:runningCount}'

# Tâches en cours
aws ecs list-tasks \
  --cluster city-guided-cluster \
  --service-name city-guided-service \
  --region eu-west-3

# Détails d'une tâche
aws ecs describe-tasks \
  --cluster city-guided-cluster \
  --tasks <task-id> \
  --region eu-west-3
```

## 📊 Métriques CloudWatch supplémentaires

### Métriques ECS standard

Dans CloudWatch → Metrics → AWS/ECS, vous trouverez :
- **CPUUtilization** : Utilisation CPU des tâches
- **MemoryUtilization** : Utilisation mémoire des tâches
- **RunningTaskCount** : Nombre de tâches en cours
- **DesiredTaskCount** : Nombre de tâches désirées

### Métriques ALB standard

Dans CloudWatch → Metrics → AWS/ApplicationELB :
- **RequestCount** : Nombre de requêtes
- **TargetResponseTime** : Temps de réponse
- **HTTPCode_Target_2XX_Count** : Requêtes réussies
- **HTTPCode_Target_4XX_Count** : Erreurs client
- **HTTPCode_Target_5XX_Count** : Erreurs serveur
- **HealthyHostCount** : Nombre de targets sains

### Créer des alarmes

Vous pouvez créer des alarmes CloudWatch pour :
- **Scale-up automatique** : Alarme sur RequestCount > 0
- **Erreurs** : Alarme sur 5XX > seuil
- **Santé** : Alarme sur HealthyHostCount = 0
- **Ressources** : Alarme sur CPU/Memory > seuil

## 🎨 Personnaliser le Dashboard

Le dashboard CloudWatch peut être personnalisé :

1. Aller dans **CloudWatch** → **Dashboards** → `CityGuided-ECS-ScaleToZero`
2. Cliquer sur **Edit**
3. Ajouter des widgets :
   - Métriques CPU/Memory
   - Métriques ALB (latence, erreurs)
   - Logs Insights (requêtes sur les logs)
   - Annotations (déploiements, événements)

### Exemple : Ajouter un widget Logs Insights

1. Dans le dashboard, cliquer sur **Add widget**
2. Sélectionner **Logs table** ou **Logs time series**
3. Choisir le log group `/ecs/city-guided-api`
4. Ajouter une requête, par exemple :
   ```
   fields @timestamp, @message
   | filter @message like /ERROR/
   | sort @timestamp desc
   | limit 20
   ```

## 🔗 Liens rapides

Tous ces liens sont générés automatiquement après le déploiement. Pour les obtenir :

```bash
# Après le déploiement, les URLs sont affichées dans les outputs
cd infra/provisioning/aws
pnpm run provision staging  # ou prod

# Les URLs sont aussi dans les outputs CloudFormation
aws cloudformation describe-stacks \
  --stack-name CityGuidedEcsStack \
  --region eu-west-3 \
  --query 'Stacks[0].Outputs'
```

## 💡 Conseils

1. **Bookmark les dashboards** : Ajoutez les URLs dans vos favoris pour un accès rapide
2. **Utilisez CloudWatch Logs Insights** : Pour des requêtes complexes sur les logs
3. **Configurez des alarmes** : Pour être alerté en cas de problème
4. **Exportez les logs** : Vers S3 pour une analyse à long terme
5. **Utilisez X-Ray** : Pour le tracing distribué (si activé)
