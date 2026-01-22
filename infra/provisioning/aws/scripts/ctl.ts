#!/usr/bin/env tsx
/**
 * Infrastructure Control CLI
 * 
 * Quick commands to manage ECS service and scale-to-zero Lambda
 * 
 * Usage:
 *   pnpm infra:ctl [command]
 * 
 * Commands:
 *   start       - Scale to 1 + enable Lambda
 *   stop        - Scale to 0 + enable Lambda (scale-to-zero mode)
 *   off         - Scale to 0 + disable Lambda (completely OFF)
 *   on          - Alias for 'start'
 *   logs        - View service logs (api or web)
 *   status      - Show current status
 *   links       - Show AWS Console links (dashboards, ECS, logs, etc.)
 *   diagnose    - Run diagnostic report (Caddy, ALB, DuckDNS, etc.)
 *   caddy-logs  - View Caddy reverse proxy logs
 *   [none]      - Interactive mode
 */

import { ECSClient, UpdateServiceCommand, DescribeServicesCommand } from '@aws-sdk/client-ecs';
import { LambdaClient, PutFunctionConcurrencyCommand, DeleteFunctionConcurrencyCommand, GetFunctionCommand } from '@aws-sdk/client-lambda';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { CloudWatchLogsClient, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { ApplicationAutoScalingClient, RegisterScalableTargetCommand } from '@aws-sdk/client-application-auto-scaling';
import { SSMClient, SendCommandCommand, GetCommandInvocationCommand } from '@aws-sdk/client-ssm';
import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { createInterface } from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { AWS_CONFIG, getEnvironmentConfig, getAwsConsoleUrls, type EnvironmentName } from '../constants.js';

const AWS_REGION = AWS_CONFIG.region;
const ecsClient = new ECSClient({ region: AWS_REGION });
const lambdaClient = new LambdaClient({ region: AWS_REGION });
const cfnClient = new CloudFormationClient({ region: AWS_REGION });
const logsClient = new CloudWatchLogsClient({ region: AWS_REGION });
const autoScalingClient = new ApplicationAutoScalingClient({ region: AWS_REGION });
const ssmClient = new SSMClient({ region: AWS_REGION });
const ec2Client = new EC2Client({ region: AWS_REGION });

const rl = createInterface({ input, output });

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n👋 Cancelled.\n'));
  rl.close();
  process.exit(0);
});

interface ServiceStatus {
  desired: number;
  running: number;
  scaleUpLambdaEnabled: boolean;
  scaleToZeroLambdaEnabled: boolean;
  scaleUpLambdaArn?: string;
  scaleToZeroLambdaArn?: string;
}

async function getStatus(env: EnvironmentName): Promise<ServiceStatus> {
  const config = getEnvironmentConfig(env);
  
  // Get ECS service status
  const ecsResponse = await ecsClient.send(
    new DescribeServicesCommand({
      cluster: 'city-guided-cluster',
      services: ['city-guided-service'],
    })
  );

  const service = ecsResponse.services?.[0];
  const desired = service?.desiredCount ?? 0;
  const running = service?.runningCount ?? 0;

  // Get Lambda ARNs from CloudFormation
  const stackResponse = await cfnClient.send(
    new DescribeStacksCommand({
      StackName: config.STACK_NAME,
    })
  );

  const outputs = stackResponse.Stacks?.[0]?.Outputs || [];
  const scaleUpLambdaArn = outputs.find(o => o.OutputKey === 'ScaleUpLambdaArn')?.OutputValue;
  const scaleToZeroLambdaArn = outputs.find(o => o.OutputKey === 'ScaleToZeroLambdaArn')?.OutputValue;

  // Check both Lambdas concurrency status
  const scaleUpLambdaEnabled = await isLambdaEnabled(scaleUpLambdaArn);
  const scaleToZeroLambdaEnabled = await isLambdaEnabled(scaleToZeroLambdaArn);

  return { 
    desired, 
    running, 
    scaleUpLambdaEnabled, 
    scaleToZeroLambdaEnabled,
    scaleUpLambdaArn, 
    scaleToZeroLambdaArn 
  };
}

