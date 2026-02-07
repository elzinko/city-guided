#!/usr/bin/env tsx
/**
 * ECS Deployment Script
 *
 * Deploys application to ECS Fargate (task definition + service update).
 *
 * Usage:
 *   pnpm deploy staging --tag abc1234
 *   pnpm deploy prod --tag v1.2.3
 *
 * For Docker Compose (local / other host): pnpm run docker:deploy
 */

import { execSync } from 'node:child_process';
import chalk from 'chalk';
import {
  AWS_CONFIG,
  getSsmPath,
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
// ECS DEPLOYER
// ═══════════════════════════════════════════════════════════════════════════════

async function deployToECS(env: EnvironmentName, imageTag: string): Promise<void> {
  console.log(chalk.blue('\n🚀 Deploying to ECS Fargate...\n'));

  const clusterName = 'city-guided-cluster';
  const serviceName = 'city-guided-service';
  
  console.log(chalk.white(`   Cluster: ${clusterName}`));
  console.log(chalk.white(`   Service: ${serviceName}`));
  console.log(chalk.white(`   Image tag: ${imageTag}`));

  // Get ECR repository URIs
  console.log(chalk.yellow('\n🔍 Getting ECR repository URIs...\n'));
  
  const apiRepoUri = execSilent(`
    aws ecr describe-repositories \\
      --repository-names city-guided-api \\
      --region ${AWS_CONFIG.region} \\
      --query 'repositories[0].repositoryUri' \\
      --output text
  `);

  const webRepoUri = execSilent(`
    aws ecr describe-repositories \\
      --repository-names city-guided-web \\
      --region ${AWS_CONFIG.region} \\
      --query 'repositories[0].repositoryUri' \\
      --output text
  `);

  console.log(chalk.white(`   API Repository: ${apiRepoUri}`));
  console.log(chalk.white(`   Web Repository: ${webRepoUri}`));

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

  // Get environment variables from SSM (source of truth: .env.staging pushed via pnpm config:push)
  console.log(chalk.yellow('\n📥 Fetching environment variables from SSM...\n'));
  const ssmPath = getSsmPath(env);
  
  // Fetch all parameters from SSM (same approach as deploy.sh)
  const ssmParamsOutput = execSilent(
    `aws ssm get-parameters-by-path \
      --path "${ssmPath}" \
      --recursive \
      --with-decryption \
      --region ${AWS_CONFIG.region} \
      --query 'Parameters[*].[Name,Value]' \
      --output text 2>/dev/null || echo ""`
  );

  // Parse SSM parameters into a map
  const envVars: Record<string, string> = {};
  if (ssmParamsOutput && ssmParamsOutput.trim() !== '') {
    const lines = ssmParamsOutput.trim().split('\n');
    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        const fullName = parts[0];
        const key = fullName.replace(`${ssmPath}/`, '');
        // Remove SECRET_ prefix for environment variables (secrets are stored with prefix in SSM)
        const envKey = key.startsWith('SECRET_') ? key.substring(7) : key;
        envVars[envKey] = parts[1];
      }
    }
  }

  console.log(chalk.white(`   Loaded ${Object.keys(envVars).length} variables from SSM`));
  
  // Get SHOW_DEV_OPTIONS (runtime variable only, no NEXT_PUBLIC_ prefix)
  const showDevOptions = envVars.SHOW_DEV_OPTIONS || 'false';
  console.log(chalk.white(`   SHOW_DEV_OPTIONS: ${showDevOptions}`));

  // Update image tags in task definition
  const updatedTaskDef = JSON.parse(taskDef);
  
  // Update container images with ECR URIs and environment variables
  updatedTaskDef.containerDefinitions.forEach((container: any) => {
    if (container.name === 'api') {
      container.image = `${apiRepoUri}:${imageTag}`;
      console.log(chalk.green(`   ✓ API image: ${container.image}`));
      
      // Update API container environment variables from SSM
      if (!container.environment) {
        container.environment = [];
      }
      
      // Add/update environment variables for API container
      // Only add variables that are relevant for the API (not NEXT_PUBLIC_*)
      const apiEnvVars = ['NODE_ENV', 'PORT', 'LOG_LEVEL', 'DATABASE_URL'];
      for (const key of apiEnvVars) {
        if (envVars[key]) {
          const existingIndex = container.environment.findIndex((e: any) => e.name === key);
          if (existingIndex >= 0) {
            container.environment[existingIndex].value = envVars[key];
          } else {
            container.environment.push({ name: key, value: envVars[key] });
          }
        }
      }
      
    } else if (container.name === 'web') {
      container.image = `${webRepoUri}:${imageTag}`;
      console.log(chalk.green(`   ✓ Web image: ${container.image}`));
      
      // Update web container environment variables from SSM
      if (!container.environment) {
        container.environment = [];
      }
      
      // Add/update environment variables for web container
      // NEXT_PUBLIC_* variables are for build-time (needed by Next.js client-side)
      // SHOW_DEV_OPTIONS is runtime-only (read server-side, allows same image for staging/prod)
      const webEnvVars = [
        'NODE_ENV',
        'PORT',
        'NEXT_PUBLIC_API_URL',
        'NEXT_PUBLIC_OSRM_URL',
        'SHOW_DEV_OPTIONS', // Runtime variable (read server-side in _app.tsx)
        'APP_VERSION',
        'APP_REPO_URL',
      ];
      
      for (const key of webEnvVars) {
        if (envVars[key]) {
          const existingIndex = container.environment.findIndex((e: any) => e.name === key);
          if (existingIndex >= 0) {
            container.environment[existingIndex].value = envVars[key];
          } else {
            container.environment.push({ name: key, value: envVars[key] });
          }
        }
      }
      
      // Always add SHOW_DEV_OPTIONS (runtime variable) if not already present
      // This allows the same Docker image to be used for staging and prod
      const hasShowDevOptions = container.environment.some((e: any) => e.name === 'SHOW_DEV_OPTIONS');
      if (!hasShowDevOptions) {
        container.environment.push({
          name: 'SHOW_DEV_OPTIONS',
          value: showDevOptions,
        });
      }
      
      console.log(chalk.green(`   ✓ Updated web container with ${container.environment.length} environment variables`));
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

  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan(`║  🚀 Deploying to ECS: ${env.toUpperCase().padEnd(10)}                    ║`));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════╝'));

  console.log(chalk.cyan('\n📋 Configuration:'));
  console.log(chalk.white(`   Environment:  ${env}`));
  console.log(chalk.white(`   Image tag:   ${imageTag}`));
  console.log(chalk.white(`   Region:      ${AWS_CONFIG.region}`));

  try {
    await deployToECS(env, imageTag);

    // Show AWS Console links
    console.log(chalk.cyan('\n🔗 AWS Console Links:'));
    const urls = getAwsConsoleUrls(env);
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
