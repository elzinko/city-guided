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
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 2 * 60 * 1000); // 2 dernières minutes
    
    const metricResponse = await cloudwatchClient.send(new GetMetricStatisticsCommand({
      Namespace: 'AWS/ApplicationELB',
      MetricName: 'RequestCount',
      Dimensions: [
        { Name: 'LoadBalancer', Value: ALB_FULL_NAME }
      ],
      StartTime: startTime,
      EndTime: endTime,
      Period: 60,
      Statistics: ['Sum']
    }));
    
    // 4. Analyser les données de métriques
    const datapoints = metricResponse.Datapoints || [];
    const recentRequests = datapoints.reduce((sum, dp) => sum + (dp.Sum || 0), 0);
    
    console.log('Request analysis', {
      totalDatapoints: datapoints.length,
      recentRequests,
      timeWindow: 'Last 2 minutes'
    });
    
    // 5. Si des requêtes sont détectées et le service est à 0, scale-up
    if (recentRequests > 0) {
      console.log('Requests detected while service at zero, scaling up to 1');
      
      await ecsClient.send(new UpdateServiceCommand({
        cluster: CLUSTER_NAME,
        service: SERVICE_NAME,
        desiredCount: 1
      }));
      
      await publishMetric(1, 'scaled_up');
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          action: 'scaled_up',
          previousDesiredCount: currentDesiredCount,
          newDesiredCount: 1,
          reason: `${recentRequests} requests detected in last 2 minutes`
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