async function isLambdaEnabled(lambdaArn: string | undefined): Promise<boolean> {
  if (!lambdaArn) return false;
  
  try {
    const lambdaName = lambdaArn.split(':').pop();
    const lambdaResponse = await lambdaClient.send(
      new GetFunctionCommand({
        FunctionName: lambdaName,
      })
    );
    const concurrency = lambdaResponse.Concurrency?.ReservedConcurrentExecutions;
    return concurrency !== 0;
  } catch {
    return true; // If no concurrency limit set, Lambda is enabled
  }
}

async function scaleService(count: 0 | 1): Promise<void> {
  await ecsClient.send(
    new UpdateServiceCommand({
      cluster: 'city-guided-cluster',
      service: 'city-guided-service',
      desiredCount: count,
    })
  );
}

async function setLambdaEnabled(lambdaArn: string, enabled: boolean): Promise<void> {
  const lambdaName = lambdaArn.split(':').pop()!;
  
  if (enabled) {
    // Remove concurrency limit (enable Lambda)
    await lambdaClient.send(
      new DeleteFunctionConcurrencyCommand({
        FunctionName: lambdaName,
      })
    );
  } else {
    // Set concurrency to 0 (disable Lambda)
    await lambdaClient.send(
      new PutFunctionConcurrencyCommand({
        FunctionName: lambdaName,
        ReservedConcurrentExecutions: 0,
      })
    );
  }
}

async function setAutoScalingEnabled(enabled: boolean): Promise<void> {
  try {
    await autoScalingClient.send(
      new RegisterScalableTargetCommand({
        ServiceNamespace: 'ecs',
        ResourceId: 'service/city-guided-cluster/city-guided-service',
        ScalableDimension: 'ecs:service:DesiredCount',
        SuspendedState: {
          DynamicScalingInSuspended: !enabled,
          DynamicScalingOutSuspended: !enabled,
        },
      })
    );
  } catch (error: any) {
    console.log(chalk.yellow(`⚠ Could not update autoscaling state: ${error.message}`));
  }
}

async function updateCaddyMode(env: EnvironmentName, mode: 'standby' | 'off'): Promise<void> {
  console.log(chalk.blue(`📝 Updating Caddy to ${mode} mode...`));
  try {
    execSync(`npx tsx scripts/update-caddy.ts ${env} --mode=${mode}`, {
      cwd: process.cwd(),
      stdio: 'pipe',
    });
    console.log(chalk.green(`✓ Caddy page updated to ${mode} mode`));
  } catch (error: any) {
    console.log(chalk.yellow(`⚠ Could not update Caddy (continuing anyway)`));
    console.log(chalk.dim(`   Error: ${error.message}`));
  }
}

function displayStatus(status: ServiceStatus, env: string): void {
  console.log(chalk.bold.cyan('\n📊 Infrastructure Status\n'));
  console.log(chalk.cyan(`Environment: ${env}`));
  console.log(chalk.cyan(`Region:      ${AWS_REGION}\n`));
  
  console.log(chalk.white('🐳 ECS Service'));
  console.log(chalk.white(`   Desired: ${status.desired}`));
  console.log(chalk.white(`   Running: ${status.running}`));
  
  if (status.desired === 0 && status.running === 0) {
    console.log(chalk.yellow('   ⚠ Service is scaled to zero'));
  }
  
  console.log(chalk.white('\n⚡ Lambdas'));
  console.log(chalk.white(`   Scale-Up (auto-wake):  ${status.scaleUpLambdaEnabled ? chalk.green('Enabled') : chalk.red('Disabled')}`));
  console.log(chalk.white(`   Scale-To-Zero (down):  ${status.scaleToZeroLambdaEnabled ? chalk.green('Enabled') : chalk.red('Disabled')}`));
  
  let mode = '';
  if (status.desired === 1) {
    mode = chalk.green('🟢 ON') + ' - Service running';
  } else if (status.desired === 0 && status.scaleUpLambdaEnabled) {
    mode = chalk.yellow('🟡 STANDBY') + ' - Scale-to-zero (auto-wake on request)';
  } else {
    mode = chalk.red('🔴 OFF') + ' - Service stopped, no auto-wake';
  }
  
  console.log(chalk.white('\n📍 Mode:'), mode);
  console.log();
}

