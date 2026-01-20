/**
 * Deployer Factory
 * Creates the appropriate deployer based on infrastructure mode
 * 
 * Note: EC2 has been decommissioned. All environments now use ECS Fargate.
 * EC2Deployer is kept for backward compatibility but should not be used.
 */

import { Deployer } from './deployer.js';
import { EC2Deployer } from './ec2-deployer.js';
import { ECSDeployer } from './ecs-deployer.js';

// Infrastructure modes
export type InfraMode = 'ec2' | 'ecs';

/**
 * Create a deployer instance for the specified infrastructure mode
 * 
 * @deprecated EC2 mode is deprecated. All environments use ECS.
 */
export function createDeployer(mode: InfraMode): Deployer {
  switch (mode) {
    case 'ec2':
      console.warn('⚠️  EC2 mode is deprecated. All environments now use ECS Fargate.');
      return new EC2Deployer();
    case 'ecs':
      return new ECSDeployer();
    default:
      throw new Error(`Unknown infrastructure mode: ${mode}`);
  }
}

/**
 * Get available infrastructure modes
 * 
 * @deprecated EC2 mode is deprecated.
 */
export function getAvailableModes(): InfraMode[] {
  return ['ecs']; // EC2 decommissioned
}