# Guide de développement - Lambdas Scale-to-Zero

Guide rapide pour développer et tester les Lambdas de scale-to-zero en local.

## Installation rapide

```bash
cd infra/provisioning/aws/lambdas

# Installer les dépendances des deux Lambdas
cd scale-to-zero && npm install && cd ..
cd scale-up && npm install && cd ..
```

## Développement

### 1. Ouvrir dans votre IDE

Les fichiers TypeScript sont dans :
- `scale-to-zero/index.ts`
- `scale-up/index.ts`

Vous bénéficiez de :
- ✅ Auto-complétion TypeScript
- ✅ Vérification de types
- ✅ Navigation dans le code (Go to Definition)
- ✅ Refactoring automatique

### 2. Compilation en temps réel

```bash
# Dans scale-to-zero/
cd scale-to-zero
npx tsc --watch

# Dans scale-up/
cd scale-up
npx tsc --watch
```

Les fichiers JavaScript compilés apparaissent dans `dist/`.

### 3. Linting (optionnel)

Pour ajouter ESLint :

```bash
cd scale-to-zero  # ou scale-up
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npx eslint --init
```

## Structure des fichiers

```
lambdas/
├── scale-to-zero/
│   ├── index.ts          # Code source TypeScript
│   ├── package.json      # Dépendances AWS SDK
│   ├── tsconfig.json     # Configuration TypeScript
│   ├── node_modules/     # (git-ignoré)
│   └── dist/             # (git-ignoré) Fichiers compilés
│
├── scale-up/
│   ├── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── node_modules/
│   └── dist/
│
├── README.md             # Documentation générale
├── DEV.md                # Ce fichier
├── REFACTORING.md        # Résumé du refactoring
└── test-lambdas.sh       # Script de test
```

## Configuration

### Variables d'environnement

Les variables sont injectées par CDK au déploiement. Pour les tests locaux, créez un fichier `.env` :

**scale-to-zero/.env**
```bash
CLUSTER_NAME=city-guided-cluster
SERVICE_NAME=city-guided-service
TARGET_GROUP_NAME=targetgroup/city-guided-web/abc123
AWS_REGION=us-east-1
```

**scale-up/.env**
```bash
CLUSTER_NAME=city-guided-cluster
SERVICE_NAME=city-guided-service
ALB_FULL_NAME=app/city-guided-alb/xyz789
AWS_REGION=us-east-1
```

### Paramètres configurables

#### Délai d'inactivité (scale-to-zero)

**Fichier** : `scale-to-zero/index.ts`

```typescript
const IDLE_DURATION_MINUTES = 5; // Changer ici
```

#### Fenêtre de détection (scale-up)

**Fichier** : `scale-up/index.ts`

```typescript
const startTime = new Date(endTime.getTime() - 2 * 60 * 1000); // Changer le 2
```

## Tests

### Tests unitaires (à implémenter)

Pour ajouter des tests avec Vitest :

```bash
cd scale-to-zero  # ou scale-up
npm install --save-dev vitest
```

Créer `index.test.ts` :

```typescript
import { describe, it, expect, vi } from 'vitest';
import { handler } from './index';

describe('Scale-to-Zero Lambda', () => {
  it('should scale to zero when no requests', async () => {
    // Mock AWS SDK
    // Test logic
  });
});
```

### Tests manuels sur AWS

```bash
# Depuis le dossier lambdas/
./test-lambdas.sh
```

Ce script :
1. Vérifie l'existence des Lambdas
2. Invoque les deux Lambdas
3. Affiche les réponses et logs
4. Montre l'état du service ECS
5. Affiche les métriques CloudWatch

### Tests locaux avec SAM (optionnel)

Pour tester les Lambdas localement avec AWS SAM :

1. Installer AWS SAM CLI : https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html

2. Créer `template.yaml` :

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  ScaleToZeroFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: scale-to-zero/
      Handler: index.handler
      Runtime: nodejs20.x
      Environment:
        Variables:
          CLUSTER_NAME: city-guided-cluster
          SERVICE_NAME: city-guided-service
          TARGET_GROUP_NAME: targetgroup/...
```

3. Invoquer localement :

```bash
sam local invoke ScaleToZeroFunction
```

## Déploiement

### Compilation automatique

Le CDK compile automatiquement les Lambdas lors du déploiement :

```bash
cd ../..  # Retour à infra/provisioning/aws/
npm run cdk:deploy
```

Le processus :
1. CDK détecte les changements dans `lambdas/`
2. Lance un container Docker avec Node.js
3. Exécute `npm install` et `npx tsc` dans le container
4. Copie les artifacts (`node_modules`, `package.json`, `index.js`) dans l'asset
5. Upload l'asset vers S3
6. Met à jour les Lambdas avec le nouveau code

### Déploiement rapide (hot swap)

Pour déployer uniquement les Lambdas sans passer par CloudFormation :

```bash
npm run cdk:deploy -- --hotswap
```

⚠️ **Attention** : `--hotswap` est pour le développement uniquement, pas pour la production.

### Vérification post-déploiement

```bash
# Lister les Lambdas
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `CityGuidedEcsStack-Scale`)].{Name:FunctionName,Runtime:Runtime,Size:CodeSize}'