async function start(env: EnvironmentName): Promise<void> {
  console.log(chalk.blue('🚀 Starting service...\n'));
  
  const status = await getStatus(env);
  
  await scaleService(1);
  console.log(chalk.green('✓ Scaled service to 1'));
  
  // Enable ECS autoscaling
  await setAutoScalingEnabled(true);
  console.log(chalk.green('✓ Enabled ECS autoscaling'));
  
  // Enable both Lambdas for normal operation
  if (status.scaleUpLambdaArn && !status.scaleUpLambdaEnabled) {
    await setLambdaEnabled(status.scaleUpLambdaArn, true);
    console.log(chalk.green('✓ Enabled scale-up Lambda'));
  }
  
  if (status.scaleToZeroLambdaArn && !status.scaleToZeroLambdaEnabled) {
    await setLambdaEnabled(status.scaleToZeroLambdaArn, true);
    console.log(chalk.green('✓ Enabled scale-to-zero Lambda'));
  }
  
  console.log(chalk.green.bold('\n✅ Service is starting (takes ~30-60s)\n'));
  console.log(chalk.white(`   Access: https://cityguided.duckdns.org\n`));
}

async function stop(env: EnvironmentName): Promise<void> {
  console.log(chalk.blue('⏸️  Stopping service (scale-to-zero mode)...\n'));
  
  const status = await getStatus(env);
  
  await scaleService(0);
  console.log(chalk.green('✓ Scaled service to 0'));
  
  // Enable ECS autoscaling (for auto-wake)
  await setAutoScalingEnabled(true);
  console.log(chalk.green('✓ Enabled ECS autoscaling (auto-wake)'));
  
  // Enable both Lambdas: scale-to-zero will keep it at 0, scale-up will wake it
  if (status.scaleUpLambdaArn && !status.scaleUpLambdaEnabled) {
    await setLambdaEnabled(status.scaleUpLambdaArn, true);
    console.log(chalk.green('✓ Enabled scale-up Lambda'));
  }
  
  if (status.scaleToZeroLambdaArn && !status.scaleToZeroLambdaEnabled) {
    await setLambdaEnabled(status.scaleToZeroLambdaArn, true);
    console.log(chalk.green('✓ Enabled scale-to-zero Lambda'));
  }
  
  // Update Caddy to show standby page (with auto-refresh)
  await updateCaddyMode(env, 'standby');
  
  console.log(chalk.green.bold('\n✅ Service in scale-to-zero mode\n'));
  console.log(chalk.white('   Service will auto-start on first request\n'));
}

async function off(env: EnvironmentName): Promise<void> {
  console.log(chalk.blue('🛑 Turning OFF service completely...\n'));
  
  const status = await getStatus(env);
  
  await scaleService(0);
  console.log(chalk.green('✓ Scaled service to 0'));
  
  // Disable ECS autoscaling (prevents auto-wake from ALB requests)
  await setAutoScalingEnabled(false);
  console.log(chalk.green('✓ Suspended ECS autoscaling (no auto-wake)'));
  
  // Disable BOTH Lambdas: no auto-wake, no scale-down
  if (status.scaleUpLambdaArn) {
    await setLambdaEnabled(status.scaleUpLambdaArn, false);
    console.log(chalk.green('✓ Disabled scale-up Lambda'));
  }
  
  if (status.scaleToZeroLambdaArn) {
    await setLambdaEnabled(status.scaleToZeroLambdaArn, false);
    console.log(chalk.green('✓ Disabled scale-to-zero Lambda'));
  }
  
  // Update Caddy to show OFF page (no auto-refresh)
  await updateCaddyMode(env, 'off');
  
  console.log(chalk.green.bold('\n✅ Service is completely OFF\n'));
  console.log(chalk.white('   No auto-wake. Use "start" or "stop" to re-enable.\n'));
}

