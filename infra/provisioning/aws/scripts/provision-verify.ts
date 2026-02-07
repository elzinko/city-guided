#!/usr/bin/env tsx
/**
 * Infrastructure Verification Script
 * 
 * Verifies the deployment status of an environment (ECS).
 * 
 * Usage:
 *   pnpm verify staging
 *   pnpm verify prod
 */

import { execSync } from 'node:child_process';
import chalk from 'chalk';
import {
  AWS_CONFIG,
  getInfraMode,
  getSsmPath,
  getAwsConsoleUrls,
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
// ECS VERIFIER
// ═══════════════════════════════════════════════════════════════════════════════

async function verifyECS(env: EnvironmentName): Promise<void> {
  console.log(chalk.blue('\n🔍 Verifying ECS infrastructure...\n'));

  const ssmPath = getSsmPath(env);

  // 1. Check SSM parameters
  console.log(chalk.cyan('📦 SSM Parameters'));
  try {
    const params = execSilent(
      `aws ssm get-parameters-by-path --path "${ssmPath}" --region ${AWS_CONFIG.region} --query 'Parameters[*].Name' --output json`
    );
    const paramCount = JSON.parse(params).length;
    console.log(chalk.green(`   ✓ ${paramCount} parameters found in ${ssmPath}`));
  } catch (error: any) {
    console.log(chalk.red(`   ✗ Failed to read SSM parameters: ${error.message}`));
    throw error;
  }

  // 2. Check ECS Cluster
  console.log(chalk.cyan('\n🏗️  ECS Cluster'));
  try {
    const clusterStatus = execSilent(
      `aws ecs describe-clusters --clusters city-guided-cluster --region ${AWS_CONFIG.region} --query "clusters[0].status" --output text`
    );
    
    if (clusterStatus === 'ACTIVE') {
      console.log(chalk.green(`   ✓ Cluster city-guided-cluster is ${clusterStatus}`));
    } else {
      console.log(chalk.yellow(`   ⚠ Cluster city-guided-cluster is ${clusterStatus}`));
    }
  } catch (error: any) {
    console.log(chalk.red(`   ✗ Failed to check ECS cluster: ${error.message}`));
    throw error;
  }

  // 3. Check ECS Service
  console.log(chalk.cyan('\n⚙️  ECS Service'));
  try {
    const serviceInfo = execSilent(
      `aws ecs describe-services --cluster city-guided-cluster --services city-guided-service --region ${AWS_CONFIG.region} --query "services[0].{status:status,desiredCount:desiredCount,runningCount:runningCount}" --output json`
    );
    
    const service = JSON.parse(serviceInfo);
    console.log(chalk.green(`   ✓ Service city-guided-service: ${service.status}`));
    console.log(chalk.white(`      Desired: ${service.desiredCount}, Running: ${service.runningCount}`));
    
    if (service.desiredCount === 0) {
      console.log(chalk.yellow(`   ⚠ Service scaled to zero (scale-to-zero enabled)`));
    }
  } catch (error: any) {
    console.log(chalk.red(`   ✗ Failed to check ECS service: ${error.message}`));
    throw error;
  }

  // 4. Check Application Load Balancer
  console.log(chalk.cyan('\n🔀 Application Load Balancer'));
  try {
    const albDns = execSilent(
      `aws elbv2 describe-load-balancers --names city-guided-alb --region ${AWS_CONFIG.region} --query "LoadBalancers[0].DNSName" --output text`
    );
    
    console.log(chalk.green(`   ✓ ALB DNS: ${albDns}`));
    
    // Check target health
    const albArn = execSilent(
      `aws elbv2 describe-load-balancers --names city-guided-alb --region ${AWS_CONFIG.region} --query "LoadBalancers[0].LoadBalancerArn" --output text`
    );
    
    const targetGroups = execSilent(
      `aws elbv2 describe-target-groups --load-balancer-arn "${albArn}" --region ${AWS_CONFIG.region} --query "TargetGroups[0].TargetGroupArn" --output text`
    );
    
    const targetHealth = execSilent(
      `aws elbv2 describe-target-health --target-group-arn "${targetGroups}" --region ${AWS_CONFIG.region} --query "TargetHealthDescriptions[*].TargetHealth.State" --output json`
    );
    
    const healthStates = JSON.parse(targetHealth);
    const healthyCount = healthStates.filter((s: string) => s === 'healthy').length;
    console.log(chalk.white(`      Healthy targets: ${healthyCount}/${healthStates.length || 0}`));
  } catch (error: any) {
    console.log(chalk.yellow(`   ⚠ Could not verify ALB: ${error.message}`));
  }

  // 5. Check CloudFormation stack
  console.log(chalk.cyan('\n☁️  CloudFormation Stack'));
  try {
    const stackStatus = execSilent(
      `aws cloudformation describe-stacks --stack-name CityGuidedEcsStack --query "Stacks[0].StackStatus" --output text --region ${AWS_CONFIG.region}`
    );
    
    if (stackStatus.includes('COMPLETE')) {
      console.log(chalk.green(`   ✓ Stack CityGuidedEcsStack: ${stackStatus}`));
    } else {
      console.log(chalk.yellow(`   ⚠ Stack CityGuidedEcsStack: ${stackStatus}`));
    }
  } catch (error: any) {
    console.log(chalk.red(`   ✗ Stack not found or error: ${error.message}`));
    throw error;
  }

  console.log(chalk.green('\n✅ ECS verification complete\n'));
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const env = args[0] as EnvironmentName || 'staging';

  // Get infrastructure mode
  const mode = getInfraMode(env);

  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan(`║  🔍 Verifying: ${env.toUpperCase().padEnd(12)} Mode: ${mode.toUpperCase().padEnd(5)}   ║`));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════╝'));

  console.log(chalk.cyan('\n📋 Configuration:'));
  console.log(chalk.white(`   Environment:  ${env}`));
  console.log(chalk.white(`   Mode:         ${mode}`));
  console.log(chalk.white(`   Region:       ${AWS_CONFIG.region}`));
  console.log(chalk.white(`   SSM Path:     ${getSsmPath(env)}/*`));

  try {
    await verifyECS(env);

    // Show AWS Console links
    console.log(chalk.cyan('🔗 AWS Console Links:'));
    const urls = getAwsConsoleUrls(env);
    for (const [name, url] of Object.entries(urls)) {
      console.log(chalk.white(`   • ${name}:`));
      console.log(chalk.gray(`     ${url}`));
    }

    console.log(chalk.bold.green('\n╔════════════════════════════════════════════════════════╗'));
    console.log(chalk.bold.green('║         ✅ Verification Complete! ✅                    ║'));
    console.log(chalk.bold.green('╚════════════════════════════════════════════════════════╝\n'));

  } catch (error: any) {
    console.error(chalk.red(`\n❌ Verification failed: ${error.message}\n`));
    process.exit(1);
  }
}

main();
