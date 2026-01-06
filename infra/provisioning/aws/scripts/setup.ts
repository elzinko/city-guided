#!/usr/bin/env tsx
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import chalk from 'chalk';

const rl = createInterface({ input, output });

function runScript(script: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', script], {
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script failed with code ${code}`));
      }
    });
  });
}

async function main() {
  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║  🚀 City-Guided AWS Staging Setup Wizard     ║'));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════════╝\n'));

  console.log(chalk.white('This wizard will:\n'));
  console.log(chalk.green('  ✓ Provision AWS EC2 Spot instance (t3.medium)'));
  console.log(chalk.green('  ✓ Configure Security Groups & Elastic IP'));
  console.log(chalk.green('  ✓ Setup DuckDNS for free HTTPS domain'));
  console.log(chalk.green('  ✓ Configure GitHub Secrets & Environment'));
  console.log(chalk.green('  ✓ Enable CI/CD with GitHub Actions\n'));

  console.log(chalk.cyan('💰 Estimated cost:'));
  console.log(chalk.white('  • EC2 Spot t3.medium: ~$9/month (with sleep/wake)'));
  console.log(chalk.white('  • Elastic IP: Free (when attached)'));
  console.log(chalk.white('  • DuckDNS: Free'));
  console.log(chalk.white('  • Total: ~$9-12/month\n'));

  console.log(chalk.yellow('Prerequisites:'));
  console.log(chalk.white('  • AWS CLI installed and configured'));
  console.log(chalk.white('  • AWS account with EC2 permissions'));
  console.log(chalk.white('  • GitHub account with repo access'));
  console.log(chalk.white('  • Node.js 20+ and pnpm\n'));

  const proceed = await rl.question(chalk.cyan('Ready to proceed? (y/n): '));

  if (proceed.trim().toLowerCase() !== 'y') {
    console.log(chalk.yellow('\nSetup cancelled.'));
    rl.close();
    process.exit(0);
  }

  // Close readline before spawning child processes
  rl.close();

  try {
    // Step 1: Provision Infrastructure
    console.log(chalk.bold.blue('\n\n━━━ Step 1/2: Infrastructure Provisioning ━━━\n'));
    await runScript('provision:infra');

    // Step 2: Configure CICD
    console.log(chalk.bold.blue('\n\n━━━ Step 2/2: CICD Configuration ━━━\n'));
    await runScript('provision:cicd');

    console.log(chalk.bold.green('\n\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.bold.green('║     ✨ Setup Complete Successfully! ✨        ║'));
    console.log(chalk.bold.green('╚════════════════════════════════════════════════╝\n'));

    console.log(chalk.cyan('🎉 Your AWS staging environment is ready!\n'));

    console.log(chalk.white('📍 What happens next:\n'));
    console.log(chalk.green('  1. Push code to main branch'));
    console.log(chalk.green('  2. GitHub Actions builds Docker images'));
    console.log(chalk.green('  3. Deploys to EC2 Spot instance'));
    console.log(chalk.green('  4. Updates DuckDNS with current IP'));
    console.log(chalk.green('  5. Instance auto-sleeps after 5min inactivity\n'));

    console.log(chalk.cyan('📊 Monitoring:'));
    console.log(chalk.white(`  • GitHub Actions: https://github.com/${process.env.GITHUB_OWNER || 'elzinko'}/city-guided/actions`));
    console.log(chalk.white('  • AWS Console: https://console.aws.amazon.com/ec2'));
    console.log(chalk.white('  • DuckDNS: https://www.duckdns.org\n'));

  } catch (error: any) {
    console.error(chalk.red(`\n❌ Setup failed: ${error.message}\n`));
    process.exit(1);
  }
}

main();
