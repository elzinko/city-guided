import { ECSClient, UpdateServiceCommand, DescribeServicesCommand } from '@aws-sdk/client-ecs';
import { CloudWatchClient, GetMetricStatisticsCommand, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

const ecsClient = new ECSClient({});
const cloudwatchClient = new CloudWatchClient({});

const CLUSTER_NAME = process.env.CLUSTER_NAME!;
const SERVICE_NAME = process.env.SERVICE_NAME!;
const TARGET_GROUP_NAME = process.env.TARGET_GROUP_NAME!;
const IDLE_DURATION_MINUTES = 5;

interface ScaleToZeroResponse {
  statusCode: number;
  body: string;
}

export const handler = async (): Promise<ScaleToZeroResponse> => {
  console.log('Scale-to-zero check triggered', { timestamp: new Date().toISOString() });
  
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
    const runningCount = service.runningCount || 0;
    
    console.log('Current service state', { 
      desiredCount: currentDesiredCount, 
      runningCount 
    });
    
    // 2. Si le service est déjà à 0, publier métrique et sortir
    if (currentDesiredCount === 0) {
      await publishMetric(0, 'idle');
      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          action: 'noop', 
          reason: 'Service already at zero',
          desiredCount: 0 
        }) 
      };
    }
    
    // 3. Vérifier les métriques ALB pour les 5 dernières minutes
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (IDLE_DURATION_MINUTES + 1) * 60 * 1000);
    
    const metricResponse = await cloudwatchClient.send(new GetMetricStatisticsCommand({
      Namespace: 'AWS/ApplicationELB',
      MetricName: 'RequestCount',
      Dimensions: [
        { Name: 'TargetGroup', Value: TARGET_GROUP_NAME }
      ],
      StartTime: startTime,
      EndTime: endTime,
      Period: 60, // 1 minute
      Statistics: ['Sum']
    }));
    
    // 4. Analyser les données de métriques
    const datapoints = metricResponse.Datapoints || [];
    const recentRequests = datapoints
      .filter(dp => {
        const dpTime = new Date(dp.Timestamp!);
        const minutesAgo = (endTime.getTime() - dpTime.getTime()) / (1000 * 60);
        return minutesAgo <= IDLE_DURATION_MINUTES;
      })
      .reduce((sum, dp) => sum + (dp.Sum || 0), 0);
    
    console.log('Request analysis', {
      totalDatapoints: datapoints.length,
      recentRequests,
      timeWindow: `Last ${IDLE_DURATION_MINUTES} minutes`
    });
    
    // 5. Décision : scale-to-zero si aucune requête dans les 5 dernières minutes
    if (recentRequests === 0) {
      console.log('No requests detected, scaling to zero');
      
      await ecsClient.send(new UpdateServiceCommand({
        cluster: CLUSTER_NAME,
        service: SERVICE_NAME,
        desiredCount: 0
      }));
      
      await publishMetric(0, 'scaled_to_zero');
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          action: 'scaled_to_zero',
          previousDesiredCount: currentDesiredCount,
          newDesiredCount: 0,
          reason: 'No requests in last 5 minutes'
        })
      };
    } else {
      // Publier métrique indiquant que le service est actif
      await publishMetric(currentDesiredCount, 'active');
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          action: 'noop',
          desiredCount: currentDesiredCount,
          reason: `${recentRequests} requests detected in last 5 minutes`
        })
      };
    }
    
  } catch (error) {
    console.error('Error in scale-to-zero lambda', error);
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
          Value: status === 'active' ? 1 : 0,
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
