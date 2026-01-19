#!/usr/bin/env tsx
/**
 * Unified Deployment Script
 * 
 * Deploys application to the specified environment.
 * Automatically detects the infrastructure mode (EC2 or ECS) and deploys accordingly.
 * 
 * Usage:
 *   pnpm deploy staging --tag abc1234
 *   pnpm deploy prod --tag v1.2.3
 */

import { execSync } from 'node:child_process';
import chalk from 'chalk';
import {
  AWS_CONFIG,
  getSsmPath,
  getInfraMode,
  getAwsConsoleUrls,
  type EnvironmentName,
} from '../../provisioning/aws/constants.js';

function execSilent(command: string): string {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch {
    throw new Error(`Command failed: ${command}`);
  }
}

function exec(command: string): void {
  try {
    execSync(command, { encoding: 'utf8', stdio: 'inherit' });
  } catch {
    throw new Error(`Command failed: ${command}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EC2 DEPLOYER
// ═══════════════════════════════════════════════════════════════════════════════

async function deployToEC2(env: EnvironmentName, imageTag: string): Promise<void> {
  console.log(chalk.blue('\n🚀 Deploying to EC2 via SSM...\n'));

  const ssmPath = getSsmPath(env);

  // Get instance ID from SSM
  const instanceId = execSilent(
    `aws ssm get-parameter --name "${ssmPath}/SECRET_EC2_INSTANCE_ID" --with-decryption --query "Parameter.Value" --output text --region ${AWS_CONFIG.region}`
  );

  console.log(chalk.white(`   Instance: ${instanceId}`));
  console.log(chalk.white(`   Image tag: ${imageTag}`));

  // Send deployment command via SSM
  const commandId = execSilent(`
    aws ssm send-command \\
      --instance-ids "${instanceId}" \\
      --document-name "AWS-RunShellScript" \\
      --parameters 'commands=[
        "set -e",
        "cd /home/ec2-user",
        "",
        "# Clone or update repository",
        "if [ -d city-guided/.git ]; then",
        "  echo 'Updating repository...'",
        "  cd city-guided",
        "  git fetch origin main",
        "  git reset --hard origin/main",
        "else",
        "  echo 'Cloning repository...'",
        "  git clone https://github.com/elzinko/city-guided.git",
        "  cd city-guided",
        "fi",
        "",
        "# Deploy using pre-built images from GHCR",
        "cd infra/deployment",
        "chmod +x scripts/deploy.sh",
        "IMAGE_TAG=${imageTag} ./scripts/deploy.sh ${env}"
      ]' \\
      --timeout-seconds 600 \\
      --query 'Command.CommandId' \\
      --output text \\
      --region ${AWS_CONFIG.region}
  `);

  console.log(chalk.gray(`   Command ID: ${commandId}`));
  console.log(chalk.yellow('\n⏳ Waiting for deployment to complete...\n'));

  // Poll for command status
  let status = 'Pending';
  let attempts = 0;
  const maxAttempts = 60;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

    status = execSilent(`
      aws ssm get-command-invocation \\
        --command-id "${commandId}" \\
        --instance-id "${instanceId}" \\
        --query 'Status' \\
        --output text \\
        --region ${AWS_CONFIG.region} 2>/dev/null || echo "Pending"
    `);

    console.log(chalk.gray(`   Status: ${status} (attempt ${attempts + 1}/${maxAttempts})`));

    if (status === 'Success') {
      console.log(chalk.green('\n✅ Deployment successful!\n'));
      break;
    } else if (status === 'Failed' || status === 'Cancelled') {
      // Get error output
      const errorOutput = execSilent(`
        aws ssm get-command-invocation \\
          --command-id "${commandId}" \\
          --instance-id "${instanceId}" \\
          --query 'StandardErrorContent' \\
          --output text \\
          --region ${AWS_CONFIG.region}
      `);
      throw new Error(`Deployment failed with status: ${status}\n${errorOutput}`);
    }

    attempts++;
  }

  if (status !== 'Success') {
    throw new Error(`Deployment timeout - final status: ${status}`);
  }

  // Show deployment output
  const output = execSilent(`
    aws ssm get-command-invocation \\
      --command-id "${commandId}" \\
      --instance-id "${instanceId}" \\
      --query 'StandardOutputContent' \\
      --output text \\
      --region ${AWS_CONFIG.region}
  `);

  console.log(chalk.cyan('\n📋 Deployment output (last 50 lines):'));
  const lines = output.split('\n');
  console.log(lines.slice(-50).join('\n'));
}

// ═══════════════════════════════════════════════════════════════════════════════
// ECS DEPLOYER
// ═══════════════════════════════════════════════════════════════════════════════

async function deployToECS(env: EnvironmentName, imageTag: string): Promise<void> {
  console.log(chalk.blue('\n🚀 Deploying to ECS Fargate...\n'));

  const clusterName = 'city-guided-cluster';
  const serviceName = 'city-guided-service';
  
  console.log(chalk.white(`   Cluster: ${clusterName}`));
  console.log(chalk.white(`   Service: ${serviceName}`));
  console.log(chalk.white(`   Image tag: ${imageTag}`));

  // Get current task definition
  console.log(chalk.yellow('\n📦 Updating task definition...\n'));
  
  const taskDefArn = execSilent(`
    aws ecs describe-services \\
      --cluster ${clusterName} \\
      --services ${serviceName} \\
      --region ${AWS_CONFIG.region} \\
      --query 'services[0].taskDefinition' \\
      --output text
  `);

  const taskDef = execSilent(`
    aws ecs describe-task-definition \\
      --task-definition ${taskDefArn} \\
      --region ${AWS_CONFIG.region} \\
      --query 'taskDefinition'
  `);

  // Update image tags in task definition
  const updatedTaskDef = JSON.parse(taskDef);
  
  // Update container images
  updatedTaskDef.containerDefinitions.forEach((container: any) => {
    if (container.name === 'api') {
      container.image = `ghcr.io/elzinko/city-guided-api:${imageTag}`;
    } else if (container.name === 'web') {
      container.image = `ghcr.io/elzinko/city-guided-web:${imageTag}`;
    }
  });

  // Remove fields not needed for registration
  delete updatedTaskDef.taskDefinitionArn;
  delete updatedTaskDef.revision;
  delete updatedTaskDef.status;
  delete updatedTaskDef.requiresAttributes;
  delete updatedTaskDef.compatibilities;
  delete updatedTaskDef.registeredAt;
  delete updatedTaskDef.registeredBy;

  // Register new task definition
  const newTaskDefArn = execSilent(`
    aws ecs register-task-definition \\
      --cli-input-json '${JSON.stringify(updatedTaskDef)}' \\
      --region ${AWS_CONFIG.region} \\
      --query 'taskDefinition.taskDefinitionArn' \\
      --output text
  `);

  console.log(chalk.green(`   ✓ New task definition: ${newTaskDefArn}`));

  // Check current desired count
  const currentDesiredCount = execSilent(`
    aws ecs describe-services \\
      --cluster ${clusterName} \\
      --services ${serviceName} \\
      --region ${AWS_CONFIG.region} \\
      --query 'services[0].desiredCount' \\
      --output text
  `);

  const desiredCountNum = parseInt(currentDesiredCount, 10);
  const isScaledToZero = desiredCountNum === 0;

  if (isScaledToZero) {
    console.log(chalk.yellow('   ⚠️  Service is currently scaled to zero'));
    console.log(chalk.white('   → Setting desiredCount to 1 for deployment'));
  }

  // Update service with new task definition
  // Always set desiredCount to at least 1 during deployment to ensure the new version runs
  console.log(chalk.yellow('\n🔄 Updating ECS service...\n'));
  
  const deployDesiredCount = Math.max(desiredCountNum, 1);
  
  exec(`
    aws ecs update-service \\
      --cluster ${clusterName} \\
      --service ${serviceName} \\
      --task-definition ${newTaskDefArn} \\
      --desired-count ${deployDesiredCount} \\
      --force-new-deployment \\
      --region ${AWS_CONFIG.region} \\
      --query 'service.{status:status,desiredCount:desiredCount}' \\
      --output table
  `);

  console.log(chalk.green('\n✓ Service update initiated'));
  
  if (isScaledToZero) {
    console.log(chalk.cyan('\n💡 Note: Service was scaled to 1 for deployment.'));
    console.log(chalk.white('   The scale-to-zero Lambda will automatically scale it back'));
    console.log(chalk.white('   to 0 after 5 minutes of inactivity.'));
  }

  // Wait for service to stabilize
  console.log(chalk.yellow('\n⏳ Waiting for service to stabilize (this may take a few minutes)...\n'));
  
  try {
    exec(`
      aws ecs wait services-stable \\
        --cluster ${clusterName} \\
        --services ${serviceName} \\
        --region ${AWS_CONFIG.region}
    `);
    console.log(chalk.green('\n✅ Service is stable!'));
  } catch {
    console.log(chalk.yellow('\n⚠️  Wait timeout - check service status manually'));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let env: EnvironmentName = 'staging';
  let imageTag = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tag' && i + 1 < args.length) {
      imageTag = args[i + 1];
      i++;
    } else if (!args[i].startsWith('--')) {
      env = args[i] as EnvironmentName;
    }
  }

  if (!imageTag) {
    // Try to get from environment variable (GitHub Actions)
    imageTag = process.env.IMAGE_TAG || '';
  }

  if (!imageTag) {
    console.error(chalk.red('\n❌ Image tag required\n'));
    console.error(chalk.cyan('Usage:'));
    console.error(chalk.white('   pnpm deploy staging --tag abc1234'));
    console.error(chalk.white('   IMAGE_TAG=abc1234 pnpm deploy staging\n'));
    process.exit(1);
  }

  // Get infrastructure mode
  const mode = getInfraMode(env);

  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan(`║  🚀 Deploying: ${env.toUpperCase().padEnd(12)} Mode: ${mode.toUpperCase().padEnd(5)}   ║`));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════╝'));

  console.log(chalk.cyan('\n📋 Configuration:'));
  console.log(chalk.white(`   Environment:  ${env}`));
  console.log(chalk.white(`   Mode:         ${mode}`));
  console.log(chalk.white(`   Image tag:    ${imageTag}`));
  console.log(chalk.white(`   Region:       ${AWS_CONFIG.region}`));

  try {
    // Run appropriate deployer based on mode
    if (mode === 'ec2') {
      await deployToEC2(env, imageTag);
    } else {
      await deployToECS(env, imageTag);
    }

    // Show AWS Console links
    console.log(chalk.cyan('\n🔗 AWS Console Links:'));
    const urls = getAwsConsoleUrls(env, mode);
    for (const [name, url] of Object.entries(urls)) {
      console.log(chalk.white(`   • ${name}:`));
      console.log(chalk.gray(`     ${url}`));
    }

    console.log(chalk.bold.green('\n╔════════════════════════════════════════════════════════╗'));
    console.log(chalk.bold.green('║         ✅ Deployment Complete! ✅                      ║'));
    console.log(chalk.bold.green('╚════════════════════════════════════════════════════════╝\n'));

  } catch (error: any) {
    console.error(chalk.red(`\n❌ Deployment failed: ${error.message}\n`));
    process.exit(1);
  }
}

main();
