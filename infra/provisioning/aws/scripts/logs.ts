#!/usr/bin/env tsx
/**
 * AWS CloudWatch Logs CLI
 * 
 * Interactive CLI to view CloudWatch logs for ECS services
 * 
 * Usage:
 *   pnpm logs                    # Show recent logs for all services
 *   pnpm logs api                # Show recent logs for API service
 *   pnpm logs web                # Show recent logs for Web service
 *   pnpm logs api --follow       # Stream logs for API service
 *   pnpm logs web --follow       # Stream logs for Web service
 *   pnpm logs --follow           # Stream logs for all services
 */

import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { execSync } from 'node:child_process';
import chalk from 'chalk';
import {
  CloudWatchLogsClient,
  DescribeLogStreamsCommand,
  GetLogEventsCommand,
  OrderBy,
} from '@aws-sdk/client-cloudwatch-logs';
import { AWS_CONFIG } from '../constants.js';

const rl = createInterface({ input, output });

// Initialize AWS clients
const logsClient = new CloudWatchLogsClient({ region: AWS_CONFIG.region });

// ═══════════════════════════════════════════════════════════════════════════════
// LOG GROUP CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const LOG_GROUPS = {
  api: '/ecs/city-guided-api',
  web: '/ecs/city-guided-web',
} as const;

type ServiceName = keyof typeof LOG_GROUPS;

// ═══════════════════════════════════════════════════════════════════════════════
// GET LOG STREAMS
// ═══════════════════════════════════════════════════════════════════════════════

async function getLatestLogStream(logGroupName: string): Promise<string | null> {
  try {
    const response = await logsClient.send(
      new DescribeLogStreamsCommand({
        logGroupName,
        orderBy: OrderBy.LastEventTime,
        descending: true,
        limit: 1,
      })
    );

    const stream = response.logStreams?.[0];
    return stream?.logStreamName || null;
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      return null;
    }
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET LOG EVENTS
// ═══════════════════════════════════════════════════════════════════════════════

async function getLogEvents(
  logGroupName: string,
  limit: number = 50
): Promise<Array<{ timestamp: number; message: string }>> {
  try {
    const logStreamName = await getLatestLogStream(logGroupName);
    
    if (!logStreamName) {
      return [];
    }

    const response = await logsClient.send(
      new GetLogEventsCommand({
        logGroupName,
        logStreamName,
        limit,
        startFromHead: false, // Get most recent events first
      })
    );

    const events = (response.events || []).map((event) => ({
      timestamp: event.timestamp || 0,
      message: event.message || '',
    }));

    // Reverse to show oldest first (chronological order)
    return events.reverse();
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      return [];
    }
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISPLAY LOGS
// ═══════════════════════════════════════════════════════════════════════════════

function displayLogs(
  serviceName: ServiceName,
  events: Array<{ timestamp: number; message: string }>
): void {
  const logGroupName = LOG_GROUPS[serviceName];
  
  if (events.length === 0) {
    console.log(chalk.yellow(`   ⚠ No logs found for ${serviceName} (${logGroupName})`));
    return;
  }

  console.log(chalk.cyan(`\n📋 ${serviceName.toUpperCase()} Logs (${logGroupName})`));
  console.log(chalk.dim(`   Last ${events.length} lines:\n`));

  events.forEach((event) => {
    const timestamp = new Date(event.timestamp).toISOString();
    const timeStr = timestamp.replace('T', ' ').substring(0, 19);
    console.log(chalk.dim(`[${timeStr}]`), event.message.trim());
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// STREAM LOGS (REAL-TIME)
// ═══════════════════════════════════════════════════════════════════════════════

function streamLogs(serviceName: ServiceName | 'all'): void {
  const logGroups = serviceName === 'all' 
    ? Object.values(LOG_GROUPS)
    : [LOG_GROUPS[serviceName]];

  console.log(chalk.cyan(`\n📡 Streaming logs (Press Ctrl+C to stop)...\n`));

  for (const logGroupName of logGroups) {
    const service = Object.entries(LOG_GROUPS).find(([, group]) => group === logGroupName)?.[0] || 'unknown';
    console.log(chalk.blue(`   Streaming ${service} logs from ${logGroupName}...`));
  }

  console.log('');


  // Use AWS CLI for tailing (more reliable for real-time streaming)
  // AWS SDK doesn't have a direct equivalent to `aws logs tail --follow`
  try {
    if (serviceName === 'all') {
      // Stream both services
      // Note: This will show logs from both services interleaved
      const command = `aws logs tail ${LOG_GROUPS.api} --follow --region ${AWS_CONFIG.region} & aws logs tail ${LOG_GROUPS.web} --follow --region ${AWS_CONFIG.region}`;
      execSync(command, { stdio: 'inherit' });
    } else {
      const logGroupName = LOG_GROUPS[serviceName];
      execSync(
        `aws logs tail ${logGroupName} --follow --region ${AWS_CONFIG.region}`,
        { stdio: 'inherit' }
      );
    }
  } catch (error: any) {
    if (error.signal === 'SIGINT') {
      console.log(chalk.yellow('\n\n⚠️  Streaming stopped by user'));
      process.exit(0);
    } else {
      console.error(chalk.red(`\n❌ Error streaming logs: ${error.message}`));
      process.exit(1);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const serviceArg = args.find(arg => arg !== '--follow' && arg !== '-f') as ServiceName | 'all' | undefined;
  const follow = args.includes('--follow') || args.includes('-f');
  
  const service: ServiceName | 'all' = serviceArg || 'all';

  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan(`║         📋 CloudWatch Logs Viewer                       ║`));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════╝\n'));

  console.log(chalk.cyan(`Region:  ${AWS_CONFIG.region}`));
  console.log(chalk.cyan(`Service: ${service === 'all' ? 'all' : service}\n`));

  // Stream mode
  if (follow) {
    streamLogs(service);
    return;
  }

  // Get recent logs
  if (service === 'all') {
    // Get logs for both services
    const apiEvents = await getLogEvents(LOG_GROUPS.api);
    const webEvents = await getLogEvents(LOG_GROUPS.web);

    displayLogs('api', apiEvents);
    displayLogs('web', webEvents);
  } else {
    const logGroupName = LOG_GROUPS[service];
    const events = await getLogEvents(logGroupName);
    displayLogs(service, events);
  }

  console.log(chalk.cyan('\n💡 Tip: Use --follow to stream logs in real-time'));
  console.log(chalk.dim('   Example: pnpm logs api --follow\n'));

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
