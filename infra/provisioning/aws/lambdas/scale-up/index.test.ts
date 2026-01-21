import { describe, it } from 'vitest';
// import { expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { ECSClient, DescribeServicesCommand, UpdateServiceCommand } from '@aws-sdk/client-ecs';
import { CloudWatchClient, GetMetricStatisticsCommand, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

// Importer le handler (après avoir ajouté l'export dans index.ts)
// import { handler } from './index';

// Mock des clients AWS
const ecsMock = mockClient(ECSClient);
const cloudwatchMock = mockClient(CloudWatchClient);

describe('Scale-Up Lambda', () => {
  beforeEach(() => {
    // Reset des mocks avant chaque test
    ecsMock.reset();
    cloudwatchMock.reset();
    
    // Configuration des variables d'environnement
    process.env.CLUSTER_NAME = 'test-cluster';
    process.env.SERVICE_NAME = 'test-service';
    process.env.ALB_FULL_NAME = 'app/test-alb/xyz789';
  });

  describe('Service déjà actif', () => {
    it('devrait ne rien faire si desiredCount >= 1', async () => {
      // Arrange
      ecsMock.on(DescribeServicesCommand).resolves({
        services: [{
          desiredCount: 1,
          runningCount: 1,
        }],
      });

      // Act
      // const response = await handler();

      // Assert
      // expect(response.statusCode).toBe(200);
      // expect(JSON.parse(response.body).action).toBe('noop');
      // expect(JSON.parse(response.body).reason).toContain('already scaled up');
      // expect(cloudwatchMock.calls()).toHaveLength(0); // Pas de vérification de métriques
    });
  });

  describe('Service à 0 avec requêtes détectées', () => {
    it('devrait scaler à 1 et publier une métrique "scaled_up"', async () => {
      // Arrange
      ecsMock.on(DescribeServicesCommand).resolves({
        services: [{
          desiredCount: 0,
          runningCount: 0,
        }],
      });

      cloudwatchMock
        .on(GetMetricStatisticsCommand)
        .resolves({
          Datapoints: [
            {
              Timestamp: new Date(Date.now() - 1 * 60 * 1000), // Il y a 1 minute
              Sum: 5, // 5 requêtes
            },
          ],
        });

      ecsMock.on(UpdateServiceCommand).resolves({});
      cloudwatchMock.on(PutMetricDataCommand).resolves({});

      // Act
      // const response = await handler();

      // Assert
      // expect(response.statusCode).toBe(200);
      // expect(JSON.parse(response.body).action).toBe('scaled_up');
      // expect(JSON.parse(response.body).newDesiredCount).toBe(1);
      
      // Vérifier que UpdateService a été appelé avec desiredCount: 1
      // const updateServiceCalls = ecsMock.commandCalls(UpdateServiceCommand);
      // expect(updateServiceCalls).toHaveLength(1);
      // expect(updateServiceCalls[0].args[0].input.desiredCount).toBe(1);
    });
  });

  describe('Service à 0 sans requêtes', () => {
    it('devrait rester à 0 si aucune requête détectée', async () => {
      // Arrange
      ecsMock.on(DescribeServicesCommand).resolves({
        services: [{
          desiredCount: 0,
          runningCount: 0,
        }],
      });

      cloudwatchMock
        .on(GetMetricStatisticsCommand)
        .resolves({
          Datapoints: [], // Aucune requête dans les 2 dernières minutes
        });

      // Act
      // const response = await handler();

      // Assert
      // expect(response.statusCode).toBe(200);
      // expect(JSON.parse(response.body).action).toBe('noop');
      // expect(JSON.parse(response.body).reason).toContain('No requests detected');
      // expect(ecsMock.commandCalls(UpdateServiceCommand)).toHaveLength(0); // Pas de scale
    });
  });

  describe('Métriques ALB', () => {
    it('devrait interroger les métriques ALB globales avec les bonnes dimensions', async () => {
      // Arrange
      ecsMock.on(DescribeServicesCommand).resolves({
        services: [{ desiredCount: 0 }],
      });

      cloudwatchMock.on(GetMetricStatisticsCommand).resolves({
        Datapoints: [],
      });

      // Act
      // await handler();

      // Assert
      // const getMetricCalls = cloudwatchMock.commandCalls(GetMetricStatisticsCommand);
      // expect(getMetricCalls).toHaveLength(1);
      
      // const input = getMetricCalls[0].args[0].input;
      // expect(input.Namespace).toBe('AWS/ApplicationELB');
      // expect(input.MetricName).toBe('RequestCount');
      // expect(input.Dimensions).toEqual([
      //   { Name: 'LoadBalancer', Value: 'app/test-alb/xyz789' }
      // ]);
    });
  });

  describe('Fenêtre de temps', () => {
    it('devrait interroger les 2 dernières minutes', async () => {
      // Arrange
      const now = new Date('2026-01-21T10:00:00Z');
      vi.setSystemTime(now);

      ecsMock.on(DescribeServicesCommand).resolves({
        services: [{ desiredCount: 0 }],
      });

      cloudwatchMock.on(GetMetricStatisticsCommand).resolves({
        Datapoints: [],
      });

      // Act
      // await handler();

      // Assert
      // const getMetricCalls = cloudwatchMock.commandCalls(GetMetricStatisticsCommand);
      // const input = getMetricCalls[0].args[0].input;
      
      // expect(input.StartTime).toEqual(new Date('2026-01-21T09:58:00Z')); // now - 2 min
      // expect(input.EndTime).toEqual(now);
      // expect(input.Period).toBe(60); // 1 minute
    });
  });

  describe('Erreurs', () => {
    it('devrait retourner une erreur 404 si le service n\'existe pas', async () => {
      // Arrange
      ecsMock.on(DescribeServicesCommand).resolves({
        services: [],
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
