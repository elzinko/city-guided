#!/usr/bin/env tsx
/**
 * Unified Provisioning Script
 * 
 * Provisions everything for a given environment:
 * 1. CloudFormation stack (EC2, Security Groups, IAM)
 * 2. AWS SSM Parameter Store (from .env.<environment> file)
 * 3. GitHub Secrets (minimal - just AWS credentials for CI)
 * 4. EC2 dependencies (Docker Compose v2, Docker Buildx)
 * 5. DuckDNS update
 * 
 * Source of truth: infra/config/.env.<environment>
 * 
 * Usage:
 *   pnpm provision staging
 *   pnpm provision prod
 */

import { execSync } from 'node:child_process';
// exec is defined but not used - kept for potential future use
import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import chalk from 'chalk';
import {
  AWS_CONFIG,
  GITHUB_CONFIG,
  getEnvironmentConfig,
  isSecret,
  getSsmPath,
  getEnvFilePath,
  getAwsEnvFilePath,
  getAwsConsoleUrls,
  type EnvironmentName,
} from '../constants.js';
import { loadMergedEnv } from './env-loader.js';
import { createDeployer, type InfraMode } from '../lib/deployer-factory.js';
import type { InfraOutputs } from '../lib/deployer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..', '..', '..');

const rl = createInterface({ input, output });

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n👋 Cancelled.\n'));
  rl.close();
  process.exit(0);
});

// Helper to ask questions with Ctrl+C handling
async function ask(prompt: string): Promise<string> {
  try {
    return await rl.question(prompt);
  } catch (error: any) {
    if (error.name === 'AbortError' || error.code === 'ERR_USE_AFTER_CLOSE') {
      console.log(chalk.yellow('\n\n👋 Cancelled.\n'));
      rl.close();
      process.exit(0);
    }
    throw error;
  }
}

