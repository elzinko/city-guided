/**
 * Deployer Factory
 * Creates the appropriate deployer based on infrastructure mode
 * 
 * Note: All environments use ECS Fargate.
 */

import { Deployer } from './deployer.js';
import { ECSDeployer } from './ecs-deployer.js';

// Infrastructure mode (only ECS supported)
export type InfraMode = 'ecs';

/**
 * Create a deployer instance for ECS infrastructure
 */
export function createDeployer(mode: InfraMode): Deployer {
  if (mode !== 'ecs') {
    throw new Error(`Unsupported infrastructure mode: ${mode}. Only 'ecs' is supported.`);
  }
  return new ECSDeployer();
}

/**
 * Get available infrastructure modes
 */
export function getAvailableModes(): InfraMode[] {
  return ['ecs'];
}