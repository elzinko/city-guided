import { describe, it } from 'vitest';
// import { expect, vi, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { ECSClient, DescribeServicesCommand, UpdateServiceCommand } from '@aws-sdk/client-ecs';
import { CloudWatchClient, GetMetricStatisticsCommand, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

// Importer le handler (après avoir ajouté l'export dans index.ts)
// import { handler } from './index';

// Mock des clients AWS
const ecsMock = mockClient(ECSClient);
const cloudwatchMock = mockClient(CloudWatchClient);

describe('Scale-to-Zero Lambda', () => {
  beforeEach(() => {
    // Reset des mocks avant chaque test
    ecsMock.reset();
    cloudwatchMock.reset();
    
    // Configuration des variables d'environnement
    process.env.CLUSTER_NAME = 'test-cluster';
    process.env.SERVICE_NAME = 'test-service';
    process.env.TARGET_GROUP_NAME = 'targetgroup/test/123';
  });

  describe('Service déjà à 0', () => {
    it('devrait publier une métrique "idle" et ne rien faire', async () => {
      // Arrange
      ecsMock.on(DescribeServicesCommand).resolves({
        services: [{
          desiredCount: 0,
          runningCount: 0,
        }],
      });

      cloudwatchMock.on(PutMetricDataCommand).resolves({});

      // Act
      // const response = await handler();

      // Assert
      // expect(response.statusCode).toBe(200);
      // expect(JSON.parse(response.body).action).toBe('noop');
      // expect(ecsMock.calls()).toHaveLength(1); // Seulement DescribeServices
      // expect(cloudwatchMock.calls()).toHaveLength(1); // Seulement PutMetricData
    });
  });

  describe('Service actif avec requêtes récentes', () => {
    it('devrait publier une métrique "active" et ne pas scaler', async () => {
      // Arrange
      ecsMock.on(DescribeServicesCommand).resolves({
        services: [{
          desiredCount: 1,
          runningCount: 1,
        }],
      });

      cloudwatchMock
        .on(GetMetricStatisticsCommand)
        .resolves({
          Datapoints: [
            {
              Timestamp: new Date(Date.now() - 2 * 60 * 1000), // Il y a 2 minutes
              Sum: 10, // 10 requêtes
            },
          ],
        });

      cloudwatchMock.on(PutMetricDataCommand).resolves({});

      // Act
      // const response = await handler();

      // Assert
      // expect(response.statusCode).toBe(200);
      // expect(JSON.parse(response.body).action).toBe('noop');
      // expect(JSON.parse(response.body).reason).toContain('requests detected');
      // expect(ecsMock.commandCalls(UpdateServiceCommand)).toHaveLength(0); // Pas de scale
    });
  });

  describe('Service actif sans requêtes récentes', () => {
    it('devrait scaler à 0 et publier une métrique "scaled_to_zero"', async () => {
      // Arrange
      ecsMock.on(DescribeServicesCommand).resolves({
        services: [{
          desiredCount: 1,
          runningCount: 1,
        }],
      });

      cloudwatchMock
        .on(GetMetricStatisticsCommand)
        .resolves({
          Datapoints: [], // Aucune requête dans les 5 dernières minutes
        });

      ecsMock.on(UpdateServiceCommand).resolves({});
      cloudwatchMock.on(PutMetricDataCommand).resolves({});

      // Act
      // const response = await handler();

      // Assert
      // expect(response.statusCode).toBe(200);
      // expect(JSON.parse(response.body).action).toBe('scaled_to_zero');
      // expect(JSON.parse(response.body).newDesiredCount).toBe(0);
      
      // Vérifier que UpdateService a été appelé avec desiredCount: 0
      // const updateServiceCalls = ecsMock.commandCalls(UpdateServiceCommand);
      // expect(updateServiceCalls).toHaveLength(1);
      // expect(updateServiceCalls[0].args[0].input.desiredCount).toBe(0);
    });
  });

  describe('Erreur ECS', () => {
    it('devrait retourner une erreur 404 si le service n\'existe pas', async () => {
      // Arrange
      ecsMock.on(DescribeServicesCommand).resolves({
        services: [], // Service non trouvé
      });

      // Act
      // const response = await handler();

      // Assert
      // expect(response.statusCode).toBe(404);
      // expect(response.body).toContain('Service not found');
    });

    it('devrait retourner une erreur 500 en cas d\'exception', async () => {
      // Arrange
      ecsMock.on(DescribeServicesCommand).rejects(new Error('AWS Error'));

      // Act
      // const response = await handler();

      // Assert
      // expect(response.statusCode).toBe(500);
      // expect(JSON.parse(response.body).error).toBe('AWS Error');
    });
  });

  describe('Métriques CloudWatch', () => {
    it('devrait publier les bonnes métriques avec les bonnes dimensions', async () => {
      // Arrange
      ecsMock.on(DescribeServicesCommand).resolves({
        services: [{
          desiredCount: 0,
          runningCount: 0,
        }],
      });

      cloudwatchMock.on(PutMetricDataCommand).resolves({});

      // Act
      // await handler();

      // Assert
      // const putMetricCalls = cloudwatchMock.commandCalls(PutMetricDataCommand);
      // expect(putMetricCalls).toHaveLength(1);
      
      // const metricData = putMetricCalls[0].args[0].input.MetricData;
      // expect(metricData).toHaveLength(2); // ServiceDesiredCount + ServiceStatus
      
      // Vérifier ServiceDesiredCount
      // const desiredCountMetric = metricData?.find(m => m.MetricName === 'ServiceDesiredCount');
      // expect(desiredCountMetric?.Value).toBe(0);
      // expect(desiredCountMetric?.Unit).toBe('Count');
      
      // Vérifier ServiceStatus
      // const statusMetric = metricData?.find(m => m.MetricName === 'ServiceStatus');
      // expect(statusMetric?.Value).toBe(0); // idle
    });
  });
});

// Pour exécuter ces tests :
// 1. npm install --save-dev vitest aws-sdk-client-mock @vitest/ui
// 2. Ajouter dans package.json :
//    "scripts": {
//      "test": "vitest",
//      "test:ui": "vitest --ui"
//    }
// 3. Exporter le handler dans index.ts :
//    export const handler = async (...) => { ... }
// 4. npx vitest
