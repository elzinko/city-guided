# Changelog - Lambdas Scale-to-Zero

## [1.1.0] - 2026-01-21

### Ajouté
- ✅ Extraction des Lambdas dans des fichiers TypeScript séparés
- ✅ `lambdas/scale-to-zero/index.ts` - Lambda de scale-to-zero
- ✅ `lambdas/scale-up/index.ts` - Lambda de scale-up
- ✅ `lambdas/README.md` - Documentation générale du système
- ✅ `lambdas/DEV.md` - Guide de développement
- ✅ `lambdas/REFACTORING.md` - Résumé des changements
- ✅ `lambdas/test-lambdas.sh` - Script de test automatisé
- ✅ `docs/technical/ecs-scale-to-zero.md` - Documentation technique complète
- ✅ Configuration TypeScript (`tsconfig.json`) pour chaque Lambda
- ✅ `package.json` avec dépendances AWS SDK v3 pour chaque Lambda
- ✅ `.gitignore` pour exclure `node_modules`, `dist`, etc.

### Modifié
- 🔧 `lib/ecs-stack.ts` - Utilisation de `lambda.Code.fromAsset()` avec bundling
- 🔧 Chemins relatifs vers les Lambdas : `../lambdas/scale-to-zero`, `../lambdas/scale-up`
- 🔧 Variables d'environnement transmises explicitement à chaque Lambda
- 📝 `lifefindsaway/features/20260116100000-ecs-scale-to-zero/feature.md` - Critères d'acceptation mis à jour
- 📝 `README.md` - Ajout d'une section Infrastructure AWS

### Améliorations
- 🚀 Code consultable et éditable dans l'IDE (syntax highlighting, auto-completion)
- 🚀 Types TypeScript pour une meilleure sécurité
- 🚀 Gestion de versions individuelles pour chaque Lambda
- 🚀 Tests unitaires possibles (Jest, Vitest)
- 🚀 Bundling automatique lors du déploiement CDK
- 🚀 Séparation claire entre infrastructure (CDK) et logique métier (Lambdas)

### Technique
- Compilation TypeScript automatique lors du déploiement via Docker
- Support AWS SDK v3 (@aws-sdk/client-ecs, @aws-sdk/client-cloudwatch)
- Bundling avec npm install + tsc dans le container CDK

## [1.0.0] - 2026-01-XX (date originale)

### Initial
- ✅ Système scale-to-zero fonctionnel avec code inline
- ✅ Lambda scale-to-zero (code JavaScript inline dans ecs-stack.ts)
- ✅ Lambda scale-up (code JavaScript inline dans ecs-stack.ts)
- ✅ EventBridge rules (toutes les minutes)
- ✅ Dashboard CloudWatch `CityGuided-ECS-ScaleToZero`
- ✅ Métriques personnalisées `CityGuided/ECS`
- ✅ Auto-scaling ECS configuré (min: 0, max: 1)
- ✅ Scale-to-zero après 5 minutes d'inactivité
- ✅ Scale-up automatique sur première requête

---

## Notes de version

### v1.1.0

Cette version maintient la compatibilité totale avec v1.0.0 tout en améliorant l'expérience développeur.

**Migration** : Aucune action requise côté AWS. Les Lambdas existantes seront automatiquement mises à jour lors du prochain déploiement.

**Rollback** : Si besoin, revert le commit et redéployer.

**Tests recommandés** :
1. Vérifier que les Lambdas se déploient correctement
2. Tester le scale-to-zero (attendre 5 min sans trafic)
3. Tester le scale-up (envoyer requête sur ALB)
4. Consulter les logs CloudWatch
5. Vérifier le dashboard

**Breaking changes** : Aucun

**Dépendances** :
- AWS CDK 2.x
- Node.js 20.x
- TypeScript 5.x
- AWS SDK v3 (@aws-sdk/client-ecs, @aws-sdk/client-cloudwatch)

### v1.0.0

Version initiale fonctionnelle avec code inline.