async function logs(service: 'api' | 'web', lines: number = 50): Promise<void> {
  console.log(chalk.blue(`📜 Fetching last ${lines} log entries for ${service}...\n`));
  
  const logGroup = `/ecs/city-guided-${service}`;
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  
  try {
    const response = await logsClient.send(
      new FilterLogEventsCommand({
        logGroupName: logGroup,
        startTime: fiveMinutesAgo,
        limit: lines,
      })
    );

    if (!response.events || response.events.length === 0) {
      console.log(chalk.yellow('No recent logs found (last 5 minutes)\n'));
      return;
    }

    for (const event of response.events) {
      const timestamp = new Date(event.timestamp!).toISOString().replace('T', ' ').slice(0, -5);
      console.log(chalk.dim(`[${timestamp}]`), event.message?.trim());
    }
    console.log();
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      console.log(chalk.yellow(`Log group ${logGroup} not found\n`));
    } else {
      throw error;
    }
  }
}

async function showLinks(env: EnvironmentName): Promise<void> {
  const urls = getAwsConsoleUrls(env);
  
  console.log(chalk.bold.cyan('🔗 AWS Console Links\n'));
  
  // Group links by category
  const categories = {
    '📊 Dashboards & Monitoring': [
      'CloudWatch Dashboard (Scale-to-Zero)',
      'CloudWatch Container Insights',
      'CloudWatch Alarms',
      'Cost Explorer (Service Costs)',
    ],
    '🐳 ECS Resources': [
      'ECS Cluster',
      'ECS Service',
      'ECS Tasks (Running)',
      'ECS Task Definitions',
    ],
    '⚖️ Load Balancing': [
      'Application Load Balancer',
      'Target Groups',
    ],
    '📝 Logging': [
      'CloudWatch Logs (API)',
      'CloudWatch Logs (Web)',
      'CloudWatch Log Groups (All)',
    ],
    '⚡ Serverless': [
      'Lambda Functions',
    ],
    '⚙️ Configuration': [
      'SSM Parameters',
      'CloudFormation Stack',
      'ECR Repositories',
    ],
    '🌐 Networking': [
      'VPC Dashboard',
      'Security Groups',
    ],
    '🔄 Reverse Proxy': [
      'EC2 Instance (Caddy)',
    ],
  };
  
  for (const [category, linkNames] of Object.entries(categories)) {
    console.log(chalk.bold.white(category));
    for (const name of linkNames) {
      const url = urls[name];
      if (url) {
        console.log(chalk.dim('  •'), chalk.cyan(name));
        console.log(chalk.dim('    '), chalk.gray(url));
      }
    }
    console.log();
  }
  
  console.log(chalk.dim('💡 Tip: Copy any URL above and paste in your browser\n'));
}

async function getCaddyInstanceId(): Promise<string | null> {
  try {
    const stackResponse = await cfnClient.send(
      new DescribeStacksCommand({
        StackName: 'CityGuidedReverseProxyStack',
      })
    );
    const outputs = stackResponse.Stacks?.[0]?.Outputs || [];
    return outputs.find(o => o.OutputKey === 'InstanceId')?.OutputValue || null;
  } catch (error) {
    return null;
  }
}