// Env loading: loadMergedEnv from env-loader.js (applicatif + .env.aws.<env>)

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function execSilent(command: string): string {
  return execSync(command, { encoding: 'utf-8', stdio: 'pipe' }).trim();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function exec(command: string, options?: { silent?: boolean }): string {
  try {
    return execSync(command, { 
      encoding: 'utf-8', 
      stdio: options?.silent ? 'pipe' : 'inherit' 
    });
  } catch (error: any) {
    if (options?.silent) throw error;
    console.error(chalk.red(`\n❌ Command failed: ${error.message}`));
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AWS CREDENTIALS
// ═══════════════════════════════════════════════════════════════════════════════

async function getAWSCredentials(): Promise<{ accessKeyId: string; secretAccessKey: string }> {
  console.log(chalk.blue('\n🔑 AWS Credentials'));

  try {
    const accessKeyId = execSilent('aws configure get aws_access_key_id');
    const secretAccessKey = execSilent('aws configure get aws_secret_access_key');

    if (accessKeyId && secretAccessKey) {
      console.log(chalk.green('✓ Using credentials from AWS CLI config'));
      return { accessKeyId, secretAccessKey };
    }
  } catch {
    // Not configured
  }

  console.log(chalk.yellow('   AWS credentials not found in config'));
  
  const accessKeyId = await ask(chalk.yellow('AWS Access Key ID: '));
  const secretAccessKey = await ask(chalk.yellow('AWS Secret Access Key: '));
  
  return { accessKeyId: accessKeyId.trim(), secretAccessKey: secretAccessKey.trim() };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INFRASTRUCTURE DEPLOYMENT
// ═══════════════════════════════════════════════════════════════════════════════

// Infrastructure deployment is now handled by deployer classes (ECS only)

// ═══════════════════════════════════════════════════════════════════════════════
// AWS SSM PARAMETER STORE
// ═══════════════════════════════════════════════════════════════════════════════

function putSsmParameter(name: string, value: string, isSecure: boolean): void {
  const type = isSecure ? 'SecureString' : 'String';
  
  try {
    execSilent(
      `aws ssm put-parameter --name "${name}" --value "${value}" --type ${type} --overwrite --region ${AWS_CONFIG.region}`
    );
  } catch (error: any) {
    console.error(chalk.red(`   ❌ Failed to set ${name}: ${error.message}`));
  }
}

async function provisionSsmParameters(
  env: EnvironmentName, 
  envVars: Record<string, string>,
  awsCredentials: { accessKeyId: string; secretAccessKey: string },
  infraOutputs: InfraOutputs
): Promise<number> {
  const ssmPath = getSsmPath(env);
  
  console.log(chalk.blue(`\n📦 Provisioning SSM Parameters: ${ssmPath}/*`));

  // Build the complete config: .env variables + AWS secrets
  const fullConfig: Record<string, string> = {
    ...envVars,
    // Add AWS credentials
    SECRET_AWS_ACCESS_KEY_ID: awsCredentials.accessKeyId,
    SECRET_AWS_SECRET_ACCESS_KEY: awsCredentials.secretAccessKey,
    SECRET_AWS_REGION: AWS_CONFIG.region,
  };

  // Add infrastructure outputs if available
  if (infraOutputs.clusterName) {
    fullConfig.ECS_CLUSTER_NAME = infraOutputs.clusterName;
  }
  if (infraOutputs.serviceName) {
    fullConfig.ECS_SERVICE_NAME = infraOutputs.serviceName;
  }
  if (infraOutputs.publicIp) {
    fullConfig.REVERSE_PROXY_IP = infraOutputs.publicIp;
  }

  let count = 0;
  const secrets: string[] = [];
  const variables: string[] = [];

  for (const [key, value] of Object.entries(fullConfig)) {
    // Skip empty values
    if (value === '' || value === undefined) {
      console.log(chalk.yellow(`   ⊘ Skipping ${key} (empty)`));
      continue;
    }

    const paramName = `${ssmPath}/${key}`;
    const secure = isSecret(key);
    
    putSsmParameter(paramName, value, secure);
    
    if (secure) {
      secrets.push(key);
    } else {
      variables.push(key);
    }
    count++;
  }

  console.log(chalk.green(`✓ ${count} parameters stored in SSM`));
  console.log(chalk.dim(`   Variables: ${variables.length}`));
  console.log(chalk.dim(`   Secrets: ${secrets.length} (encrypted)`));

  return count;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GITHUB SECRETS (minimal - just for CI)
// ═══════════════════════════════════════════════════════════════════════════════

function setGitHubSecret(name: string, value: string, env: string): void {
  try {
    execSync(
      `gh secret set ${name} --repo ${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo} --env ${env}`,
      { input: value, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
  } catch (error: any) {
    console.error(chalk.red(`   ❌ ${name}: ${error.message}`));
  }
}

async function provisionGitHubSecrets(
  env: EnvironmentName,
  awsCredentials: { accessKeyId: string; secretAccessKey: string },
  infraOutputs: InfraOutputs
): Promise<void> {
  console.log(chalk.blue(`\n🔒 Provisioning GitHub Secrets for environment: ${env}`));

  // Check if gh CLI is available
  try {
    execSilent('gh auth status');
  } catch {
    console.log(chalk.yellow('   ⚠️  GitHub CLI not authenticated, skipping GitHub secrets'));
    console.log(chalk.dim('      Run: gh auth login'));
    return;
  }

  // Create environment if needed
  try {
    execSilent(`gh api -X PUT /repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/environments/${env}`);
  } catch {
    // May already exist
  }

  // Only store minimal secrets needed for CI to call AWS
  const secrets: Record<string, string> = {
    SECRET_AWS_ACCESS_KEY_ID: awsCredentials.accessKeyId,
    SECRET_AWS_SECRET_ACCESS_KEY: awsCredentials.secretAccessKey,
    SECRET_AWS_REGION: AWS_CONFIG.region,
  };

  // Add cluster and service info if available (for ECS mode)
  if (infraOutputs.clusterName) {
    secrets.ECS_CLUSTER_NAME = infraOutputs.clusterName;
  }
  if (infraOutputs.serviceName) {
    secrets.ECS_SERVICE_NAME = infraOutputs.serviceName;
  }

  for (const [name, value] of Object.entries(secrets)) {
    setGitHubSecret(name, value, env);
    console.log(chalk.green(`   ✓ ${name}`));
  }

  console.log(chalk.green(`✓ GitHub secrets configured`));
}

// ═══════════════════════════════════════════════════════════════════════════════
// INFRASTRUCTURE DEPENDENCIES SETUP
// ═══════════════════════════════════════════════════════════════════════════════

// ECS infrastructure setup is now handled by ECSDeployer class


// ═══════════════════════════════════════════════════════════════════════════════
// INFRASTRUCTURE DESTRUCTION
// ═══════════════════════════════════════════════════════════════════════════════

// Infrastructure destruction is now handled by deployer classes (ECS only)

// ═══════════════════════════════════════════════════════════════════════════════
// DUCKDNS
// ═══════════════════════════════════════════════════════════════════════════════

async function updateDuckDNS(envVars: Record<string, string>, publicIp: string): Promise<void> {
  const token = envVars.SECRET_DUCKDNS_TOKEN || '';
  const domain = envVars.SITE_DOMAIN || '';

  if (!token) {
    console.log(chalk.yellow('\n⚠️  SECRET_DUCKDNS_TOKEN not set in .env file, skipping DNS update'));
    return;
  }

  if (!domain.endsWith('.duckdns.org')) {
    console.log(chalk.dim('\n   Skipping DuckDNS (not a duckdns.org domain)'));
    return;
  }

  const subdomain = domain.replace('.duckdns.org', '');
  
  console.log(chalk.blue(`\n🦆 Updating DuckDNS: ${subdomain} → ${publicIp}`));

  try {
    const url = `https://www.duckdns.org/update?domains=${subdomain}&token=${token}&ip=${publicIp}`;
    const response = await fetch(url);
    const result = await response.text();

    if (result.trim() === 'OK') {
      console.log(chalk.green(`✓ DuckDNS updated`));
    } else {
      console.log(chalk.yellow(`   ⚠️  DuckDNS response: ${result}`));
    }
  } catch (error: any) {
    console.log(chalk.yellow(`   ⚠️  DuckDNS update failed: ${error.message}`));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  // Parse arguments
  const args = process.argv.slice(2);
  let env: string = 'staging'; // Now accepts any string, not just predefined environments
  const mode: InfraMode = 'ecs'; // ECS only (legacy EC2 mode removed)
  let action: 'provision' | 'destroy' = 'provision'; // New action parameter

  // Parse action (provision/destroy)
  if (args[0] === 'destroy') {
    action = 'destroy';
    args.shift();
  }

  // Parse environment (remaining first argument)
  if (args[0]) {
    env = args[0];
  }
  
  // Validate action
  if (action === 'destroy' && !args[0]) {
    console.error(chalk.red(`\n❌ Environment name required for destroy`));
    console.error(chalk.cyan(`\nUsage:`));
    console.error(chalk.white(`   pnpm destroy <environment>`));
    process.exit(1);
  }

  // For provision, check if it's a known environment (but allow custom names)
  if (action === 'provision' && !env) {
    console.error(chalk.red(`\n❌ Environment name required`));
    console.error(chalk.cyan(`\nUsage:`));
    console.error(chalk.white(`   pnpm provision <environment>`));
    console.error(chalk.white(`   pnpm destroy <environment>`));
    console.error(chalk.white(`\nExamples:`));
    console.error(chalk.white(`   pnpm provision staging`));
    console.error(chalk.white(`   pnpm destroy staging`));
    process.exit(1);
  }

  // Validate environment name is known
  if (!['staging', 'prod'].includes(env)) {
    console.error(chalk.yellow(`\n⚠️  Warning: Unknown environment '${env}'`));
    console.error(chalk.yellow(`   Known environments: staging, prod`));
    const continueAnyway = await ask(chalk.yellow(`Continue anyway? (y/n): `));
    if (!['y', 'yes'].includes(continueAnyway.trim().toLowerCase())) {
      console.log(chalk.yellow('\n👋 Cancelled.\n'));
      rl.close();
      process.exit(0);
    }
  }

  getEnvironmentConfig(env as EnvironmentName);

  const actionIcon = action === 'provision' ? '🚀' : '💥';
  const actionTitle = action === 'provision' ? 'Provisioning' : 'Destroying';

  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan(`║  ${actionIcon} ${actionTitle}: ${env.toUpperCase().padEnd(12)} Mode: ${mode.toUpperCase().padEnd(5)}    ║`));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════╝\n'));

  // Load environment variables: applicatif + provider AWS (merged)
  const envVars = loadMergedEnv(env as EnvironmentName);
  const awsPath = join(projectRoot, getAwsEnvFilePath(env as EnvironmentName));
  const sources = existsSync(awsPath)
    ? `${getEnvFilePath(env as EnvironmentName)} + ${getAwsEnvFilePath(env as EnvironmentName)}`
    : getEnvFilePath(env as EnvironmentName);

  console.log(chalk.green(`✓ Loaded ${Object.keys(envVars).length} variables from ${sources}`));

  console.log(chalk.cyan('\n📋 Configuration:'));
  console.log(chalk.white(`   Environment:  ${env}`));
  console.log(chalk.white(`   Mode:         ${mode}`));
  console.log(chalk.white(`   Source:       ${sources}`));
  console.log(chalk.white(`   Region:       ${AWS_CONFIG.region}`));
  console.log(chalk.white(`   Domain:       ${envVars.SITE_DOMAIN || 'not set'}`));
  console.log(chalk.white(`   Stack:        CityGuidedEcsStack`));
  console.log(chalk.white(`   SSM Path:     ${getSsmPath(env as EnvironmentName)}/*`));

  // Check for required secrets
  if (!envVars.SECRET_DUCKDNS_TOKEN) {
    console.log(chalk.yellow('\n⚠️  SECRET_DUCKDNS_TOKEN not set (DNS update will be skipped)'));
  }

  const actionWord = action === 'provision' ? 'provisioning' : 'destroying';
  const proceed = await ask(chalk.yellow(`\nProceed with ${actionWord}? (y/n): `));

  if (!['y', 'yes'].includes(proceed.trim().toLowerCase())) {
    console.log(chalk.yellow('\n👋 Cancelled.\n'));
    rl.close();
    process.exit(0);
  }

  try {
    rl.close();

    let infraOutputs: InfraOutputs | undefined;

    if (action === 'destroy') {
      // Direct destruction using deployer
      const deployer = createDeployer(mode);
      await deployer.destroy(env);
    } else {
      // Get AWS credentials for provisioning
      const awsCredentials = await getAWSCredentials();

      // Provisioning flow using deployer
      const deployer = createDeployer(mode);
      infraOutputs = await deployer.deploy({ environment: env, envVars, awsCredentials });

      // Setup dependencies (Docker for EC2, nothing for ECS)
      await deployer.setupDependencies(infraOutputs);

      // Update DNS if needed (use publicIp if available from reverse proxy)
      if (infraOutputs.publicIp) {
        await updateDuckDNS(envVars, infraOutputs.publicIp);
      }

      // 2. Store config in SSM Parameter Store (from .env file)
      await provisionSsmParameters(env as EnvironmentName, envVars, awsCredentials, infraOutputs);

      // 3. Configure minimal GitHub secrets for CI
      await provisionGitHubSecrets(env as EnvironmentName, awsCredentials, infraOutputs);
    }

    // Summary
    const successIcon = action === 'provision' ? '✨' : '💥';
    const successTitle = action === 'provision' ? 'Complete' : 'Destroyed';

    console.log(chalk.bold.green('\n╔════════════════════════════════════════════════════════╗'));
    console.log(chalk.bold.green(`║         ${successIcon} ${successTitle}! ${successIcon}                        ║`));
    console.log(chalk.bold.green('╚════════════════════════════════════════════════════════╝\n'));

    console.log(chalk.cyan('📋 Summary:'));
    console.log(chalk.white(`   Environment: ${env}`));
    console.log(chalk.white(`   Mode:        ${mode}`));

    if (action === 'provision' && infraOutputs) {
      // Only show infrastructure details after provisioning
      console.log(chalk.white(`   Cluster:     city-guided-cluster`));
      console.log(chalk.white(`   Service:     city-guided-service`));

      if (infraOutputs.publicIp) {
        console.log(chalk.white(`   Proxy IP:    ${infraOutputs.publicIp}`));
      }

      console.log(chalk.white(`   Domain:      https://${envVars.SITE_DOMAIN}`));
      console.log(chalk.white(`   SSM:         ${getSsmPath(env as EnvironmentName)}/*`));

      // AWS Console Links
      console.log(chalk.cyan('\n🔗 AWS Console Links:'));
      const urls = getAwsConsoleUrls(env as EnvironmentName);
      for (const [name, url] of Object.entries(urls)) {
        console.log(chalk.white(`   • ${name}:`));
        console.log(chalk.gray(`     ${url}`));
      }

      console.log(chalk.cyan('\n📝 Next steps:'));
      console.log(chalk.white('   1. Check ECS service status:'));
      console.log(chalk.white(`      pnpm infra:status`));
      console.log(chalk.white('   2. Check DuckDNS configuration:'));
      console.log(chalk.white(`      pnpm infra:duckdns:check staging`));
      console.log(chalk.white('   3. Deploy application:'));
      console.log(chalk.white(`      pnpm app:deploy staging`));

      console.log(chalk.white(`\n   Access: https://${envVars.SITE_DOMAIN}\n`));
    } else if (action === 'destroy') {
      // Destroy summary
      console.log(chalk.white(`   Stack:       CityGuidedEcsStack`));
      console.log(chalk.white(`   SSM Path:    ${getSsmPath(env as EnvironmentName)}/*`));
      console.log(chalk.gray('\n   Note: CloudFormation stack deletion is in progress.'));
      console.log(chalk.gray('   Check status: aws cloudformation describe-stacks --stack-name CityGuidedEcsStack\n'));
    }

  } catch (error: any) {
    const actionWord = action === 'provision' ? 'Provisioning' : 'Destruction';
    console.error(chalk.red(`\n❌ ${actionWord} failed: ${error.message}\n`));
    process.exit(1);
  }
}

main();
