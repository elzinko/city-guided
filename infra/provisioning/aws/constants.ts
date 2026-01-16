/**
 * AWS Provisioning Constants
 * 
 * This file contains ONLY AWS infrastructure configuration.
 * Environment variables are defined in: infra/docker/.env.*
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
// ENVIRONMENT CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Environment-specific AWS/infra configuration
 * 
 * Note: Application variables are in infra/docker/.env.<environment>
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
  return `infra/docker/.env.${env}`;
}
