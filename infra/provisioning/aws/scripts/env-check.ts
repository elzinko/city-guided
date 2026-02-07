#!/usr/bin/env tsx
/**
 * Environment Variables Check Script
 * 
 * Checks environment variables deployed in ECS containers.
 * 
 * Usage:
 *   pnpm env:check staging
 *   pnpm env:check staging --container web
 */

import { execSync } from 'node:child_process';
import chalk from 'chalk';
import {
  AWS_CONFIG,
  getInfraMode,
  type EnvironmentName,
} from '../constants.js';

function execSilent(command: string): string {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (error: any) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ECS ENVIRONMENT VARIABLES CHECK
// ═══════════════════════════════════════════════════════════════════════════════

async function checkEcsEnvVars(env: EnvironmentName, containerName?: string): Promise<void> {
  console.log(chalk.blue('\n🔍 Checking ECS container environment variables...\n'));

  const clusterName = 'city-guided-cluster';
  const serviceName = 'city-guided-service';

  // Get running tasks
  const tasksJson = execSilent(`
    aws ecs list-tasks \
      --cluster ${clusterName} \
      --service-name ${serviceName} \
      --region ${AWS_CONFIG.region} \
      --desired-status RUNNING \
      --query 'taskArns[0]' \
      --output text
  `);

  if (!tasksJson || tasksJson === 'None' || tasksJson === '') {
    console.log(chalk.yellow('⚠️  No running tasks found. Service might be scaled to zero.'));
    console.log(chalk.white('   To check task definition environment variables, use:'));
    console.log(chalk.cyan(`   aws ecs describe-task-definition --task-definition city-guided-service --region ${AWS_CONFIG.region}`));
    return;
  }

  const taskArn = tasksJson.replace(/"/g, '');

  // Get task definition
  const taskDefJson = execSilent(`
    aws ecs describe-tasks \
      --cluster ${clusterName} \
      --tasks ${taskArn} \
      --region ${AWS_CONFIG.region} \
      --query 'tasks[0].taskDefinitionArn' \
      --output text
  `);

  const taskDefArn = taskDefJson.replace(/"/g, '');

  // Get task definition details
  const taskDef = JSON.parse(execSilent(`
    aws ecs describe-task-definition \
      --task-definition ${taskDefArn} \
      --region ${AWS_CONFIG.region} \
      --query 'taskDefinition'
  `));

  console.log(chalk.cyan('📋 Task Definition:'));
  console.log(chalk.white(`   ARN: ${taskDefArn}`));
  console.log(chalk.white(`   Family: ${taskDef.family}`));
  console.log(chalk.white(`   Revision: ${taskDef.revision}\n`));

  // Check each container
  const containers = containerName 
    ? taskDef.containerDefinitions.filter((c: any) => c.name === containerName)
    : taskDef.containerDefinitions;

  if (containers.length === 0) {
    console.log(chalk.red(`❌ Container "${containerName}" not found`));
    return;
  }

  for (const container of containers) {
    console.log(chalk.bold.cyan(`\n📦 Container: ${container.name}`));
    console.log(chalk.white(`   Image: ${container.image}\n`));

    const envVars = container.environment || [];
    const secrets = container.secrets || [];

    if (envVars.length === 0 && secrets.length === 0) {
      console.log(chalk.yellow('   ⚠️  No environment variables found'));
      continue;
    }

    if (envVars.length > 0) {
      console.log(chalk.cyan('   Environment Variables:'));
      for (const env of envVars) {
        const value = env.value || '';
        const displayValue = value.length > 60 ? `${value.substring(0, 57)}...` : value;
        console.log(chalk.white(`      ${env.name} = ${displayValue}`));
      }
    }

    if (secrets.length > 0) {
      console.log(chalk.cyan('\n   Secrets (from SSM/Secrets Manager):'));
      for (const secret of secrets) {
        const source = secret.valueFrom || '';
        console.log(chalk.white(`      ${secret.name} = ${source}`));
      }
    }

    // Check for SHOW_DEV_OPTIONS (runtime variable, read server-side)
    const showDevOpts = envVars.find((e: any) => e.name === 'SHOW_DEV_OPTIONS');
    if (showDevOpts) {
      console.log(chalk.cyan('\n   ✓ SHOW_DEV_OPTIONS:'));
      console.log(chalk.white(`      Value: ${showDevOpts.value}`));
      console.log(chalk.green('      ✓ Runtime variable (read server-side in _app.tsx)'));
    } else {
      console.log(chalk.yellow('\n   ⚠️  SHOW_DEV_OPTIONS not found in environment variables'));
      console.log(chalk.yellow('      Add it to .env.staging and run: pnpm config:push staging'));
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  
  let env: EnvironmentName = 'staging';
  let containerName: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--container' && i + 1 < args.length) {
      containerName = args[i + 1];
      i++;
    } else if (!args[i].startsWith('--')) {
      env = args[i] as EnvironmentName;
    }
  }

  if (!env || (env !== 'staging' && env !== 'prod')) {
    console.error(chalk.red('Usage: pnpm env:check <environment> [--container <name>]'));
    process.exit(1);
  }

  const infraMode = getInfraMode(env);

  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan(`║         🔍 Environment Variables Check                  ║`));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════╝\n'));

  console.log(chalk.cyan('📋 Configuration:'));
  console.log(chalk.white(`   Environment:  ${env}`));
  console.log(chalk.white(`   Mode:         ${infraMode}`));
  if (containerName) {
    console.log(chalk.white(`   Container:    ${containerName}`));
  }
  console.log('');

  try {
    await checkEcsEnvVars(env, containerName);
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Check failed: ${error.message}\n`));
    process.exit(1);
  }
}

main();
