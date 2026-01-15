#!/usr/bin/env tsx
/**
 * Update Configuration Script
 *
 * Updates AWS SSM Parameter Store from .env.<environment> file.
 * Does NOT redeploy infrastructure - only updates configuration.
 *
 * Usage:
 *   pnpm update-config staging
 *   pnpm update-config prod
 */

import { execSync } from 'node:child_process';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import chalk from 'chalk';
import {
  AWS_CONFIG,
  GITHUB_CONFIG,
  ENVIRONMENTS,
  getEnvironmentConfig,
  isSecret,
  getSsmPath,
  getEnvFilePath,
  type EnvironmentName,
} from '../constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..', '..', '..');

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function execSilent(command: string): string {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: projectRoot
    }).trim();
  } catch (error: any) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENV FILE LOADER
// ═══════════════════════════════════════════════════════════════════════════════

function loadEnvFile(env: EnvironmentName): Record<string, string> {
  const envFilePath = join(projectRoot, getEnvFilePath(env));

  if (!existsSync(envFilePath)) {
    throw new Error(`Environment file not found: ${envFilePath}`);
  }

  console.log(chalk.blue(`📄 Loading config from: ${envFilePath}`));

  const content = readFileSync(envFilePath, 'utf8');
  const envVars: Record<string, string> = {};

  // Parse .env file (simple implementation)
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
      envVars[key.trim()] = value;
    }
  }

  return envVars;
}

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

async function updateSsmParameters(env: EnvironmentName, envVars: Record<string, string>): Promise<number> {
  const ssmPath = getSsmPath(env);

  console.log(chalk.blue(`\n📦 Updating SSM Parameters: ${ssmPath}/*`));

  const variables: string[] = [];
  const secrets: string[] = [];
  let count = 0;

  for (const [key, value] of Object.entries(envVars)) {
    if (value === '' || value === undefined) {
      console.log(chalk.yellow(`   ⊘ Skipping ${key} (empty)`));
      continue;
    }

    const paramName = `${ssmPath}/${key}`;
    const secure = isSecret(key);

    console.log(chalk.gray(`   → ${key} (${secure ? 'secret' : 'plain'})`));

    putSsmParameter(paramName, value, secure);

    if (secure) {
      secrets.push(key);
    } else {
      variables.push(key);
    }
    count++;
  }

  console.log(chalk.green(`✓ ${count} parameters updated in SSM`));
  console.log(chalk.dim(`   Variables: ${variables.length}`));
  console.log(chalk.dim(`   Secrets: ${secrets.length} (encrypted)`));

  return count;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EC2 SERVICE RESTART
// ═══════════════════════════════════════════════════════════════════════════════

async function restartDockerServices(env: EnvironmentName): Promise<void> {
  const awsConfig = getEnvironmentConfig(env);

  console.log(chalk.blue(`\n🔄 Restarting Docker services on EC2...`));

  // Get instance ID from CloudFormation stack
  const instanceId = execSilent(
    `aws cloudformation describe-stacks --stack-name ${awsConfig.STACK_NAME} --region ${AWS_CONFIG.region} --query 'Stacks[0].Outputs[?OutputKey==\`InstanceId\`].OutputValue' --output text`
  );

  if (!instanceId || instanceId === 'None') {
    console.log(chalk.yellow('⚠️  No EC2 instance found - skipping service restart'));
    return;
  }

  console.log(chalk.gray(`   Instance: ${instanceId}`));

  const commands = [
    'set -e',
    'echo "Restarting Docker services..."',
    'cd /home/ec2-user/city-guided/infra/docker',
    'docker compose --env-file .env.staging down',
    'docker compose --env-file .env.staging --profile nginx up -d',
    'echo "Services restarted successfully"'
  ];

  try {
    // Send restart command via SSM
    const commandJson = JSON.stringify(commands);
    const commandId = execSilent(
      `aws ssm send-command \
        --instance-ids "${instanceId}" \
        --document-name "AWS-RunShellScript" \
        --parameters '{"commands":${commandJson}}' \
        --region ${AWS_CONFIG.region} \
        --query 'Command.CommandId' \
        --output text`
    );

    console.log(chalk.gray(`   Command sent: ${commandId}`));
    console.log(chalk.green('✓ Service restart initiated'));

    // Wait for completion
    console.log(chalk.gray('   Waiting for completion...'));

    let status = '';
    let attempts = 0;
    const maxAttempts = 30; // 2.5 minutes

    while (status !== 'Success' && status !== 'Failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;

      try {
        status = execSilent(
          `aws ssm get-command-invocation \
            --command-id "${commandId}" \
            --instance-id "${instanceId}" \
            --region ${AWS_CONFIG.region} \
            --query 'Status' \
            --output text`
        );
      } catch (error) {
        // Command might not be ready yet
        continue;
      }
    }

    if (status === 'Success') {
      console.log(chalk.green('✓ Services restarted successfully'));
    } else {
      console.log(chalk.yellow(`⚠️  Command status: ${status} (check manually)`));
    }

  } catch (error: any) {
    console.error(chalk.red(`❌ Failed to restart services: ${error.message}`));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const env = args[0] as EnvironmentName;

  if (!env || !ENVIRONMENTS[env]) {
    console.error(chalk.red('Usage: pnpm update-config <environment>'));
    console.error(chalk.red('Valid environments:'), Object.keys(ENVIRONMENTS).join(', '));
    process.exit(1);
  }

  try {
    console.log(chalk.cyan('🚀 City-Guided Configuration Update'));
    console.log(chalk.cyan('=' .repeat(50)));

    // Load environment variables
    const envVars = loadEnvFile(env);
    console.log(chalk.white(`Environment: ${env}`));
    console.log(chalk.white(`Variables: ${Object.keys(envVars).length}`));

    // Update SSM parameters
    const paramCount = await updateSsmParameters(env, envVars);

    // Restart services
    await restartDockerServices(env);

    console.log(chalk.cyan('\n✨ Configuration update complete!'));
    console.log(chalk.white(`Updated ${paramCount} parameters`));
    console.log(chalk.white(`Environment: ${env}`));
    console.log(chalk.white(`SSM Path: ${getSsmPath(env)}/*`));

    if (envVars.NEXT_PUBLIC_SHOW_DEV_OPTIONS) {
      console.log(chalk.white(`Dev Options: ${envVars.NEXT_PUBLIC_SHOW_DEV_OPTIONS === 'true' ? 'ENABLED' : 'DISABLED'}`));
    }

  } catch (error: any) {
    console.error(chalk.red('\n❌ Configuration update failed:'));
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

main();