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
} as const;

export const SECURITY_CONFIG = {
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
 * All environments use ECS Fargate.
 */
export const INFRA_MODES = {
  staging: 'ecs' as const,
  prod: 'ecs' as const,
} as const;

export type InfraMode = typeof INFRA_MODES[keyof typeof INFRA_MODES];

/**
 * Get infrastructure mode for an environment
 * 
 * Note: Currently all environments use ECS, but we keep the env parameter
 * for future extensibility (e.g., if we want different modes per environment)
 */
export function getInfraMode(_env: EnvironmentName): 'ecs' {
   
  return 'ecs';
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENVIRONMENT CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Environment-specific AWS/infra configuration
 * 
 * Note: Application variables are in infra/config/.env.<environment>
 */
export const ENVIRONMENTS = {
  staging: {
    STACK_NAME: 'CityGuidedEcsStack',
  },
  prod: {
    STACK_NAME: 'CityGuidedEcsStack',
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
 * 
 * Note: Currently URLs are the same for all environments, but we keep the env parameter
 * for future extensibility (e.g., if we want environment-specific dashboards)
 */
export function getAwsConsoleUrls(_env: EnvironmentName): Record<string, string> {
   
  const region = AWS_CONFIG.region;
  const baseUrl = `https://${region}.console.aws.amazon.com`;
  
  return {
    // Dashboards & Monitoring
    'CloudWatch Dashboard (Scale-to-Zero)': `${baseUrl}/cloudwatch/home?region=${region}#dashboards:name=CityGuided-ECS-ScaleToZero`,
    'CloudWatch Container Insights': `${baseUrl}/cloudwatch/home?region=${region}#container-insights:performance/service?~(query~(controls~(CW*3a*3aECS.cluster~(~'city-guided-cluster)~CW*3a*3aECS.service~(~'city-guided-service)))~context~())`,
    'CloudWatch Alarms': `${baseUrl}/cloudwatch/home?region=${region}#alarmsV2:?search=city-guided`,
    'Cost Explorer (Service Costs)': `https://us-east-1.console.aws.amazon.com/cost-management/home?region=${region}#/cost-explorer?chartStyle=STACK&costAggregate=unBlendedCost&endDate=2026-02-01&filter=%5B%7B%22dimension%22%3A%7B%22id%22%3A%22Service%22%7D%2C%22operator%22%3A%22INCLUDES%22%2C%22values%22%3A%5B%22Amazon%20Elastic%20Container%20Service%22%2C%22Amazon%20Elastic%20Compute%20Cloud%20-%20Compute%22%2C%22Amazon%20EC2%20Container%20Registry%20%28ECR%29%22%2C%22Elastic%20Load%20Balancing%22%5D%7D%5D&granularity=Daily&groupBy=%5B%22Service%22%5D&isDefault=true&reportName=Cost%20and%20usage%20report&startDate=2026-01-01&usageAggregate=usageQuantity`,
    
    // ECS Resources
    'ECS Cluster': `${baseUrl}/ecs/v2/clusters/city-guided-cluster/services?region=${region}`,
    'ECS Service': `${baseUrl}/ecs/v2/clusters/city-guided-cluster/services/city-guided-service?region=${region}`,
    'ECS Tasks (Running)': `${baseUrl}/ecs/v2/clusters/city-guided-cluster/tasks?region=${region}&status=RUNNING`,
    'ECS Task Definitions': `${baseUrl}/ecs/v2/task-definitions?region=${region}&search=city-guided`,
    
    // Load Balancing
    'Application Load Balancer': `${baseUrl}/ec2/home?region=${region}#LoadBalancers:search=city-guided-alb`,
    'Target Groups': `${baseUrl}/ec2/home?region=${region}#TargetGroups:search=city-guided`,
    
    // Logging
    'CloudWatch Logs (API)': `${baseUrl}/cloudwatch/home?region=${region}#logsV2:log-groups/log-group/$252Fecs$252Fcity-guided-api`,
    'CloudWatch Logs (Web)': `${baseUrl}/cloudwatch/home?region=${region}#logsV2:log-groups/log-group/$252Fecs$252Fcity-guided-web`,
    'CloudWatch Log Groups (All)': `${baseUrl}/cloudwatch/home?region=${region}#logsV2:log-groups$3FlogGroupNameFilter$3Dcity-guided`,
    
    // Lambdas
    'Lambda Functions': `${baseUrl}/lambda/home?region=${region}#/functions?f0=true&fo=and&n0=false&o0=%3A&op=and&v0=city-guided`,
    
    // Configuration
    'SSM Parameters': `${baseUrl}/systems-manager/parameters?region=${region}&tab=Table#list_parameter_filters=Name:Contains:city-guided`,
    'CloudFormation Stack': `${baseUrl}/cloudformation/home?region=${region}#/stacks/stackinfo?stackId=CityGuidedEcsStack`,
    'ECR Repositories': `${baseUrl}/ecr/repositories?region=${region}`,
    
    // Networking
    'VPC Dashboard': `${baseUrl}/vpc/home?region=${region}#vpcs:`,
    'Security Groups': `${baseUrl}/ec2/home?region=${region}#SecurityGroups:search=city-guided`,
    
    // Reverse Proxy
    'EC2 Instance (Caddy)': `${baseUrl}/ec2/home?region=${region}#Instances:instanceState=running;search=caddy`,
  };
}
