# Feature – ECS Scale-to-Zero

## Identifiant
FEAT-INFRA-002

## Résumé
Mettre à l'échelle automatiquement le service ECS à 0 instance après 5 minutes 
d'inactivité consécutives, avec un dashboard CloudWatch pour visualiser l'état.

## Problème adressé
- Service ECS tourne 24/7 même sans trafic
- Pas de visibilité sur l'état actif/inactif
- Coûts inutiles en période d'inactivité

## Hypothèse de valeur
Un système automatique de scale-to-zero permettrait de ne payer que l'usage 
réel tout en maintenant une visibilité sur l'état du service.

## Utilisateurs concernés
- DevOps / Admin (monitoring)
- Finance (optimisation coûts)

## Scénarios d'usage pressentis

### Scénario 1 : Scale-to-zero automatique
1. Pas de requête pendant 5 minutes
2. Lambda vérifie les métriques ALB
3. Si inactif, scale le service à 0
4. Dashboard affiche "Inactif"

### Scénario 2 : Monitoring via dashboard
1. Admin consulte le dashboard CloudWatch
2. Voit l'historique actif/inactif
3. Analyse les patterns d'usage
4. Optimise si nécessaire

## Idées de solution (non exclusives)

### Option A : Lambda + EventBridge (choisie)
- Lambda vérifie métriques toutes les minutes
- EventBridge déclenche la Lambda
- Simple et économique (~0.50€/mois)

### Option B : CloudWatch Alarms
- Alarm sur métriques ALB
- Action scale-to-zero
- Plus natif mais moins flexible

## Critères d'acceptation (brouillon)

- [x] Lambda Scale-to-Zero déployée
- [x] Lambda Scale-Up disponible
- [x] EventBridge rule toutes les minutes
- [x] Métriques personnalisées CloudWatch
- [x] Dashboard `CityGuided-ECS-ScaleToZero`
- [x] Documentation technique

## Contraintes connues

### Techniques
- Délai métriques ALB : 1-2 minutes
- Scale-to-zero effectif après 6-7 minutes max

### Organisationnelles
- Nécessite compréhension CloudWatch

## Hypothèses explicites
- ⚠️ 5 minutes d'inactivité est le bon seuil
- ⚠️ Dashboard CloudWatch suffit (pas besoin de Grafana)

## Dépendances pressenties
- Feature ECS Fargate Migration (prérequis)
- ALB déployé
- Permissions IAM pour Lambda

## Questions ouvertes
- ~~Quel seuil d'inactivité ?~~ → 5 minutes
- Faut-il des alertes email/Slack ?

## Risques pressentis
- Métriques ALB en retard → scale-to-zero prématuré
- Lambda en erreur → pas de scale-to-zero

## Indicateurs de succès (indicatifs)
- Scale-to-zero fiable après 5 min
- Dashboard lisible et utile
- Coût infra Lambda < 1€/mois

## Notes libres
- Documentation technique détaillée : `docs/technical/ecs-scale-to-zero.md`
- Lambda code inline dans `ecs-stack.ts`
- Namespace métriques : `CityGuided/ECS`