async function runSSMCommand(instanceId: string, commands: string[]): Promise<string> {
  const response = await ssmClient.send(
    new SendCommandCommand({
      InstanceIds: [instanceId],
      DocumentName: 'AWS-RunShellScript',
      Parameters: {
        commands,
      },
    })
  );

  const commandId = response.Command?.CommandId;
  if (!commandId) {
    throw new Error('Failed to get command ID');
  }

  // Wait for command to complete
  await new Promise(resolve => setTimeout(resolve, 3000));

  let attempts = 0;
  while (attempts < 10) {
    const result = await ssmClient.send(
      new GetCommandInvocationCommand({
        CommandId: commandId,
        InstanceId: instanceId,
      })
    );

    if (result.Status === 'Success') {
      return result.StandardOutputContent || '';
    } else if (result.Status === 'Failed') {
      throw new Error(result.StandardErrorContent || 'Command failed');
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }

  throw new Error('Command timed out');
}

async function showCaddyLogs(lines: number = 50): Promise<void> {
  console.log(chalk.blue('📜 Fetching Caddy logs...\n'));

  const instanceId = await getCaddyInstanceId();
  if (!instanceId) {
    console.log(chalk.red('❌ Could not find Caddy instance\n'));
    return;
  }

  try {
    const output = await runSSMCommand(instanceId, [
      `sudo journalctl -u caddy -n ${lines} --no-pager`
    ]);

    console.log(chalk.dim('=== Caddy Logs ===\n'));
    console.log(output);
    console.log();
  } catch (error: any) {
    console.log(chalk.red(`❌ Error: ${error.message}\n`));
  }
}

async function diagnose(env: EnvironmentName): Promise<void> {
  console.log(chalk.bold.cyan('🔍 Running Infrastructure Diagnostics\n'));
  console.log(chalk.dim('This may take 10-15 seconds...\n'));

  const report: string[] = [];
  const issues: string[] = [];
  const warnings: string[] = [];

  // 1. Check Caddy instance
  report.push(chalk.bold.white('1️⃣  Caddy Reverse Proxy'));
  try {
    const instanceId = await getCaddyInstanceId();
    if (!instanceId) {
      issues.push('Caddy instance not found in CloudFormation outputs');
      report.push(chalk.red('   ❌ Instance: NOT FOUND'));
    } else {
      const ec2Response = await ec2Client.send(
        new DescribeInstancesCommand({
          InstanceIds: [instanceId],
        })
      );
      const instance = ec2Response.Reservations?.[0]?.Instances?.[0];
      
      if (instance) {
        const state = instance.State?.Name;
        const ip = instance.PublicIpAddress;
        
        if (state === 'running') {
          report.push(chalk.green(`   ✓ Instance: ${instanceId} (${state})`));
          report.push(chalk.green(`   ✓ Public IP: ${ip}`));
        } else {
          issues.push(`Caddy instance is ${state}, not running`);
          report.push(chalk.red(`   ❌ Instance: ${instanceId} (${state})`));
        }
      }
    }
  } catch (error: any) {
    issues.push(`Caddy check failed: ${error.message}`);
    report.push(chalk.red(`   ❌ Error: ${error.message}`));
  }
  report.push('');

  // 2. Check DuckDNS resolution
  report.push(chalk.bold.white('2️⃣  DuckDNS Configuration'));
  try {
    const dnsResult = execSync('nslookup cityguided.duckdns.org', { encoding: 'utf8' });
    const ipMatch = dnsResult.match(/Address: ([\d.]+)/);
    
    if (ipMatch) {
      const resolvedIP = ipMatch[1];
      report.push(chalk.green(`   ✓ Domain: cityguided.duckdns.org`));
      report.push(chalk.green(`   ✓ Resolves to: ${resolvedIP}`));
      
      // Compare with Caddy IP
      const instanceId = await getCaddyInstanceId();
      if (instanceId) {
        const ec2Response = await ec2Client.send(
          new DescribeInstancesCommand({ InstanceIds: [instanceId] })
        );
        const caddyIP = ec2Response.Reservations?.[0]?.Instances?.[0]?.PublicIpAddress;
        
        if (caddyIP && resolvedIP !== caddyIP) {
          issues.push(`DuckDNS points to ${resolvedIP} but Caddy is at ${caddyIP}`);
          report.push(chalk.red(`   ❌ IP Mismatch: DuckDNS=${resolvedIP}, Caddy=${caddyIP}`));
        }
      }
    } else {
      issues.push('DuckDNS resolution failed');
      report.push(chalk.red('   ❌ Could not resolve domain'));
    }
  } catch (error: any) {
    issues.push(`DNS check failed: ${error.message}`);
    report.push(chalk.red(`   ❌ Error: ${error.message}`));
  }
  report.push('');

  // 3. Check ALB
  report.push(chalk.bold.white('3️⃣  Application Load Balancer'));
  try {
    const stackResponse = await cfnClient.send(
      new DescribeStacksCommand({
        StackName: getEnvironmentConfig(env).STACK_NAME,
      })
    );
    const outputs = stackResponse.Stacks?.[0]?.Outputs || [];
    const albDNS = outputs.find(o => o.OutputKey === 'LoadBalancerDNS')?.OutputValue;
    
    if (albDNS) {
      report.push(chalk.green(`   ✓ ALB DNS: ${albDNS}`));
      
      // Test ALB connectivity
      try {
        const testResult = execSync(`curl -s -o /dev/null -w "%{http_code}" http://${albDNS}/api/health --max-time 5`, { encoding: 'utf8' });
        const statusCode = testResult.trim();
        
        if (statusCode === '200') {
          report.push(chalk.green('   ✓ Health check: Responding (200)'));
        } else if (statusCode === '503') {
          warnings.push('ALB returning 503 (service may be scaled to zero)');
          report.push(chalk.yellow(`   ⚠ Health check: 503 (service scaled to zero?)`));
        } else {
          warnings.push(`ALB returning unexpected status: ${statusCode}`);
          report.push(chalk.yellow(`   ⚠ Health check: ${statusCode}`));
        }
      } catch (error) {
        issues.push('ALB health check failed (timeout or network error)');
        report.push(chalk.red('   ❌ Health check: FAILED'));
      }
    } else {
      issues.push('ALB DNS not found in stack outputs');
      report.push(chalk.red('   ❌ ALB DNS: NOT FOUND'));
    }
  } catch (error: any) {
    issues.push(`ALB check failed: ${error.message}`);
    report.push(chalk.red(`   ❌ Error: ${error.message}`));
  }
  report.push('');

  // 4. Check Caddy configuration
  report.push(chalk.bold.white('4️⃣  Caddy Configuration'));
  try {
    const instanceId = await getCaddyInstanceId();
    if (instanceId) {
      const caddyfile = await runSSMCommand(instanceId, ['cat /etc/caddy/Caddyfile']);
      
      // Extract ALB URL from Caddyfile
      const albMatch = caddyfile.match(/reverse_proxy\s+http:\/\/([^\s]+)/);
      if (albMatch) {
        report.push(chalk.green(`   ✓ Reverse proxy to: ${albMatch[1]}`));
      } else {
        issues.push('Could not find reverse_proxy directive in Caddyfile');
        report.push(chalk.red('   ❌ Reverse proxy: NOT CONFIGURED'));
      }
      
      // Check if Caddy is running
      const caddyStatus = await runSSMCommand(instanceId, ['systemctl is-active caddy']);
      if (caddyStatus.trim() === 'active') {
        report.push(chalk.green('   ✓ Caddy service: RUNNING'));
      } else {
        issues.push(`Caddy service is ${caddyStatus.trim()}`);
        report.push(chalk.red(`   ❌ Caddy service: ${caddyStatus.trim()}`));
      }
    }
  } catch (error: any) {
    warnings.push(`Caddy config check failed: ${error.message}`);
    report.push(chalk.yellow(`   ⚠ Could not check config: ${error.message}`));
  }
  report.push('');

  // 5. Check ECS Service
  report.push(chalk.bold.white('5️⃣  ECS Service'));
  const status = await getStatus(env);
  report.push(chalk.white(`   Desired: ${status.desired}, Running: ${status.running}`));
  
  if (status.desired === 0 && status.running === 0) {
    if (status.scaleUpLambdaEnabled) {
      report.push(chalk.yellow('   ⚠ Service scaled to zero (STANDBY mode)'));
    } else {
      report.push(chalk.yellow('   ⚠ Service scaled to zero (OFF mode)'));
    }
  } else if (status.running < status.desired) {
    warnings.push(`ECS service: ${status.running}/${status.desired} tasks running`);
    report.push(chalk.yellow(`   ⚠ Starting: ${status.running}/${status.desired} tasks`));
  } else {
    report.push(chalk.green('   ✓ Service: RUNNING'));
  }
  report.push('');

  // 6. Check recent ALB metrics
  report.push(chalk.bold.white('6️⃣  Recent ALB Activity (last 5 min)'));
  try {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 5 * 60 * 1000);
    
    // This would require CloudWatch API call - simplified for now
    report.push(chalk.dim('   (Check CloudWatch dashboard for detailed metrics)'));
  } catch (error: any) {
    report.push(chalk.dim(`   Could not fetch metrics: ${error.message}`));
  }
  report.push('');

  // Print report
  console.log(report.join('\n'));

  // Summary
  console.log(chalk.bold.cyan('📊 Summary\n'));
  
  if (issues.length === 0 && warnings.length === 0) {
    console.log(chalk.green.bold('✅ All checks passed!\n'));
  } else {
    if (issues.length > 0) {
      console.log(chalk.red.bold(`❌ ${issues.length} Critical Issue(s):\n`));
      issues.forEach(issue => console.log(chalk.red(`   • ${issue}`)));
      console.log();
    }
    
    if (warnings.length > 0) {
      console.log(chalk.yellow.bold(`⚠️  ${warnings.length} Warning(s):\n`));
      warnings.forEach(warning => console.log(chalk.yellow(`   • ${warning}`)));
      console.log();
    }
  }

  console.log(chalk.dim('💡 Tip: Use "pnpm infra:ctl caddy-logs" to view Caddy logs\n'));
}

