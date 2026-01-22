#!/usr/bin/env tsx
/**
 * Update Lambda Functions Code
 * 
 * Updates Lambda functions code without full CloudFormation deployment.
 * Much faster than CDK deploy (30s vs 3-4min) and zero downtime.
 * 
 * Usage:
 *   pnpm update-lambdas staging
 *   pnpm update-lambdas staging --dry-run
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { LambdaClient, UpdateFunctionCodeCommand, GetFunctionCommand } from '@aws-sdk/client-lambda';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import chalk from 'chalk';
import { getEnvironmentConfig, type EnvironmentName, AWS_CONFIG } from '../constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const AWS_REGION = AWS_CONFIG.region;
const lambdaClient = new LambdaClient({ region: AWS_REGION });
const cfnClient = new CloudFormationClient({ region: AWS_REGION });

async function main() {
  const args = process.argv.slice(2);
  const env = (args[0] as EnvironmentName) || 'staging';
  const dryRun = args.includes('--dry-run');

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n👋 Cancelled.\n'));
    process.exit(0);
  });

  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║      ⚡ Update Lambda Functions                        ║'));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════╝\n'));

  console.log(chalk.cyan(`Environment: ${env}`));
  console.log(chalk.cyan(`Region:      ${AWS_REGION}`));
  console.log(chalk.cyan(`Dry run:     ${dryRun ? 'Yes' : 'No'}\n`));

  const config = getEnvironmentConfig(env);

  // Get Lambda ARNs from CloudFormation
  console.log(chalk.blue('📦 Loading Lambda ARNs from CloudFormation...'));
  const stackResponse = await cfnClient.send(
    new DescribeStacksCommand({
      StackName: config.STACK_NAME,
    })
  );

  const outputs = stackResponse.Stacks?.[0]?.Outputs || [];
  const scaleUpLambdaArn = outputs.find(o => o.OutputKey === 'ScaleUpLambdaArn')?.OutputValue;
  const scaleToZeroLambdaArn = outputs.find(o => o.OutputKey === 'ScaleToZeroLambdaArn')?.OutputValue;

  if (!scaleUpLambdaArn || !scaleToZeroLambdaArn) {
    console.error(chalk.red('❌ Lambda ARNs not found in CloudFormation outputs'));
    console.error(chalk.yellow('   Run `pnpm provision` first to create the Lambdas'));
    process.exit(1);
  }

  const scaleUpFunctionName = scaleUpLambdaArn.split(':').pop()!;
  const scaleToZeroFunctionName = scaleToZeroLambdaArn.split(':').pop()!;

  console.log(chalk.green(`✓ Found Lambdas:`));
  console.log(chalk.dim(`   Scale-Up:      ${scaleUpFunctionName}`));
  console.log(chalk.dim(`   Scale-To-Zero: ${scaleToZeroFunctionName}\n`));

  // Build and update each Lambda
  const lambdas = [
    { name: scaleUpFunctionName, dir: 'scale-up' },
    { name: scaleToZeroFunctionName, dir: 'scale-to-zero' },
  ];

  for (const lambda of lambdas) {
    await buildAndUpdateLambda(lambda.name, lambda.dir, dryRun);
  }

  console.log(chalk.green.bold('\n✅ Lambda functions updated successfully!\n'));
  console.log(chalk.white('Next steps:'));
  console.log(chalk.white('  • Test: pnpm infra:status'));
  console.log(chalk.white('  • Verify: Check CloudWatch logs for any errors\n'));
}

async function buildAndUpdateLambda(
  functionName: string,
  sourceDir: string,
  dryRun: boolean
): Promise<void> {
  console.log(chalk.blue(`\n🔨 Building ${sourceDir}...`));

  const lambdaPath = join(__dirname, '../lambdas', sourceDir);
  const distPath = join(lambdaPath, 'dist');
  const zipPath = join(__dirname, `../tmp/${sourceDir}.zip`);

  // Create tmp directory
  const tmpDir = join(__dirname, '../tmp');
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true });
  }

  try {
    // Build TypeScript
    console.log(chalk.dim('   Installing dependencies...'));
    execSync('npm install', { cwd: lambdaPath, stdio: 'pipe' });

    console.log(chalk.dim('   Building TypeScript...'));
    execSync('npm run build', { cwd: lambdaPath, stdio: 'pipe' });

    // Create deployment package
    console.log(chalk.dim('   Creating deployment package...'));
    
    // Clean previous zip
    if (existsSync(zipPath)) {
      rmSync(zipPath);
    }

    // Create zip with dependencies and compiled code
    const zipCommand = [
      'cd',
      lambdaPath,
      '&&',
      'zip',
      '-r',
      zipPath,
      'node_modules/',
      'package.json',
      '&&',
      'cd',
      distPath,
      '&&',
      'zip',
      '-j',
      zipPath,
      'index.js'
    ].join(' ');

    execSync(zipCommand, { stdio: 'pipe' });

    console.log(chalk.green(`✓ Built ${sourceDir}`));

    if (dryRun) {
      console.log(chalk.yellow(`   [DRY RUN] Would update Lambda: ${functionName}`));
      return;
    }

    // Update Lambda code
    console.log(chalk.blue(`📤 Uploading to Lambda: ${functionName}...`));
    
    const zipContent = readFileSync(zipPath);
    
    await lambdaClient.send(
      new UpdateFunctionCodeCommand({
        FunctionName: functionName,
        ZipFile: zipContent,
      })
    );

    // Wait for update to complete
    console.log(chalk.dim('   Waiting for update to complete...'));
    let status = 'InProgress';
    let attempts = 0;
    const maxAttempts = 30;

    while (status === 'InProgress' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await lambdaClient.send(
        new GetFunctionCommand({
          FunctionName: functionName,
        })
      );
      
      status = response.Configuration?.LastUpdateStatus || 'Unknown';
      attempts++;
    }

    if (status === 'Successful') {
      console.log(chalk.green(`✓ Updated ${functionName} successfully`));
    } else if (status === 'InProgress') {
      console.log(chalk.yellow(`⚠ Update still in progress (timeout), check Lambda console`));
    } else {
      console.log(chalk.red(`❌ Update failed with status: ${status}`));
    }

  } catch (error: any) {
    console.error(chalk.red(`❌ Failed to update ${sourceDir}:`));
    console.error(chalk.dim(error.message));
    throw error;
  } finally {
    // Cleanup
    if (existsSync(zipPath)) {
      rmSync(zipPath);
    }
  }
}

main().catch((error) => {
  console.error(chalk.red('\n❌ Error:'), error.message);
  process.exit(1);
});
