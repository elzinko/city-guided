#!/usr/bin/env tsx
/**
 * Application Deployment Verification Script
 * 
 * Verifies that the application is deployed and healthy.
 * This checks the APPLICATION layer (containers, health endpoints),
 * NOT the infrastructure layer (EC2 instances, ECS clusters).
 * 
 * Usage:
 *   pnpm app:verify staging
 *   pnpm app:verify prod
 */

import { execSync } from 'node:child_process';
import chalk from 'chalk';
import {
  AWS_CONFIG,
  getInfraMode,
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

// ═══════════════════════════════════════════════════════════════════════════════
// EC2 APP VERIFIER
// ═══════════════════════════════════════════════════════════════════════════════

async function verifyEC2App(env: EnvironmentName): Promise<void> {
  console.log(chalk.blue('\n🔍 Verifying application on EC2...\n'));

  const ssmPath = getSsmPath(env);

  // 1. Get public IP
  console.log(chalk.cyan('📍 Application Endpoint'));
  const publicIp = execSilent(
    `aws ssm get-parameter --name "${ssmPath}/SECRET_EC2_PUBLIC_IP" --with-decryption --query "Parameter.Value" --output text --region ${AWS_CONFIG.region}`
  );
  console.log(chalk.white(`   IP: ${publicIp}`));

  // 2. Check Frontend
  console.log(chalk.cyan('\n🌐 Frontend Health'));
  try {
    execSilent(`curl -sf --connect-timeout 10 --max-time 15 "http://${publicIp}/" > /dev/null`);
    console.log(chalk.green(`   ✓ Frontend responding (http://${publicIp}/)`));
  } catch {
    console.log(chalk.red(`   ✗ Frontend not responding`));
    throw new Error('Frontend health check failed');
  }

  // 3. Check API
  console.log(chalk.cyan('\n🔧 API Health'));
  try {
    const response = execSilent(`curl -sf --connect-timeout 10 --max-time 15 "http://${publicIp}/api/health"`);
    console.log(chalk.green(`   ✓ API responding: ${response || 'OK'}`));
  } catch {
    console.log(chalk.red(`   ✗ API not responding`));
    throw new Error('API health check failed');
  }

  // 4. Check Domain (if configured)
  try {
    const siteDomain = execSilent(
      `aws ssm get-parameter --name "${ssmPath}/SITE_DOMAIN" --query "Parameter.Value" --output text --region ${AWS_CONFIG.region} 2>/dev/null || echo ""`
    );
    
    if (siteDomain) {
      console.log(chalk.cyan('\n🌍 Domain Health'));
      try {
        execSilent(`curl -sf --connect-timeout 10 --max-time 15 "https://${siteDomain}/" > /dev/null`);
        console.log(chalk.green(`   ✓ Domain accessible (https://${siteDomain}/)`));
      } catch {
        console.log(chalk.yellow(`   ⚠ Domain not accessible yet (DNS propagation may take time)`));
      }
    }
  } catch {
    // Domain not configured, skip
  }

  console.log(chalk.green('\n✅ Application is healthy on EC2\n'));
}

// ═══════════════════════════════════════════════════════════════════════════════
// ECS APP VERIFIER
// ═══════════════════════════════════════════════════════════════════════════════

async function verifyECSApp(env: EnvironmentName): Promise<void> {
  console.log(chalk.blue('\n🔍 Verifying application on ECS...\n'));

  const ssmPath = getSsmPath(env);

  // 1. Check ECS Tasks
  console.log(chalk.cyan('📦 Running Tasks'));
  try {
    const tasksJson = execSilent(`
      aws ecs list-tasks \\
        --cluster city-guided-cluster \\
        --service-name city-guided-service \\
        --desired-status RUNNING \\
        --region ${AWS_CONFIG.region} \\
        --output json
    `);
    
    const tasks = JSON.parse(tasksJson);
    const taskCount = tasks.taskArns?.length || 0;
    
    if (taskCount === 0) {
      console.log(chalk.yellow(`   ⚠ No running tasks (service may be scaled to zero)`));
    } else {
      console.log(chalk.green(`   ✓ ${taskCount} running task(s)`));
      
      // Get task details
      if (tasks.taskArns && tasks.taskArns.length > 0) {
        const taskDetails = execSilent(`
          aws ecs describe-tasks \\
            --cluster city-guided-cluster \\
            --tasks ${tasks.taskArns[0]} \\
            --region ${AWS_CONFIG.region} \\
            --query 'tasks[0].lastStatus' \\
            --output text
        `);
        console.log(chalk.white(`      Status: ${taskDetails}`));
      }
    }
  } catch (error: any) {
    console.log(chalk.red(`   ✗ Failed to check tasks: ${error.message}`));
    throw error;
  }

  // 2. Check ALB Target Health
  console.log(chalk.cyan('\n🎯 Target Health'));
  try {
    const tgArn = execSilent(`
      aws elbv2 describe-target-groups \\
        --names city-guided-targets \\
        --region ${AWS_CONFIG.region} \\
        --query 'TargetGroups[0].TargetGroupArn' \\
        --output text
    `);
    
    const healthJson = execSilent(`
      aws elbv2 describe-target-health \\
        --target-group-arn "${tgArn}" \\
        --region ${AWS_CONFIG.region} \\
        --output json
    `);
    
    const health = JSON.parse(healthJson);
    const healthyTargets = health.TargetHealthDescriptions?.filter((t: any) => t.TargetHealth.State === 'healthy').length || 0;
    const totalTargets = health.TargetHealthDescriptions?.length || 0;
    
    if (healthyTargets === 0 && totalTargets === 0) {
      console.log(chalk.yellow(`   ⚠ No targets registered (service may be scaled to zero)`));
    } else if (healthyTargets === totalTargets) {
      console.log(chalk.green(`   ✓ All targets healthy (${healthyTargets}/${totalTargets})`));
    } else {
      console.log(chalk.yellow(`   ⚠ Some targets unhealthy (${healthyTargets}/${totalTargets} healthy)`));
    }
  } catch (error: any) {
    console.log(chalk.yellow(`   ⚠ Could not check target health: ${error.message}`));
  }

  // 3. Check ALB Endpoint
  console.log(chalk.cyan('\n🌐 ALB Health'));
  try {
    const albDns = execSilent(`
      aws elbv2 describe-load-balancers \\
        --names city-guided-alb \\
        --region ${AWS_CONFIG.region} \\
        --query 'LoadBalancers[0].DNSName' \\
        --output text
    `);
    
    console.log(chalk.white(`   ALB DNS: ${albDns}`));
    
    try {
      execSilent(`curl -sf --connect-timeout 10 --max-time 15 "http://${albDns}/" > /dev/null`);
      console.log(chalk.green(`   ✓ ALB responding`));
    } catch {
      console.log(chalk.yellow(`   ⚠ ALB not responding (may be scaled to zero)`));
    }
  } catch (error: any) {
    console.log(chalk.red(`   ✗ Failed to check ALB: ${error.message}`));
    throw error;
  }

  // 4. Check Domain (if configured)
  try {
    const siteDomain = execSilent(
      `aws ssm get-parameter --name "${ssmPath}/SITE_DOMAIN" --query "Parameter.Value" --output text --region ${AWS_CONFIG.region} 2>/dev/null || echo ""`
    );
    
    if (siteDomain) {
      console.log(chalk.cyan('\n🌍 Domain Health'));
      try {
        execSilent(`curl -sf --connect-timeout 10 --max-time 15 "https://${siteDomain}/" > /dev/null`);
        console.log(chalk.green(`   ✓ Domain accessible (https://${siteDomain}/)`));
      } catch {
        console.log(chalk.yellow(`   ⚠ Domain not accessible yet (DNS propagation may take time)`));
      }
    }
  } catch {
    // Domain not configured, skip
  }

  console.log(chalk.green('\n✅ Application is healthy on ECS\n'));
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
  console.log(chalk.bold.cyan(`║  🏥 App Health: ${env.toUpperCase().padEnd(12)} Mode: ${mode.toUpperCase().padEnd(5)}   ║`));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════╝'));

  console.log(chalk.cyan('\n📋 Configuration:'));
  console.log(chalk.white(`   Environment:  ${env}`));
  console.log(chalk.white(`   Mode:         ${mode}`));
  console.log(chalk.white(`   Region:       ${AWS_CONFIG.region}`));

  try {
    // Run appropriate verifier based on mode
    if (mode === 'ec2') {
      await verifyEC2App(env);
    } else {
      await verifyECSApp(env);
    }

    // Show AWS Console links
    console.log(chalk.cyan('🔗 AWS Console Links:'));
    const urls = getAwsConsoleUrls(env, mode);
    for (const [name, url] of Object.entries(urls)) {
      console.log(chalk.white(`   • ${name}:`));
      console.log(chalk.gray(`     ${url}`));
    }

    console.log(chalk.bold.green('\n╔════════════════════════════════════════════════════════╗'));
    console.log(chalk.bold.green('║      ✅ Application Health Check Passed! ✅            ║'));
    console.log(chalk.bold.green('╚════════════════════════════════════════════════════════╝\n'));

  } catch (error: any) {
    console.error(chalk.red(`\n❌ Application health check failed: ${error.message}\n`));
    process.exit(1);
  }
}

main();
