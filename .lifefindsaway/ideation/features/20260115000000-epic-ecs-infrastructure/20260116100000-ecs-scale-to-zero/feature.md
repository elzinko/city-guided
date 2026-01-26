# Feature – ECS Scale-to-Zero

## Identifiant
FEAT-INFRA-002

## Résumé
Implémenter un mécanisme de scale-to-zero automatique pour ECS Fargate, permettant de réduire les coûts en arrêtant les containers lorsqu'il n'y a pas de trafic, tout en garantissant un réveil rapide à la première requête.

## Problème adressé
- ECS Fargate ne supporte pas nativement le scale-to-zero
- Sans scale-to-zero, les coûts sont fixes même sans trafic
- Besoin d'un mécanisme pour détecter l'inactivité et réveiller le service

## Hypothèse de valeur
Un scale-to-zero intelligent permet de ne payer que l'usage réel, tout en maintenant une expérience utilisateur acceptable (cold start < 60s).

✅ Hypothèse validée par l'implémentation

## Utilisateurs concernés
- DevOps / Admin (monitoring, configuration)
- Utilisateurs finaux (temps de réponse première requête)

## Scénarios d'usage pressentis

### Scénario 1 : Inactivité détectée
1. Pas de trafic pendant 5 minutes
2. CloudWatch alarm se déclenche
3. Lambda warmkeeper met `desiredCount=0`
4. Service ECS arrête les containers
5. Coût = 0€ tant que inactif

### Scénario 2 : Première requête (réveil)
1. Utilisateur accède à l'app
2. ALB reçoit la requête
3. CloudWatch metric "RequestCount > 0" détectée
4. Lambda warmkeeper met `desiredCount=1`
5. ECS démarre un container (< 60s)
6. ALB route vers le nouveau container

### Scénario 3 : Maintien en vie (heartbeat)
1. Service actif avec utilisateurs
2. Caddy envoie un heartbeat périodique
3. CloudWatch metric reste > 0
4. Service reste à `desiredCount=1`

## Idées de solution (non exclusives)

### Option A : Lambda warmkeeper (choisie)
- Lambda déclenchée par CloudWatch alarms
- Gère le scale-up (réveil) et scale-down (sommeil)
- Dashboard pour monitoring

### Option B : Application Auto Scaling
- Natif AWS mais ne descend pas à 0
- Minimum `desiredCount=1`

### Option C : API Gateway + Lambda
- Pas de container, serverless pur
- Nécessiterait refonte de l'app

## Critères d'acceptation (brouillon)

- [x] Lambda warmkeeper déployée
- [x] CloudWatch alarms configurées (5 min inactivité)
- [x] Scale-down automatique vers 0
- [x] Scale-up automatique à la première requête
- [x] Cold start < 60 secondes
- [x] Webhook Caddy pour heartbeat
- [x] Dashboard CloudWatch monitoring

## Contraintes connues

### Techniques
- Cold start incompressible (~30-60s selon image Docker)
- ALB reste actif même si ECS à 0 (coût fixe ~15-20€)
- Health checks ALB doivent tolérer le cold start

### Organisationnelles
- Monitoring nécessaire pour détecter anomalies

## Hypothèses explicites
- ✅ Cold start < 60s acceptable pour ce projet
- ✅ 5 minutes d'inactivité = seuil raisonnable
- ✅ Un seul utilisateur concurrent max en staging

## Dépendances pressenties
- Feature ECS Fargate Migration (FEAT-INFRA-001) - prérequis

## Risques identifiés

### Technique
- ⚠️ Cold start variable selon charge AWS
  - **Mitigation** : Monitoring et alertes

### Expérience utilisateur
- ⚠️ Premier utilisateur attend ~60s
  - **Mitigation** : Page de loading / splash screen

## Métriques de succès
- ✅ Scale-to-zero fonctionne après 5 min
- ✅ Scale-up en < 60 secondes
- ✅ Coût proche de 0 quand inactif (hors ALB)
- ✅ Dashboard fonctionnel

## Notes implémentation

### Fichiers créés
- `infra/provisioning/aws/lib/lambdas/warmkeeper/` : Lambda scale-to-zero
- `infra/provisioning/aws/lib/ecs-stack.ts` : Intégration warmkeeper
- Dashboard CloudWatch pour monitoring

### Configuration
```typescript
// CloudWatch Alarm - 5 minutes sans requête
const noTrafficAlarm = new cloudwatch.Alarm(this, 'NoTrafficAlarm', {
  metric: requestCountMetric,
  threshold: 0,
  evaluationPeriods: 5,
  datapointsToAlarm: 5,
  comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
})

// Lambda warmkeeper
const warmkeeper = new lambda.Function(this, 'Warmkeeper', {
  handler: 'index.handler',
  // Gère SCALE_UP et SCALE_DOWN
})
```

### Webhook Caddy
```
# Heartbeat toutes les 30s pour maintenir le service actif
POST https://api.cityguided.dev/health
```

## Statut
✅ **TERMINÉ** - 2026-01-16

### Implémenté
- ✅ Lambda warmkeeper déployée
- ✅ CloudWatch alarms configurées
- ✅ Scale-to-zero automatique (5 min)
- ✅ Scale-up automatique (première requête)
- ✅ Dashboard monitoring
- ✅ Documentation technique

## Documentation
- `docs/technical/ecs-scale-to-zero.md` - Architecture détaillée
