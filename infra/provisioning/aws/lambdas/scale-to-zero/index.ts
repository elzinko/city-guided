import { ECSClient, UpdateServiceCommand, DescribeServicesCommand } from '@aws-sdk/client-ecs';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const ecsClient = new ECSClient({});
const ssmClient = new SSMClient({});

const CLUSTER_NAME = process.env.CLUSTER_NAME!;
const SERVICE_NAME = process.env.SERVICE_NAME!;
const SSM_TIMESTAMP_PARAM = process.env.SSM_TIMESTAMP_PARAM!;
const IDLE_DURATION_MINUTES = 5;

interface ScaleToZeroResponse {
  statusCode: number;
  body: string;
}

/**
 * ScaleToZero Lambda - Vérifie toutes les minutes si le service doit être arrêté
 * 
 * Logique simple:
 * 1. Lit le timestamp de dernière activité depuis SSM
 * 2. Si service running ET timestamp > 5 min → scale down
 * 3. Si service en transition (desired != running) → ne rien faire
 */
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
    
    // 2. Si le service est déjà à 0, rien à faire
    if (currentDesiredCount === 0) {
      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          action: 'noop', 
          reason: 'Service already at zero'
        }) 
      };
    }
    
    // 3. PROTECTION: Ne pas scale-down si le service est en transition
    if (currentDesiredCount !== runningCount) {
      console.log('Service is in transition, skipping scale-down', {
        desiredCount: currentDesiredCount,
        runningCount
      });
      return {
        statusCode: 200,
        body: JSON.stringify({
          action: 'noop',
          reason: 'Service is in transition (desiredCount != runningCount)'
        })
      };
    }
    
    // 4. Lire le timestamp de dernière activité depuis SSM
    const lastActivityTime = await getLastActivityTimestamp();
    const now = Date.now();
    const idleTimeMs = now - lastActivityTime;
    const idleTimeMinutes = Math.round(idleTimeMs / 60000);
    
    console.log('Activity analysis', {
      lastActivityTime: new Date(lastActivityTime).toISOString(),
      idleTimeMinutes,
      idleThresholdMinutes: IDLE_DURATION_MINUTES
    });
    
    // 5. Décision: scale-down si inactif depuis plus de 5 minutes
    if (idleTimeMs > IDLE_DURATION_MINUTES * 60 * 1000) {
      console.log('Service idle for too long, scaling to zero', {
        idleTimeMinutes,
        threshold: IDLE_DURATION_MINUTES
      });
      
      await ecsClient.send(new UpdateServiceCommand({
        cluster: CLUSTER_NAME,
        service: SERVICE_NAME,
        desiredCount: 0
      }));
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          action: 'scaled_to_zero',
          previousDesiredCount: currentDesiredCount,
          newDesiredCount: 0,
          reason: `No activity for ${idleTimeMinutes} minutes (threshold: ${IDLE_DURATION_MINUTES} min)`
        })
      };
    } else {
      console.log('Service still active, keeping running', {
        idleTimeMinutes,
        threshold: IDLE_DURATION_MINUTES
      });
      return {
        statusCode: 200,
        body: JSON.stringify({
          action: 'noop',
          reason: `Activity detected ${idleTimeMinutes} minutes ago (threshold: ${IDLE_DURATION_MINUTES} min)`
        })
      };
    }
    
  } catch (error) {
    console.error('Error in scale-to-zero lambda', error);
    const err = error as Error;
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: err.message
      })
    };
  }
};

async function getLastActivityTimestamp(): Promise<number> {
  try {
    const response = await ssmClient.send(new GetParameterCommand({
      Name: SSM_TIMESTAMP_PARAM,
    }));
    
    const timestamp = parseInt(response.Parameter?.Value || '0', 10);
    if (timestamp > 0) {
      return timestamp;
    }
  } catch (error: any) {
    // Si le paramètre n'existe pas, on considère qu'il n'y a pas eu d'activité
    if (error.name === 'ParameterNotFound') {
      console.log('No activity timestamp found in SSM, assuming no recent activity');
    } else {
      console.error('Error reading activity timestamp', error);
    }
  }
  
  // Par défaut, retourner un timestamp très ancien (force scale-down si pas d'activité)
  return 0;
}
