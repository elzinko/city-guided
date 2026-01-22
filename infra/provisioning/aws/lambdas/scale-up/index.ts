import { ECSClient, UpdateServiceCommand, DescribeServicesCommand } from '@aws-sdk/client-ecs';
import { SSMClient, PutParameterCommand } from '@aws-sdk/client-ssm';

const ecsClient = new ECSClient({});
const ssmClient = new SSMClient({});

const CLUSTER_NAME = process.env.CLUSTER_NAME!;
const SERVICE_NAME = process.env.SERVICE_NAME!;
const SSM_TIMESTAMP_PARAM = process.env.SSM_TIMESTAMP_PARAM!;

interface ScaleUpResponse {
  statusCode: number;
  body: string;
  headers?: Record<string, string>;
}

/**
 * ScaleUp Lambda - Appelée par Caddy via Function URL quand un 503 est détecté
 * 
 * Logique simple:
 * 1. Si service à 0 → scale up à 1
 * 2. Stocker timestamp dans SSM (pour que ScaleToZero sache quand il y a eu activité)
 */
export const handler = async (event?: { source?: string }): Promise<ScaleUpResponse> => {
  const source = event?.source || 'http';
  console.log('Scale-up triggered', { 
    timestamp: new Date().toISOString(),
    source 
  });
  
  try {
    // 1. Vérifier l'état actuel du service
    const describeResponse = await ecsClient.send(new DescribeServicesCommand({
      cluster: CLUSTER_NAME,
      services: [SERVICE_NAME]
    }));
    
    const service = describeResponse.services?.[0];
    if (!service) {
      console.error('Service not found');
      return jsonResponse(404, { error: 'Service not found' });
    }
    
    const currentDesiredCount = service.desiredCount || 0;
    const runningCount = service.runningCount || 0;
    
    // 2. Toujours mettre à jour le timestamp d'activité (même si déjà running)
    await updateActivityTimestamp();
    
    // 3. Si déjà à 1 ou plus, juste confirmer
    if (currentDesiredCount >= 1) {
      console.log('Service already scaled up', { currentDesiredCount, runningCount });
      return jsonResponse(200, {
        action: 'noop',
        reason: 'Service already scaled up',
        desiredCount: currentDesiredCount,
        runningCount
      });
    }
    
    // 4. Scale up!
    console.log('Scaling up service from 0 to 1');
    await ecsClient.send(new UpdateServiceCommand({
      cluster: CLUSTER_NAME,
      service: SERVICE_NAME,
      desiredCount: 1
    }));
    
    return jsonResponse(200, {
      action: 'scaled_up',
      previousDesiredCount: 0,
      newDesiredCount: 1,
      reason: 'Triggered by incoming request'
    });
    
  } catch (error) {
    console.error('Error in scale-up lambda', error);
    const err = error as Error;
    return jsonResponse(500, { 
      error: err.message 
    });
  }
};

async function updateActivityTimestamp(): Promise<void> {
  const timestamp = Date.now().toString();
  try {
    await ssmClient.send(new PutParameterCommand({
      Name: SSM_TIMESTAMP_PARAM,
      Value: timestamp,
      Type: 'String',
      Overwrite: true,
    }));
    console.log('Activity timestamp updated', { timestamp });
  } catch (error) {
    console.error('Error updating activity timestamp', error);
    // Non-fatal, continue anyway
  }
}

function jsonResponse(statusCode: number, body: object): ScaleUpResponse {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body)
  };
}
