#!/usr/bin/env tsx
/**
 * AWS Infrastructure Status CLI
 * 
 * Interactive CLI to check infrastructure status using AWS SDK
 * 
 * Usage:
 *   pnpm status
 *   pnpm status staging
 *   pnpm status staging ecs
 */

import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { execSync } from 'node:child_process';
import chalk from 'chalk';
import {
  ECSClient,
  DescribeServicesCommand,
  ListTasksCommand,
  UpdateServiceCommand,
} from '@aws-sdk/client-ecs';
import {
  EC2Client,
  DescribeInstancesCommand,
  StartInstancesCommand,
  StopInstancesCommand,
} from '@aws-sdk/client-ec2';
import {
  CloudFormationClient,
  DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation';
import {
  ElasticLoadBalancingV2Client,
  DescribeLoadBalancersCommand,
  DescribeTargetGroupsCommand,
  DescribeTargetHealthCommand,
} from '@aws-sdk/client-elastic-load-balancing-v2';
import {
  CloudWatchLogsClient,
  GetLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import {
  AWS_CONFIG,
  getEnvironmentConfig,
  type EnvironmentName,
} from '../constants.js';

const rl = createInterface({ input, output });

// Initialize AWS clients
const ecsClient = new ECSClient({ region: AWS_CONFIG.region });
const ec2Client = new EC2Client({ region: AWS_CONFIG.region });
const cfClient = new CloudFormationClient({ region: AWS_CONFIG.region });
const elbClient = new ElasticLoadBalancingV2Client({ region: AWS_CONFIG.region });
const logsClient = new CloudWatchLogsClient({ region: AWS_CONFIG.region });

// ═══════════════════════════════════════════════════════════════════════════════
// ECS STATUS
// ═══════════════════════════════════════════════════════════════════════════════

async function getECSStatus() {
  const clusterName = 'city-guided-cluster';
  const serviceName = 'city-guided-service';

  try {
    // Get service info
    const serviceResponse = await ecsClient.send(
      new DescribeServicesCommand({
        cluster: clusterName,
        services: [serviceName],
      })
    );

    const service = serviceResponse.services?.[0];
    if (!service) {
      return null;
    }

    // Get running tasks
    const tasksResponse = await ecsClient.send(
      new ListTasksCommand({
        cluster: clusterName,
        serviceName: serviceName,
        desiredStatus: 'RUNNING',
      })
    );

    const taskCount = tasksResponse.taskArns?.length || 0;

    // Get ALB DNS
    let albDns = 'N/A';
    try {
      const albResponse = await elbClient.send(
        new DescribeLoadBalancersCommand({
          Names: ['city-guided-alb'],
        })
      );
      albDns = albResponse.LoadBalancers?.[0]?.DNSName || 'N/A';
    } catch {
      // ALB might not exist
    }

    return {
      cluster: clusterName,
      service: serviceName,
      status: service.status || 'UNKNOWN',
      desiredCount: service.desiredCount || 0,
      runningCount: service.runningCount || 0,
      taskCount,
      albDns,
    };
  } catch (error: any) {
    if (error.name === 'ClusterNotFoundException' || error.name === 'ServiceNotFoundException') {
      return null;
    }
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EC2 STATUS
// ═══════════════════════════════════════════════════════════════════════════════

async function getEC2Status(env: EnvironmentName) {
  const config = getEnvironmentConfig(env);

  try {
    // Get stack outputs
    const stackResponse = await cfClient.send(
      new DescribeStacksCommand({
        StackName: config.STACK_NAME,
      })
    );

    const stack = stackResponse.Stacks?.[0];
    if (!stack) {
      return null;
    }

    const outputs = stack.Outputs || [];
    const instanceId = outputs.find((o) => o.OutputKey === 'InstanceId')?.OutputValue;
    const publicIp = outputs.find((o) => o.OutputKey === 'PublicIP')?.OutputValue;

    if (!instanceId) {
      return null;
    }

    // Get instance state
    const instancesResponse = await ec2Client.send(
      new DescribeInstancesCommand({
        InstanceIds: [instanceId],
      })
    );

    const instance = instancesResponse.Reservations?.[0]?.Instances?.[0];
    const state = instance?.State?.Name || 'UNKNOWN';

    return {
      stackName: config.STACK_NAME,
      instanceId,
      publicIp: publicIp || 'N/A',
      state,
    };
  } catch (error: any) {
    if (error.name === 'ValidationError' || error.name === 'StackNotFoundException') {
      return null;
    }
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISPLAY
// ═══════════════════════════════════════════════════════════════════════════════

function displayECSStatus(ecsStatus: any) {
  if (!ecsStatus) {
    console.log(chalk.red('   ✗ ECS infrastructure not found'));
    return;
  }

  const statusColor = ecsStatus.status === 'ACTIVE' ? chalk.green : chalk.yellow;
  const countColor = ecsStatus.desiredCount > 0 ? chalk.green : chalk.yellow;

  console.log(chalk.cyan('\n📦 ECS Service'));
  console.log(chalk.white(`   Cluster:     ${ecsStatus.cluster}`));
  console.log(chalk.white(`   Service:     ${ecsStatus.service}`));
  console.log(statusColor(`   Status:      ${ecsStatus.status}`));
  console.log(countColor(`   Desired:     ${ecsStatus.desiredCount}`));
  console.log(countColor(`   Running:     ${ecsStatus.runningCount}`));
  console.log(countColor(`   Tasks:       ${ecsStatus.taskCount}`));
  console.log(chalk.white(`   ALB DNS:     ${ecsStatus.albDns}`));

  if (ecsStatus.desiredCount === 0) {
    console.log(chalk.yellow('\n   ⚠ Service is scaled to zero'));
  }
}

function displayEC2Status(ec2Status: any) {
  if (!ec2Status) {
    console.log(chalk.red('   ✗ EC2 infrastructure not found'));
    return;
  }

  const stateColor =
    ec2Status.state === 'running'
      ? chalk.green
      : ec2Status.state === 'stopped'
      ? chalk.yellow
      : chalk.red;

  console.log(chalk.cyan('\n🖥️  EC2 Instance'));
  console.log(chalk.white(`   Stack:       ${ec2Status.stackName}`));
  console.log(chalk.white(`   Instance ID: ${ec2Status.instanceId}`));
  console.log(chalk.white(`   Public IP:   ${ec2Status.publicIp}`));
  console.log(stateColor(`   State:       ${ec2Status.state}`));

  if (ec2Status.state === 'stopped') {
    console.log(chalk.yellow('\n   ⚠ Instance is stopped'));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function scaleECSService(desiredCount: number) {
  try {
    await ecsClient.send(
      new UpdateServiceCommand({
        cluster: 'city-guided-cluster',
        service: 'city-guided-service',
        desiredCount,
      })
    );
    return true;
  } catch (error: any) {
    console.error(chalk.red(`   ❌ Error: ${error.message}`));
    return false;
  }
}

async function controlEC2Instance(instanceId: string, action: 'start' | 'stop') {
  try {
    if (action === 'start') {
      await ec2Client.send(
        new StartInstancesCommand({
          InstanceIds: [instanceId],
        })
      );
    } else {
      await ec2Client.send(
        new StopInstancesCommand({
          InstanceIds: [instanceId],
        })
      );
    }
    return true;
  } catch (error: any) {
    console.error(chalk.red(`   ❌ Error: ${error.message}`));
    return false;
  }
}

async function getTargetHealth() {
  try {
    // Get target group ARN
    const tgResponse = await elbClient.send(
      new DescribeTargetGroupsCommand({
        Names: ['city-guided-alb'],
      })
    );

    const tgArn = tgResponse.TargetGroups?.[0]?.TargetGroupArn;
    if (!tgArn) {
      console.log(chalk.red('   ✗ Target group not found'));
      return;
    }

    const healthResponse = await elbClient.send(
      new DescribeTargetHealthCommand({
        TargetGroupArn: tgArn,
      })
    );

    console.log(chalk.cyan('\n🎯 Target Health'));
    healthResponse.TargetHealthDescriptions?.forEach((target) => {
      const healthColor =
        target.TargetHealth?.State === 'healthy' ? chalk.green : chalk.red;
      console.log(
        healthColor(
          `   ${target.Target?.Id}: ${target.TargetHealth?.State} (${target.TargetHealth?.Reason || 'N/A'})`
        )
      );
    });
  } catch (error: any) {
    console.error(chalk.red(`   ❌ Error: ${error.message}`));
  }
}

async function viewServiceLogs() {
  try {
    const logGroup = '/ecs/city-guided-web';
    
    // Get recent log events
    const logsResponse = await logsClient.send(
      new GetLogEventsCommand({
        logGroupName: logGroup,
        limit: 50,
        startFromHead: false,
      })
    );

    console.log(chalk.cyan(`\n📋 Service Logs (${logGroup})`));
    console.log(chalk.dim('   Last 50 lines:\n'));
    
    logsResponse.events?.reverse().forEach((event) => {
      const timestamp = new Date(event.timestamp || 0).toISOString();
      console.log(chalk.dim(`[${timestamp}]`), event.message);
    });
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      console.log(chalk.yellow(`   ⚠ Log group not found or empty`));
    } else {
      console.error(chalk.red(`   ❌ Error: ${error.message}`));
    }
  }
}

async function showQuickActions(env: EnvironmentName, mode: 'ec2' | 'ecs') {
  console.log(chalk.cyan('\n⚡ Quick Actions'));
  console.log(chalk.dim('   Select an action (or press Enter to exit):\n'));

  if (mode === 'ecs') {
    console.log(chalk.white('   1. Scale service to 1'));
    console.log(chalk.white('   2. Scale service to 0'));
    console.log(chalk.white('   3. View service logs'));
    console.log(chalk.white('   4. View ALB target health'));
    console.log(chalk.white('   5. Open CloudWatch Dashboard'));
  } else {
    console.log(chalk.white('   1. Start EC2 instance'));
    console.log(chalk.white('   2. Stop EC2 instance'));
    console.log(chalk.white('   3. SSH into instance'));
    console.log(chalk.white('   4. View instance logs'));
  }

  console.log(chalk.white('   0. Exit\n'));

  const answer = await rl.question(chalk.yellow('   Choice: '));

  switch (answer.trim()) {
    case '1':
      if (mode === 'ecs') {
        console.log(chalk.blue('\n🚀 Scaling service to 1...'));
        const success = await scaleECSService(1);
        if (success) {
          console.log(chalk.green('✓ Service scaling to 1'));
        }
      } else {
        const ec2Status = await getEC2Status(env);
        if (ec2Status) {
          console.log(chalk.blue(`\n🚀 Starting instance ${ec2Status.instanceId}...`));
          const success = await controlEC2Instance(ec2Status.instanceId, 'start');
          if (success) {
            console.log(chalk.green('✓ Instance starting'));
          }
        }
      }
      break;
    case '2':
      if (mode === 'ecs') {
        console.log(chalk.blue('\n⏸️  Scaling service to 0...'));
        const success = await scaleECSService(0);
        if (success) {
          console.log(chalk.green('✓ Service scaling to 0'));
        }
      } else {
        const ec2Status = await getEC2Status(env);
        if (ec2Status) {
          console.log(chalk.blue(`\n⏸️  Stopping instance ${ec2Status.instanceId}...`));
          const success = await controlEC2Instance(ec2Status.instanceId, 'stop');
          if (success) {
            console.log(chalk.green('✓ Instance stopping'));
          }
        }
      }
      break;
    case '3':
      if (mode === 'ecs') {
        await viewServiceLogs();
      } else {
        console.log(chalk.blue('\n🔐 Connecting via SSM...'));
        const ec2Status = await getEC2Status(env);
        if (ec2Status) {
          // Use SSM Session Manager (still needs AWS CLI for this)
          execSync(
            `aws ssm start-session --target ${ec2Status.instanceId} --region ${AWS_CONFIG.region}`,
            { stdio: 'inherit' }
          );
        }
      }
      break;
    case '4':
      if (mode === 'ecs') {
        await getTargetHealth();
      } else {
        console.log(chalk.yellow('   (Instance logs viewing not yet implemented)'));
      }
      break;
    case '5':
      if (mode === 'ecs') {
        const dashboardUrl = `https://${AWS_CONFIG.region}.console.aws.amazon.com/cloudwatch/home?region=${AWS_CONFIG.region}#dashboards:name=CityGuided-ECS-ScaleToZero`;
        console.log(chalk.blue('\n📊 Opening CloudWatch Dashboard...'));
        console.log(chalk.white(`   ${dashboardUrl}`));
        try {
          execSync(`open "${dashboardUrl}"`);
        } catch {
          console.log(chalk.yellow('   (Copy the URL above and open it manually)'));
        }
      }
      break;
    default:
      break;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const env: EnvironmentName = (args[0] as EnvironmentName) || 'staging';
  const modeArg = args[1] || 'auto';

  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan(`║         🚀 AWS Infrastructure Status                    ║`));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════╝\n'));

  console.log(chalk.cyan(`Environment: ${env}`));
  console.log(chalk.cyan(`Region:      ${AWS_CONFIG.region}\n`));

  // Auto-detect mode or use provided
  let mode: 'ec2' | 'ecs' = 'ec2';
  if (modeArg === 'ecs') {
    mode = 'ecs';
  } else if (modeArg === 'ec2') {
    mode = 'ec2';
  } else {
    // Try to detect
    const ecsStatus = await getECSStatus(env);
    const ec2Status = await getEC2Status(env);

    if (ecsStatus && !ec2Status) {
      mode = 'ecs';
    } else if (ec2Status && !ecsStatus) {
      mode = 'ec2';
    } else if (ecsStatus) {
      mode = 'ecs'; // Prefer ECS if both exist
    }
  }

  console.log(chalk.cyan(`Mode:        ${mode.toUpperCase()}\n`));

  // Display status
  if (mode === 'ecs') {
    const ecsStatus = await getECSStatus(env);
    displayECSStatus(ecsStatus);
  } else {
    const ec2Status = await getEC2Status(env);
    displayEC2Status(ec2Status);
  }

  // Show quick actions
  await showQuickActions(env, mode);

  rl.close();
}

main().catch((error) => {
  console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
  if (error.stack) {
    console.error(chalk.dim(error.stack));
  }
  rl.close();
  process.exit(1);
});