# Obtenir la config d'une Lambda
aws lambda get-function-configuration --function-name CityGuidedEcsStack-ScaleToZeroLambda...

# Télécharger le code déployé (pour comparaison)
aws lambda get-function --function-name CityGuidedEcsStack-ScaleToZeroLambda... --query 'Code.Location' --output text | xargs curl -o lambda-deployed.zip
unzip lambda-deployed.zip
cat index.js
```

## Debugging

### Logs CloudWatch

```bash
# Suivre les logs en temps réel
aws logs tail /aws/lambda/CityGuidedEcsStack-ScaleToZeroLambda... --follow

# Filtrer les logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/CityGuidedEcsStack-ScaleToZeroLambda... \
  --filter-pattern "ERROR"
```

### Logs structurés

Pour améliorer le debugging, ajoutez des logs structurés :

```typescript
console.log(JSON.stringify({
  level: 'INFO',
  message: 'Checking service state',
  data: { desiredCount, runningCount },
  timestamp: new Date().toISOString(),
}));
```

### CloudWatch Insights

Requête pour analyser les logs :

```
fields @timestamp, @message
| filter @message like /Scale-to-zero check/
| stats count() by bin(5m)
```

### X-Ray (optionnel)

Pour activer AWS X-Ray sur les Lambdas :

**Fichier** : `lib/ecs-stack.ts`

```typescript
const scaleToZeroLambda = new lambda.Function(this, 'ScaleToZeroLambda', {
  // ... config existante ...
  tracing: lambda.Tracing.ACTIVE,
});
```

Puis dans le code Lambda :

```typescript
import { captureAWSv3Client } from 'aws-xray-sdk-core';
import { ECSClient } from '@aws-sdk/client-ecs';

const ecsClient = captureAWSv3Client(new ECSClient({}));
```

## Bonnes pratiques

### 1. Types TypeScript

Définissez des interfaces pour les réponses :

```typescript
interface LambdaResponse {
  statusCode: number;
  body: string;
}

interface ServiceState {
  desiredCount: number;
  runningCount: number;
  action: 'scaled_to_zero' | 'scaled_up' | 'noop';
}
```

### 2. Gestion d'erreurs

Utilisez des try-catch spécifiques :

```typescript
try {
  await ecsClient.send(new UpdateServiceCommand({ ... }));
} catch (error) {
  if (error.name === 'ServiceNotFoundException') {
    // Gestion spécifique
  } else {
    throw error;
  }
}
```

### 3. Tests de charge

Pour tester la réactivité du scale-to-zero :

```bash
# Envoyer 100 requêtes en 10 secondes
for i in {1..100}; do
  curl -s http://<alb-dns> &
  sleep 0.1
done
wait
```

### 4. Métriques personnalisées

Ajoutez des métriques pour le monitoring :

```typescript
await cloudwatchClient.send(new PutMetricDataCommand({
  Namespace: 'CityGuided/ECS/Lambda',
  MetricData: [{
    MetricName: 'ExecutionDuration',
    Value: executionTime,
    Unit: 'Milliseconds',
  }],
}));
```

## Dépannage

### Erreur : "Cannot find module '@aws-sdk/client-ecs'"

```bash
cd scale-to-zero  # ou scale-up
npm install
```

### Erreur : "Property 'xyz' does not exist on type ..."

Vérifiez les types AWS SDK :

```bash
npm install --save-dev @types/node
```

### Erreur lors du déploiement : "Bundling failed"

Vérifiez que Docker est en cours d'exécution :

```bash
docker ps
```

Si Docker n'est pas disponible, utilisez le bundling local :

```typescript
code: lambda.Code.fromAsset('../lambdas/scale-to-zero', {
  bundling: {
    local: {
      tryBundle(outputDir: string) {
        execSync('npm install && npx tsc', { cwd: '../lambdas/scale-to-zero' });
        execSync(`cp -r node_modules package.json dist/index.js ${outputDir}/`);
        return true;
      },
    },
  },
}),
```

### Lambda timeout

Si la Lambda timeout (1 minute), augmentez le délai :

**Fichier** : `lib/ecs-stack.ts`

```typescript
timeout: cdk.Duration.minutes(2), // au lieu de 1
```

## Ressources

- [AWS Lambda avec TypeScript](https://docs.aws.amazon.com/lambda/latest/dg/lambda-typescript.html)
- [AWS SDK v3 pour JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [CDK Lambda Bundling](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda-readme.html#bundling-asset-code)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

## Support

Pour toute question ou problème :
1. Consultez les logs CloudWatch
2. Vérifiez la documentation dans `README.md`
3. Consultez la doc technique `docs/technical/ecs-scale-to-zero.md`