async function interactiveMode(env: EnvironmentName): Promise<void> {
  while (true) {
    const status = await getStatus(env);
    displayStatus(status, env);
    
    console.log(chalk.bold.cyan('⚡ Quick Actions\n'));
    console.log(chalk.white('  1. 🟢 ON        - Start service (scale=1, lambda=on)'));
    console.log(chalk.white('  2. 🟡 STANDBY   - Scale-to-zero mode (scale=0, lambda=on)'));
    console.log(chalk.white('  3. 🔴 OFF       - Complete shutdown (scale=0, lambda=off)'));
    console.log(chalk.white('  4. 📜 Logs      - View recent logs'));
    console.log(chalk.white('  5. 🔗 Links     - Show AWS Console links'));
    console.log(chalk.white('  6. 🔍 Diagnose  - Run diagnostic report'));
    console.log(chalk.white('  7. 📋 Caddy     - View Caddy logs'));
    console.log(chalk.white('  8. 🔄 Refresh   - Update status'));
    console.log(chalk.white('  0. Exit\n'));
    
    let choice: string;
    try {
      choice = await rl.question(chalk.cyan('Choose action: '));
    } catch (error: any) {
      // Handle Ctrl+C gracefully (rl.question throws AbortError)
      if (error.name === 'AbortError' || error.code === 'ERR_USE_AFTER_CLOSE') {
        console.log(chalk.yellow('\n\n👋 Bye!\n'));
        rl.close();
        process.exit(0);
      }
      throw error;
    }
    console.log();
    
    try {
      switch (choice.trim()) {
        case '1':
          await start(env);
          break;
        case '2':
          await stop(env);
          break;
        case '3':
          await off(env);
          break;
        case '4': {
          const logChoice = await rl.question(chalk.cyan('Logs for [api/web]: '));
          if (logChoice === 'api' || logChoice === 'web') {
            await logs(logChoice);
          } else {
            console.log(chalk.yellow('Invalid choice. Use "api" or "web"\n'));
          }
          await rl.question(chalk.dim('Press Enter to continue...'));
          break;
        }
        case '5':
          await showLinks(env);
          await rl.question(chalk.dim('Press Enter to continue...'));
          break;
        case '6':
          await diagnose(env);
          await rl.question(chalk.dim('Press Enter to continue...'));
          break;
        case '7':
          await showCaddyLogs(50);
          await rl.question(chalk.dim('Press Enter to continue...'));
          break;
        case '8':
          // Just loop to refresh
          break;
        case '0':
        case '':
          console.log(chalk.yellow('Goodbye! 👋\n'));
          rl.close();
          process.exit(0);
          break;
        default:
          console.log(chalk.red('Invalid choice\n'));
          await rl.question(chalk.dim('Press Enter to continue...'));
      }
    } catch (error: any) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      await rl.question(chalk.dim('Press Enter to continue...'));
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();
  const env: EnvironmentName = 'staging'; // For now, always staging

  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║         🎮 Infrastructure Control                     ║'));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════╝\n'));

    try {
      switch (command) {
      case 'start':
      case 'on':
        await start(env);
        break;
      case 'stop':
        await stop(env);
        break;
      case 'off':
        await off(env);
        break;
      case 'status': {
        const status = await getStatus(env);
        displayStatus(status, env);
        break;
      }
      case 'logs': {
        const service = args[1] as 'api' | 'web' | undefined;
        if (!service || (service !== 'api' && service !== 'web')) {
          console.log(chalk.yellow('Usage: pnpm infra:ctl logs [api|web]\n'));
          process.exit(1);
        }
        const lines = parseInt(args[2]) || 50;
        await logs(service, lines);
        break;
      }
      case 'links':
      case 'dashboards':
        await showLinks(env);
        break;
      case 'diagnose':
      case 'diag':
      case 'check':
        await diagnose(env);
        break;
      case 'caddy-logs':
      case 'caddy':
        const lines = parseInt(args[1]) || 50;
        await showCaddyLogs(lines);
        break;
      case 'help':
      case '--help':
      case '-h':
        console.log(chalk.white('Usage: pnpm infra:ctl [command]\n'));
        console.log(chalk.white('Commands:'));
        console.log(chalk.white('  start        🟢 Start service (scale=1, lambda=on)'));
        console.log(chalk.white('  on           🟢 Alias for "start"'));
        console.log(chalk.white('  stop         🟡 Scale-to-zero mode (scale=0, lambda=on)'));
        console.log(chalk.white('  off          🔴 Complete shutdown (scale=0, lambda=off)'));
        console.log(chalk.white('  status       📊 Show current status'));
        console.log(chalk.white('  logs         📜 View logs: logs [api|web] [lines]'));
        console.log(chalk.white('  links        🔗 Show AWS Console links'));
        console.log(chalk.white('  diagnose     🔍 Run diagnostic report'));
        console.log(chalk.white('  caddy-logs   📋 View Caddy logs: caddy-logs [lines]'));
        console.log(chalk.white('  [none]       🎮 Interactive mode\n'));
        break;
      default:
        // Interactive mode
        await interactiveMode(env);
    }
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
    if (error.stack) {
      console.error(chalk.dim(error.stack));
    }
    process.exit(1);
  }

  rl.close();
}

main();
