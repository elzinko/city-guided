#!/usr/bin/env tsx
/**
 * Deploy Script
 *
 * Triggers GitHub Actions workflow to deploy to the specified environment.
 * Builds Docker images and deploys them to AWS.
 *
 * Usage:
 *   pnpm deploy staging
 *   pnpm deploy prod
 */

import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import chalk from 'chalk';
import {
  ENVIRONMENTS,
  type EnvironmentName,
} from '../constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function execSilent(command: string): string {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: __dirname
    }).trim();
  } catch (error: any) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const env = args[0] as EnvironmentName;

  if (!env || !ENVIRONMENTS[env]) {
    console.error(chalk.red('Usage: pnpm deploy <environment>'));
    console.error(chalk.red('Valid environments:'), Object.keys(ENVIRONMENTS).join(', '));
    process.exit(1);
  }

  try {
    console.log(chalk.cyan('🚀 City-Guided Deployment'));
    console.log(chalk.cyan('='.repeat(50)));
    console.log(chalk.white(`Environment: ${env}`));
    console.log(chalk.white(`Workflow: ci.yml`));
    console.log('');

    // Check if gh CLI is available
    try {
      execSilent('gh --version');
    } catch {
      console.error(chalk.red('❌ GitHub CLI (gh) is not installed'));
      console.error(chalk.yellow('   Install it: https://cli.github.com/'));
      console.error(chalk.yellow('   Or use: gh auth login'));
      process.exit(1);
    }

    // Check if authenticated
    try {
      execSilent('gh auth status');
    } catch {
      console.error(chalk.red('❌ Not authenticated with GitHub CLI'));
      console.error(chalk.yellow('   Run: gh auth login'));
      process.exit(1);
    }

    // Build the workflow dispatch command
    // For staging, we use deploy_staging input
    // For other environments, we might need different inputs in the future
    const workflowFile = 'ci.yml';
    const ref = 'main';
    
    let workflowInput = '';
    if (env === 'staging') {
      workflowInput = `-f deploy_staging=true`;
    } else {
      // For future environments (prod, etc.), we might need different inputs
      console.log(chalk.yellow(`⚠️  Deployment for ${env} environment not yet configured in workflow`));
      console.log(chalk.yellow(`   Currently only 'staging' is supported`));
      process.exit(1);
    }

    console.log(chalk.blue(`📤 Triggering GitHub Actions workflow...`));
    console.log(chalk.gray(`   Workflow: ${workflowFile}`));
    console.log(chalk.gray(`   Branch: ${ref}`));
    console.log(chalk.gray(`   Environment: ${env}`));
    console.log('');

    // Trigger the workflow
    const command = `gh workflow run ${workflowFile} --ref ${ref} ${workflowInput}`;
    execSilent(command);

    console.log(chalk.green(`✅ Workflow triggered successfully!`));
    console.log('');
    console.log(chalk.cyan('📋 Next steps:'));
    console.log(chalk.white(`   1. Monitor progress: gh run list --workflow="${workflowFile}"`));
    console.log(chalk.white(`   2. Watch logs: gh run watch`));
    console.log(chalk.white(`   3. View in browser: gh run view --web`));
    console.log('');

  } catch (error: any) {
    console.error(chalk.red(`\n❌ Deployment failed: ${error.message}\n`));
    process.exit(1);
  }
}

main();
