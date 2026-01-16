/**
 * AWS Provisioning Constants
 * 
 * This file contains ONLY AWS infrastructure configuration.
 * Environment variables are defined in: infra/config/.env.*
 * 
 * Usage:
 *   pnpm provision staging
 *   pnpm provision prod
 */

// ═══════════════════════════════════════════════════════════════════════════════
// AWS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const AWS_CONFIG = {
  region: 'eu-west-3', // Paris
  account: process.env.AWS_ACCOUNT_ID || '766050776787',
  ssmParameterPrefix: '/city-guided', // SSM Parameter Store prefix
  // Default stack name (used by CDK app.ts)
  stackName: 'CityGuidedStagingStack',
} as const;

export const EC2_CONFIG = {
  instanceType: 't3.medium', // 2 vCPU, 4GB RAM
  spotPrice: '0.0125', // ~70% discount
  amiName: 'amzn2-ami-hvm-*-x86_64-gp2', // Amazon Linux 2
  volumeSize: 30, // GB
} as const;

export const SECURITY_CONFIG = {
  allowedSshIps: ['0.0.0.0/0'], // Restrict in production
  ports: {
    ssh: 22,
    http: 80,
    https: 443,
    frontend: 3080,
    api: 4000,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// GITHUB CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const GITHUB_CONFIG = {
  owner: 'elzinko',
  repo: 'city-guided',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// INFRASTRUCTURE MODES (SOURCE OF TRUTH)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Infrastructure mode per environment
 * 
 * This is the source of truth for deployment mode.
 * Change here to switch between EC2 and ECS Fargate.
 */
export const INFRA_MODES = {
  staging: 'ecs' as const,  // ECS Fargate (migrated from EC2)
  prod: 'ec2' as const,     // EC2 Spot instance
  // To migrate to ECS: change to 'ecs'
} as const;

export type InfraMode = typeof INFRA_MODES[keyof typeof INFRA_MODES];

/**
 * Get infrastructure mode for an environment
 */
export function getInfraMode(env: EnvironmentName): 'ec2' | 'ecs' {
  return INFRA_MODES[env] || 'ec2';
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENVIRONMENT CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Environment-specific AWS/infra configuration
 * 
 * Note: Application variables are in infra/config/.env.<environment>
 * This only contains infrastructure-specific values (CloudFormation, key pairs)
 */
export const ENVIRONMENTS = {
  staging: {
    STACK_NAME: 'CityGuidedStagingStack',
    KEY_PAIR_NAME: 'city-guided-staging',
  },
  prod: {
    STACK_NAME: 'CityGuidedProdStack',
    KEY_PAIR_NAME: 'city-guided-prod',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export type EnvironmentName = keyof typeof ENVIRONMENTS;
export type EnvironmentConfig = typeof ENVIRONMENTS[EnvironmentName];

/**
 * Get AWS configuration for a specific environment
 */
export function getEnvironmentConfig(env: EnvironmentName): EnvironmentConfig {
  const config = ENVIRONMENTS[env];
  if (!config) {
    throw new Error(`Unknown environment: ${env}. Valid: ${Object.keys(ENVIRONMENTS).join(', ')}`);
  }
  return config;
}

/**
 * Check if a variable is a secret (prefixed with SECRET_)
 */
export function isSecret(name: string): boolean {
  return name.startsWith('SECRET_');
}

/**
 * Get SSM parameter path for an environment
 */
export function getSsmPath(env: EnvironmentName): string {
  return `${AWS_CONFIG.ssmParameterPrefix}/${env}`;
}

/**
 * Get path to .env file for an environment
 */
export function getEnvFilePath(env: EnvironmentName): string {
  return `infra/config/.env.${env}`;
}

/**
 * Get AWS Console URLs for infrastructure resources
 */
export function getAwsConsoleUrls(env: EnvironmentName, mode: 'ec2' | 'ecs'): Record<string, string> {
  const region = AWS_CONFIG.region;
  const baseUrl = `https://${region}.console.aws.amazon.com`;
  
  if (mode === 'ec2') {
    const config = getEnvironmentConfig(env);
    return {
      'EC2 Instance': `${baseUrl}/ec2/home?region=${region}#Instances:tag:Name=${config.STACK_NAME}`,
      'CloudWatch Logs': `${baseUrl}/cloudwatch/home?region=${region}#logsV2:log-groups`,
      'SSM Session Manager': `${baseUrl}/systems-manager/session-manager?region=${region}`,
      'CloudFormation Stack': `${baseUrl}/cloudformation/home?region=${region}#/stacks/stackinfo?stackId=${config.STACK_NAME}`,
    };
  } else {
    return {
      'CloudWatch Dashboard': `${baseUrl}/cloudwatch/home?region=${region}#dashboards:name=CityGuided-ECS-ScaleToZero`,
      'ECS Cluster': `${baseUrl}/ecs/v2/clusters/city-guided-cluster/services?region=${region}`,
      'ECS Service': `${baseUrl}/ecs/v2/clusters/city-guided-cluster/services/city-guided-service?region=${region}`,
      'Application Load Balancer': `${baseUrl}/ec2/home?region=${region}#LoadBalancers:search=city-guided-alb`,
      'Target Groups': `${baseUrl}/ec2/home?region=${region}#TargetGroups:search=city-guided`,
      'CloudWatch Logs (API)': `${baseUrl}/cloudwatch/home?region=${region}#logsV2:log-groups/log-group/$252Fecs$252Fcity-guided-api`,
      'CloudWatch Logs (Web)': `${baseUrl}/cloudwatch/home?region=${region}#logsV2:log-groups/log-group/$252Fecs$252Fcity-guided-web`,
      'CloudFormation Stack': `${baseUrl}/cloudformation/home?region=${region}#/stacks/stackinfo?stackId=CityGuidedEcsStack`,
    };
  }
}
