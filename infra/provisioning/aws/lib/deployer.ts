/**
 * Infrastructure Deployer Interface
 * Defines the common interface for infrastructure deployments (ECS)
 */

export interface InfraOutputs {
  instanceId?: string;
  publicIp?: string;
  clusterName?: string;
  serviceName?: string;
  loadBalancerArn?: string;
  [key: string]: any;
}

export interface DeploymentConfig {
  environment: string;
  envVars: Record<string, string>;
  awsCredentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export interface Deployer {
  /**
   * Deploy infrastructure for the given environment
   */
  deploy(config: DeploymentConfig): Promise<InfraOutputs>;

  /**
   * Destroy infrastructure for the given environment
   */
  destroy(environment: string): Promise<void>;

  /**
   * Setup environment-specific dependencies (Docker, etc.)
   */
  setupDependencies(outputs: InfraOutputs): Promise<void>;

  /**
   * Get stack/service names for the environment
   */
  getResourceNames(environment: string): {
    stackName?: string;
    clusterName?: string;
    serviceName?: string;
  };
}