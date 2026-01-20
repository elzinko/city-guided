#!/usr/bin/env tsx
/**
 * Environment Variables Check Script
 * 
 * Checks environment variables deployed in ECS containers or EC2 Docker containers.
 * 
 * Usage:
 *   pnpm env:check staging
 *   pnpm env:check staging --container web
 *   pnpm env:check staging --mode ecs
 */

import { execSync } from 'node:child_process';
import chalk from 'chalk';
import {
  AWS_CONFIG,
  getInfraMode,
  getSsmPath,
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
// EC2 ENVIRONMENT VARIABLES CHECK
// ═══════════════════════════════════════════════════════════════════════════════

async function checkEc2EnvVars(env: EnvironmentName, containerName?: string): Promise<void> {
  console.log(chalk.blue('\n🔍 Checking EC2 Docker container environment variables...\n'));

  const ssmPath = getSsmPath(env);

  // Get instance ID from SSM
  let instanceId: string;
  try {
    instanceId = execSilent(
      `aws ssm get-parameter --name "${ssmPath}/SECRET_EC2_INSTANCE_ID" --with-decryption --query "Parameter.Value" --output text --region ${AWS_CONFIG.region}`
    );
  } catch {
    console.log(chalk.red('❌ Could not get EC2 instance ID from SSM'));
    console.log(chalk.yellow('   Run: pnpm provision staging'));
    return;
  }

  console.log(chalk.cyan('📋 EC2 Instance:'));
  console.log(chalk.white(`   ID: ${instanceId}\n`));

  // Execute command on EC2 to check environment variables
  const command = containerName
    ? `docker inspect city-guided-${env}-${containerName} --format '{{range .Config.Env}}{{println .}}{{end}}' || echo "Container not found"`
    : `docker ps --format '{{.Names}}' | grep city-guided-${env} | while read name; do echo "=== Container: $name ==="; docker inspect "$name" --format '{{range .Config.Env}}{{println .}}{{end}}'; echo ""; done`;

  try {
    const output = execSilent(`
      aws ssm send-command \
        --instance-ids "${instanceId}" \
        --document-name "AWS-RunShellScript" \
        --parameters 'commands=["${command}"]' \
        --region ${AWS_CONFIG.region} \
        --query 'Command.CommandId' \
        --output text
    `);

    const commandId = output.trim();
    console.log(chalk.gray(`   Command ID: ${commandId}`));
    console.log(chalk.yellow('\n⏳ Waiting for command execution...\n'));

    // Wait a bit for command to execute
    await new Promise(resolve => setTimeout(resolve, 3000));

    const result = execSilent(`
      aws ssm get-command-invocation \
        --command-id "${commandId}" \
        --instance-id "${instanceId}" \
        --region ${AWS_CONFIG.region} \
        --query 'StandardOutputContent' \
        --output text
    `);

    if (result && result.trim() !== '') {
      console.log(chalk.cyan('📋 Environment Variables:\n'));
      const lines = result.split('\n');
      for (const line of lines) {
        if (line.includes('===')) {
          console.log(chalk.bold.cyan(line));
        } else if (line.includes('=')) {
          const [key, ...valueParts] = line.split('=');
          const value = valueParts.join('=');
          const displayValue = value.length > 60 ? `${value.substring(0, 57)}...` : value;
          console.log(chalk.white(`   ${key} = ${displayValue}`));
        } else if (line.trim() !== '') {
          console.log(chalk.white(line));
        }
      }

      // Check for SHOW_DEV_OPTIONS
      if (result.includes('SHOW_DEV_OPTIONS=')) {
        const match = result.match(/SHOW_DEV_OPTIONS=([^\n]+)/);
        if (match) {
          console.log(chalk.cyan('\n   ✓ SHOW_DEV_OPTIONS found:'));
          console.log(chalk.white(`      Value: ${match[1]}`));
        }
      } else {
        console.log(chalk.yellow('\n   ⚠️  SHOW_DEV_OPTIONS not found in container environment'));
        console.log(chalk.yellow('      Add it to .env.staging and run: pnpm config:push staging'));
      }
    } else {
      console.log(chalk.yellow('⚠️  No output from command'));
    }
  } catch (error: any) {
    console.error(chalk.red(`❌ Failed to check environment variables: ${error.message}`));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  
  let env: EnvironmentName = 'staging';
  let containerName: string | undefined;
  let mode: 'ec2' | 'ecs' | 'auto' = 'auto';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--container' && i + 1 < args.length) {
      containerName = args[i + 1];
      i++;
    } else if (args[i] === '--mode' && i + 1 < args.length) {
      mode = args[i + 1] as 'ec2' | 'ecs' | 'auto';
      i++;
    } else if (!args[i].startsWith('--')) {
      env = args[i] as EnvironmentName;
    }
  }

  if (!env || (env !== 'staging' && env !== 'prod')) {
    console.error(chalk.red('Usage: pnpm env:check <environment> [--container <name>] [--mode ec2|ecs|auto]'));
    process.exit(1);
  }

  const infraMode = mode === 'auto' ? getInfraMode(env) : mode;

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
    if (infraMode === 'ecs') {
      await checkEcsEnvVars(env, containerName);
    } else {
      await checkEc2EnvVars(env, containerName);
    }
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Check failed: ${error.message}\n`));
    process.exit(1);
  }
}

main();
