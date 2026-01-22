import { ECSClient, UpdateServiceCommand, DescribeServicesCommand } from '@aws-sdk/client-ecs';
import { CloudWatchClient, PutMetricDataCommand, GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch';

const ecsClient = new ECSClient({});
const cloudwatchClient = new CloudWatchClient({});

const CLUSTER_NAME = process.env.CLUSTER_NAME!;
const SERVICE_NAME = process.env.SERVICE_NAME!;
const ALB_FULL_NAME = process.env.ALB_FULL_NAME!;

interface ScaleUpResponse {
  statusCode: number;
  body: string;
}

export const handler = async (): Promise<ScaleUpResponse> => {
  console.log('Scale-up check triggered', { timestamp: new Date().toISOString() });
  
  try {
    // 1. Vérifier l'état actuel du service
    const describeResponse = await ecsClient.send(new DescribeServicesCommand({
      cluster: CLUSTER_NAME,
      services: [SERVICE_NAME]
    }));
    
    const service = describeResponse.services?.[0];
    if (!service) {
      console.error('Service not found');
      return { statusCode: 404, body: 'Service not found' };
    }
    
    const currentDesiredCount = service.desiredCount || 0;
    
    // 2. Si déjà à 1 ou plus, ne rien faire
    if (currentDesiredCount >= 1) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          action: 'noop',
          reason: 'Service already scaled up',
          desiredCount: currentDesiredCount
        })
      };
    }
    
    // 3. Vérifier les métriques ALB globales (fonctionne même quand service à 0)
    // Utiliser une fenêtre de 2 minutes avec période de 30s pour une détection plus réactive
    // Les métriques CloudWatch peuvent avoir un délai, donc on vérifie les dernières 2 minutes
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 2 * 60 * 1000); // 2 dernières minutes
    
    // Vérifier RequestCount (toutes les requêtes)
    const requestCountResponse = await cloudwatchClient.send(new GetMetricStatisticsCommand({
      Namespace: 'AWS/ApplicationELB',
      MetricName: 'RequestCount',
      Dimensions: [
        { Name: 'LoadBalancer', Value: ALB_FULL_NAME }
      ],
      StartTime: startTime,
      EndTime: endTime,
      Period: 30, // Période de 30 secondes pour une détection plus fine
      Statistics: ['Sum']
    }));
    
    // Vérifier HTTPCode_ELB_5XX_Count (erreurs générées par l'ALB lui-même)
    // IMPORTANT: Quand le service est à 0, il n'y a pas de target, donc l'ALB génère les 503
    // HTTPCode_Target_5XX_Count serait 0 car il n'y a pas de target pour répondre
    // HTTPCode_ELB_5XX_Count contient TOUTES les requêtes qui arrivent quand service=0
    const errorCountResponse = await cloudwatchClient.send(new GetMetricStatisticsCommand({
      Namespace: 'AWS/ApplicationELB',
      MetricName: 'HTTPCode_ELB_5XX_Count',
      Dimensions: [
        { Name: 'LoadBalancer', Value: ALB_FULL_NAME }
      ],
      StartTime: startTime,
      EndTime: endTime,
      Period: 30,
      Statistics: ['Sum']
    }));
    
    // 4. Analyser les données de métriques
    const requestDatapoints = requestCountResponse.Datapoints || [];
    const errorDatapoints = errorCountResponse.Datapoints || [];
    
    // Calculer le total des requêtes
    const totalRequests = requestDatapoints.reduce((sum, dp) => sum + (dp.Sum || 0), 0);
    const totalErrors = errorDatapoints.reduce((sum, dp) => sum + (dp.Sum || 0), 0);
    
    // Vérifier aussi les datapoints les plus récents (dernière minute)
    const oneMinuteAgo = new Date(endTime.getTime() - 60 * 1000);
    const recentRequestDatapoints = requestDatapoints.filter(dp => 
      dp.Timestamp && new Date(dp.Timestamp) >= oneMinuteAgo
    );
    const recentErrorDatapoints = errorDatapoints.filter(dp => 
      dp.Timestamp && new Date(dp.Timestamp) >= oneMinuteAgo
    );
    const recentRequests = recentRequestDatapoints.reduce((sum, dp) => sum + (dp.Sum || 0), 0);
    const recentErrors = recentErrorDatapoints.reduce((sum, dp) => sum + (dp.Sum || 0), 0);
    
    console.log('Request analysis', {
      requestDatapoints: requestDatapoints.length,
      errorDatapoints: errorDatapoints.length,
      recentRequestDatapoints: recentRequestDatapoints.length,
      recentErrorDatapoints: recentErrorDatapoints.length,
      totalRequests,
      totalErrors,
      recentRequests,
      recentErrors,
      timeWindow: 'Last 2 minutes (checking last 1 minute for reactivity)'
    });
    
    // 5. Si des requêtes sont détectées et le service est à 0, scale-up
    // - totalRequests: requêtes routées vers un target (quand service running)
    // - totalErrors: erreurs 503 générées par l'ALB (quand service à 0, pas de target)
    // En mode STANDBY (service=0), seul totalErrors sera > 0 car l'ALB génère les 503
    const hasActivity = totalRequests > 0 || totalErrors > 0;
    
    if (hasActivity) {
      console.log('Activity detected while service at zero, scaling up to 1', {
        totalRequests,
        totalErrors,
        recentRequests,
        recentErrors
      });
      
      await ecsClient.send(new UpdateServiceCommand({
        cluster: CLUSTER_NAME,
        service: SERVICE_NAME,
        desiredCount: 1
      }));
      
      await publishMetric(1, 'scaled_up');
      
      const reason = totalRequests > 0 
        ? `${totalRequests} requests routed to targets in last 2 minutes`
        : `${totalErrors} ALB 503 errors in last 2 minutes (users waiting for service to wake up)`;
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          action: 'scaled_up',
          previousDesiredCount: currentDesiredCount,
          newDesiredCount: 1,
          reason
        })
      };
    } else {
      return {
        statusCode: 200,
        body: JSON.stringify({
          action: 'noop',
          desiredCount: currentDesiredCount,
          reason: 'No requests detected, service remains at zero'
        })
      };
    }
    
  } catch (error) {
    console.error('Error in scale-up lambda', error);
    const err = error as Error;
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: err.message,
        stack: err.stack 
      })
    };
  }
};

async function publishMetric(desiredCount: number, status: string): Promise<void> {
  try {
    await cloudwatchClient.send(new PutMetricDataCommand({
      Namespace: 'CityGuided/ECS',
      MetricData: [
        {
          MetricName: 'ServiceDesiredCount',
          Value: desiredCount,
          Unit: 'Count',
          Timestamp: new Date(),
          Dimensions: [
            { Name: 'Service', Value: SERVICE_NAME },
            { Name: 'Cluster', Value: CLUSTER_NAME }
          ]
        },
        {
          MetricName: 'ServiceStatus',
          Value: status === 'active' || status === 'scaled_up' ? 1 : 0,
          Unit: 'None',
          Timestamp: new Date(),
          Dimensions: [
            { Name: 'Service', Value: SERVICE_NAME },
            { Name: 'Cluster', Value: CLUSTER_NAME }
          ]
        }
      ]
    }));
    console.log('Metrics published', { desiredCount, status });
  } catch (error) {
    console.error('Error publishing metrics', error);
  }
}
