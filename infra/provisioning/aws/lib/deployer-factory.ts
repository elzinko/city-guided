/**
 * Deployer Factory
 * Creates the appropriate deployer based on infrastructure mode
 */

import { Deployer } from './deployer.js';
import { EC2Deployer } from './ec2-deployer.js';
import { ECSDeployer } from './ecs-deployer.js';

// Infrastructure modes
export type InfraMode = 'ec2' | 'ecs';

/**
 * Create a deployer instance for the specified infrastructure mode
 */
export function createDeployer(mode: InfraMode): Deployer {
  switch (mode) {
    case 'ec2':
      return new EC2Deployer();
    case 'ecs':
      return new ECSDeployer();
    default:
      throw new Error(`Unknown infrastructure mode: ${mode}`);
  }
}

/**
 * Get available infrastructure modes
 */
export function getAvailableModes(): InfraMode[] {
  return ['ec2', 'ecs'];
}