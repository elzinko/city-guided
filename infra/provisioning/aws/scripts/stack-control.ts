#!/usr/bin/env tsx
/**
 * ECS Stack Control CLI
 * 
 * Control ECS Fargate service: start, stop, restart
 * 
 * Usage:
 *   pnpm stack:start staging
 *   pnpm stack:stop staging
 *   pnpm stack:restart staging
 */

import { ECSClient, UpdateServiceCommand, DescribeServicesCommand } from '@aws-sdk/client-ecs';
import chalk from 'chalk';
import {
  AWS_CONFIG,
  getEnvironmentConfig,
  type EnvironmentName,
} from '../constants.js';

const ecsClient = new ECSClient({ region: AWS_CONFIG.region });

// ═══════════════════════════════════════════════════════════════════════════════
// ECS SERVICE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const ECS_CONFIG = {
  clusterName: 'city-guided-cluster',
  serviceName: 'city-guided-service',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// GET SERVICE STATUS
// ═══════════════════════════════════════════════════════════════════════════════

async function getServiceStatus() {
  try {
    const response = await ecsClient.send(
      new DescribeServicesCommand({
        cluster: ECS_CONFIG.clusterName,
        services: [ECS_CONFIG.serviceName],
      })
    );

    const service = response.services?.[0];
    if (!service) {
      return null;
    }

    return {
      status: service.status || 'UNKNOWN',
      desiredCount: service.desiredCount || 0,
      runningCount: service.runningCount || 0,
      pendingCount: service.pendingCount || 0,
    };
  } catch (error: any) {
    if (error.name === 'ClusterNotFoundException' || error.name === 'ServiceNotFoundException') {
      return null;
    }
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

async function updateService(desiredCount: number, forceNewDeployment = false): Promise<boolean> {
  try {
    const params: any = {
      cluster: ECS_CONFIG.clusterName,
      service: ECS_CONFIG.serviceName,
      desiredCount,
    };

    if (forceNewDeployment) {
      params.forceNewDeployment = true;
    }

    await ecsClient.send(new UpdateServiceCommand(params));
    return true;
  } catch (error: any) {
    console.error(chalk.red(`❌ Error: ${error.message}`));
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMANDS
// ═══════════════════════════════════════════════════════════════════════════════

async function cmdStart(env: EnvironmentName): Promise<void> {
  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan(`║         🚀 Starting ECS Stack: ${env.toUpperCase()}              ║`));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════╝\n'));

  const status = await getServiceStatus();
  if (!status) {
    console.error(chalk.red('❌ ECS service not found'));
    console.log(chalk.yellow('   Run: pnpm infra:provision staging'));
    process.exit(1);
  }

  console.log(chalk.blue('📊 Current status:'));
  console.log(chalk.white(`   Desired: ${status.desiredCount}`));
  console.log(chalk.white(`   Running: ${status.runningCount}`));
  console.log(chalk.white(`   Pending: ${status.pendingCount}\n`));

  if (status.desiredCount >= 1) {
    console.log(chalk.yellow('⚠️  Service is already running'));
    console.log(chalk.white('   Use "restart" to force a new deployment\n'));
    return;
  }

  console.log(chalk.blue('🚀 Scaling service to 1...\n'));

  const success = await updateService(1);
  if (success) {
    console.log(chalk.green('✓ Service update initiated'));
    console.log(chalk.white('   The service will start within a few minutes\n'));
    console.log(chalk.cyan('💡 Tip: Use "pnpm infra:status" to check status'));
  } else {
    process.exit(1);
  }
}

async function cmdStop(env: EnvironmentName): Promise<void> {
  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan(`║         ⏸️  Stopping ECS Stack: ${env.toUpperCase()}               ║`));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════╝\n'));

  const status = await getServiceStatus();
  if (!status) {
    console.error(chalk.red('❌ ECS service not found'));
    console.log(chalk.yellow('   Run: pnpm infra:provision staging'));
    process.exit(1);
  }

  console.log(chalk.blue('📊 Current status:'));
  console.log(chalk.white(`   Desired: ${status.desiredCount}`));
  console.log(chalk.white(`   Running: ${status.runningCount}`));
  console.log(chalk.white(`   Pending: ${status.pendingCount}\n`));

  if (status.desiredCount === 0) {
    console.log(chalk.yellow('⚠️  Service is already stopped\n'));
    return;
  }

  console.log(chalk.blue('⏸️  Scaling service to 0...\n'));

  const success = await updateService(0);
  if (success) {
    console.log(chalk.green('✓ Service update initiated'));
    console.log(chalk.white('   The service will stop within a few minutes\n'));
    console.log(chalk.cyan('💡 Tip: Use "pnpm stack:start" to start again'));
  } else {
    process.exit(1);
  }
}

async function cmdRestart(env: EnvironmentName): Promise<void> {
  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan(`║         🔄 Restarting ECS Stack: ${env.toUpperCase()}            ║`));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════╝\n'));

  const status = await getServiceStatus();
  if (!status) {
    console.error(chalk.red('❌ ECS service not found'));
    console.log(chalk.yellow('   Run: pnpm infra:provision staging'));
    process.exit(1);
  }

  console.log(chalk.blue('📊 Current status:'));
  console.log(chalk.white(`   Desired: ${status.desiredCount}`));
  console.log(chalk.white(`   Running: ${status.runningCount}`));
  console.log(chalk.white(`   Pending: ${status.pendingCount}\n`));

  if (status.desiredCount === 0) {
    console.log(chalk.yellow('⚠️  Service is stopped, starting it...\n'));
    const success = await updateService(1, true);
    if (success) {
      console.log(chalk.green('✓ Service restart initiated'));
      console.log(chalk.white('   The service will start within a few minutes\n'));
    } else {
      process.exit(1);
    }
    return;
  }

  console.log(chalk.blue('🔄 Restarting service (force new deployment)...\n'));

  const success = await updateService(status.desiredCount, true);
  if (success) {
    console.log(chalk.green('✓ Service restart initiated'));
    console.log(chalk.white('   New tasks will be deployed, old ones will be stopped\n'));
    console.log(chalk.cyan('💡 Tip: Use "pnpm infra:status" to check status'));
  } else {
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error(chalk.red('Usage: pnpm stack:<start|stop|restart> <environment>'));
    console.log(chalk.white('   Example: pnpm stack:start staging'));
    process.exit(1);
  }

  // Command is first argument (passed via npm script: "start", "stop", "restart")
  // Environment is second argument (passed by user: "staging", "prod")
  const command = args[0];
  const env = args[1] as EnvironmentName;

  if (env !== 'staging' && env !== 'prod') {
    console.error(chalk.red(`Invalid environment: ${env}`));
    console.log(chalk.white('   Valid environments: staging, prod'));
    process.exit(1);
  }

  switch (command) {
    case 'start':
      await cmdStart(env);
      break;
    case 'stop':
      await cmdStop(env);
      break;
    case 'restart':
      await cmdRestart(env);
      break;
    default:
      console.error(chalk.red(`Unknown command: ${command}`));
      console.log(chalk.white('   Valid commands: start, stop, restart'));
      process.exit(1);
  }
}

main().catch((error) => {
  console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
  if (error.stack) {
    console.error(chalk.dim(error.stack));
  }
  process.exit(1);
});
