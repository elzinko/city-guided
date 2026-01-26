# Feature – ECS Fargate Migration

## Identifiant
FEAT-INFRA-001

## Résumé
Migrer l'infrastructure de déploiement vers ECS Fargate pour bénéficier 
du scale-to-zero automatique, réduire les coûts et améliorer la maintenabilité.

## Problème adressé
- Infrastructure costs ~12-15€/mois même sans trafic
- Pas de scale-to-zero natif
- Maintenance infrastructure (patches, mises à jour)

## Hypothèse de valeur
ECS Fargate permettrait de ne payer que l'usage réel et d'éliminer la 
maintenance infrastructure, avec un scale-up rapide en cas de besoin.

⚠️ Hypothèse : le coût ALB (~15-20€/mois) est compensé par le scale-to-zero

## Utilisateurs concernés
- DevOps / Admin
- Développeurs (déploiement)
- Utilisateurs finaux (disponibilité)

## Scénarios d'usage pressentis

### Scénario 1 : Déploiement standard
1. Push sur main déclenche le build
2. Images Docker poussées sur GHCR
3. CDK déploie la nouvelle version sur ECS
4. Health checks valident le déploiement

### Scénario 2 : Scale-to-zero
1. Pas de trafic pendant 5 minutes
2. Service scale automatiquement à 0 instance
3. Première requête déclenche le scale-up
4. Réponse en < 60 secondes

## Idées de solution (non exclusives)

### Option A : Mode dual infrastructure/ECS
- Flag `--mode ecs` ou `--mode legacy` dans le provisioning
- Permet de basculer facilement
- **Choisie et implémentée**

### Option B : Migration directe
- Suppression legacy, passage full ECS
- Plus simple mais moins de rollback

## Critères d'acceptation (brouillon)

- [x] Stack CDK ECS fonctionnelle
- [x] Containers API + Web + Caddy
- [x] ALB avec health checks
- [x] Auto-scaling configuré
- [x] Provisioning via `pnpm infra:provision staging --mode=ecs`
- [ ] Tests E2E validés sur ECS
- [ ] Documentation complète

## Contraintes connues

### Techniques
- ALB requis (~15-20€/mois fixe)
- Cold start jusqu'à 60s au premier appel
- Images Docker sur GHCR

### Organisationnelles
- Formation minimale sur ECS

## Hypothèses explicites
- ⚠️ Le cold start < 60s est acceptable pour l'usage actuel
- ⚠️ Les coûts ALB sont compensés par les économies scale-to-zero

## Dépendances pressenties
- VPC AWS existant
- Images Docker sur GHCR
- Certificat SSL (ACM)

## Questions ouvertes
- ~~Mode dual ou migration directe ?~~ → Mode dual choisi
- Faut-il un scale-up automatique sur première requête ?

## Risques pressentis
- Cold start trop long pour UX
- Coût ALB supérieur aux économies
- Complexité debugging ECS vs infrastructure legacy

## Indicateurs de succès (indicatifs)
- Scale-to-zero fonctionne après 5 min
- Scale-up < 60 secondes
- Coût mensuel < 25€
- Zero maintenance infrastructure

## Notes libres
- Documentation technique détaillée : `docs/technical/ecs-fargate-migration.md`
- Stack CDK : `infra/provisioning/aws/lib/ecs-stack.ts`
- Infrastructure legacy mode has been fully removed
