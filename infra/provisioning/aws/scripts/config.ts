#!/usr/bin/env tsx
/**
 * Configuration Management Script
 *
 * Unified script for managing AWS SSM Parameter Store configuration.
 * Supports: get, push, diff operations.
 *
 * Usage:
 *   pnpm config get staging    # Show deployed SSM parameters
 *   pnpm config push staging    # Update SSM from .env file
 *   pnpm config diff staging    # Compare local .env vs SSM
 */

import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import chalk from 'chalk';
import {
  AWS_CONFIG,
  ENVIRONMENTS,
  isSecret,
  getSsmPath,
  getEnvFilePath,
  type EnvironmentName,
} from '../constants.js';
import { loadMergedEnv } from './env-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..', '..', '..');

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function execSilent(command: string): string {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: projectRoot
    }).trim();
  } catch (error: any) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

// Env loading: loadMergedEnv from env-loader.js (applicatif + .env.aws.<env>)

// ═══════════════════════════════════════════════════════════════════════════════
// AWS SSM PARAMETER STORE
// ═══════════════════════════════════════════════════════════════════════════════

interface SsmParameter {
  name: string;
  type: string;
  value: string;
}

function getSsmParameters(env: EnvironmentName): SsmParameter[] {
  const ssmPath = getSsmPath(env);

  try {
    const output = execSilent(
      `aws ssm get-parameters-by-path \
        --path "${ssmPath}" \
        --region ${AWS_CONFIG.region} \
        --recursive \
        --query 'Parameters[*].[Name,Type,Value]' \
        --output text`
    );

    if (!output || output.trim() === '') {
      return [];
    }

    const params: SsmParameter[] = [];
    const lines = output.trim().split('\n');

    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length >= 3) {
        params.push({
          name: parts[0],
          type: parts[1],
          value: parts[2]
        });
      }
    }

    return params;
  } catch {
    return [];
  }
}

function putSsmParameter(name: string, value: string, isSecure: boolean): void {
  const type = isSecure ? 'SecureString' : 'String';

  try {
    execSilent(
      `aws ssm put-parameter --name "${name}" --value "${value}" --type ${type} --overwrite --region ${AWS_CONFIG.region}`
    );
  } catch (error: any) {
    console.error(chalk.red(`   ❌ Failed to set ${name}: ${error.message}`));
  }
}

async function updateSsmParameters(env: EnvironmentName, envVars: Record<string, string>): Promise<number> {
  const ssmPath = getSsmPath(env);

  console.log(chalk.blue(`\n📦 Updating SSM Parameters: ${ssmPath}/*`));

  const variables: string[] = [];
  const secrets: string[] = [];
  let count = 0;

  for (const [key, value] of Object.entries(envVars)) {
    if (value === '' || value === undefined) {
      console.log(chalk.yellow(`   ⊘ Skipping ${key} (empty)`));
      continue;
    }

    const paramName = `${ssmPath}/${key}`;
    const secure = isSecret(key);

    console.log(chalk.gray(`   → ${key} (${secure ? 'secret' : 'plain'})`));

    putSsmParameter(paramName, value, secure);

    if (secure) {
      secrets.push(key);
    } else {
      variables.push(key);
    }
    count++;
  }

  console.log(chalk.green(`✓ ${count} parameters updated in SSM`));
  console.log(chalk.dim(`   Variables: ${variables.length}`));
  console.log(chalk.dim(`   Secrets: ${secrets.length} (encrypted)`));

  return count;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMAND: GET
// ═══════════════════════════════════════════════════════════════════════════════

function cmdGet(env: EnvironmentName): void {
  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan(`║         📄 Deployed Config: ${env.toUpperCase()}              `));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════╝\n'));

  const ssmPath = getSsmPath(env);
  console.log(chalk.blue(`🔍 SSM Path: ${ssmPath}/*\n`));

  const params = getSsmParameters(env);

  if (params.length === 0) {
    console.log(chalk.red('❌ No parameters found in SSM'));
    console.log(chalk.yellow('   Run: pnpm provision staging'));
    console.log(chalk.yellow('   Or:  pnpm config push staging'));
    process.exit(1);
  }

  const secretCount = params.filter(p => p.type === 'SecureString').length;
  const varCount = params.length - secretCount;

  console.log(chalk.cyan('📊 Summary:'));
  console.log(chalk.white(`   Total: ${params.length} parameters`));
  console.log(chalk.white(`   Variables: ${varCount}`));
  console.log(chalk.white(`   Secrets: ${secretCount} (encrypted)\n`));

  console.log(chalk.cyan('📋 Parameters:'));
  for (const param of params) {
    const paramName = param.name.replace(`${ssmPath}/`, '');
    if (param.type === 'SecureString') {
      console.log(chalk.white(`   🔒 ${paramName} = ***ENCRYPTED***`));
    } else {
      const value = param.value.length > 50 ? `${param.value.substring(0, 47)}...` : param.value;
      console.log(chalk.white(`   📄 ${paramName} = ${value}`));
    }
  }

  console.log(chalk.green('\n✅ Config retrieved successfully\n'));
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMAND: PUSH
// ═══════════════════════════════════════════════════════════════════════════════

async function cmdPush(env: EnvironmentName): Promise<void> {
  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan(`║         🚀 Push Config: ${env.toUpperCase()}                  `));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════╝\n'));

  const envFilePath = join(projectRoot, getEnvFilePath(env));
  const ssmPath = getSsmPath(env);

  console.log(chalk.blue(`📤 Source: ${envFilePath}`));
  console.log(chalk.blue(`📥 Target: ${ssmPath}/*\n`));

  // Load environment variables (applicatif + provider AWS merged)
  const envVars = loadMergedEnv(env);
  console.log(chalk.white(`Environment: ${env}`));
  console.log(chalk.white(`Variables: ${Object.keys(envVars).length}\n`));

  // Update SSM parameters
  const paramCount = await updateSsmParameters(env, envVars);

  // ECS will pick up new environment variables on next deployment
  console.log(chalk.blue('\n💡 Environment variables will be applied on next deployment'));
  console.log(chalk.gray('   Run: pnpm deploy staging --tag <tag> to deploy with new config'));

  console.log(chalk.cyan('\n✨ Configuration update complete!'));
  console.log(chalk.white(`Updated ${paramCount} parameters`));
  console.log(chalk.white(`Environment: ${env}`));
  console.log(chalk.white(`SSM Path: ${ssmPath}/*\n`));
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMAND: DIFF
// ═══════════════════════════════════════════════════════════════════════════════

function cmdDiff(env: EnvironmentName): void {
  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan(`║         🔍 Config Diff: ${env.toUpperCase()}                  `));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════╝\n'));

  const envFilePath = join(projectRoot, getEnvFilePath(env));
  const ssmPath = getSsmPath(env);

  console.log(chalk.blue('📊 Comparing:'));
  console.log(chalk.white(`   Local:  ${envFilePath}`));
  console.log(chalk.white(`   Remote: ${ssmPath}/*\n`));

  // Load local .env (applicatif + provider AWS merged)
  let localVars: Record<string, string>;
  try {
    localVars = loadMergedEnv(env);
  } catch {
    console.error(chalk.red(`❌ Environment file not found: ${envFilePath}`));
    process.exit(1);
  }

  // Get SSM parameters
  const ssmParams = getSsmParameters(env);
  if (ssmParams.length === 0) {
    console.error(chalk.red('❌ No parameters found in SSM'));
    console.log(chalk.yellow('   Run: pnpm provision staging'));
    process.exit(1);
  }

  // Convert SSM params to object
  const remoteVars: Record<string, string> = {};
  for (const param of ssmParams) {
    const key = param.name.replace(`${ssmPath}/`, '');
    remoteVars[key] = param.value;
  }

  // Compare
  const localKeys = new Set(Object.keys(localVars));
  const remoteKeys = new Set(Object.keys(remoteVars));

  const onlyLocal: string[] = [];
  const onlyRemote: string[] = [];
  const different: string[] = [];

  for (const key of localKeys) {
    if (!remoteKeys.has(key)) {
      onlyLocal.push(key);
    } else if (localVars[key] !== remoteVars[key]) {
      different.push(key);
    }
  }

  for (const key of remoteKeys) {
    if (!localKeys.has(key)) {
      onlyRemote.push(key);
    }
  }

  if (onlyLocal.length === 0 && onlyRemote.length === 0 && different.length === 0) {
    console.log(chalk.green('✅ Configurations are identical\n'));
    return;
  }

  console.log(chalk.yellow('⚠️  Differences found:\n'));

  if (onlyLocal.length > 0) {
    console.log(chalk.cyan('📝 Only in local:'));
    for (const key of onlyLocal.sort()) {
      console.log(chalk.white(`   + ${key} = ${localVars[key]}`));
    }
    console.log('');
  }

  if (onlyRemote.length > 0) {
    console.log(chalk.cyan('📝 Only in remote:'));
    for (const key of onlyRemote.sort()) {
      console.log(chalk.white(`   - ${key} = ${remoteVars[key]}`));
    }
    console.log('');
  }

  if (different.length > 0) {
    console.log(chalk.cyan('📝 Different values:'));
    for (const key of different.sort()) {
      console.log(chalk.white(`   ~ ${key}:`));
      console.log(chalk.red(`     - ${remoteVars[key]}`));
      console.log(chalk.green(`     + ${localVars[key]}`));
    }
    console.log('');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] as 'get' | 'push' | 'diff';
  const env = args[1] as EnvironmentName;

  if (!command || !['get', 'push', 'diff'].includes(command)) {
    console.error(chalk.red('Usage: pnpm config <command> <environment>'));
    console.error(chalk.red('Commands: get, push, diff'));
    console.error(chalk.red('Valid environments:'), Object.keys(ENVIRONMENTS).join(', '));
    process.exit(1);
  }

  if (!env || !ENVIRONMENTS[env]) {
    console.error(chalk.red(`Invalid environment: ${env}`));
    console.error(chalk.red('Valid environments:'), Object.keys(ENVIRONMENTS).join(', '));
    process.exit(1);
  }

  try {
    if (command === 'get') {
      cmdGet(env);
    } else if (command === 'push') {
      await cmdPush(env);
    } else if (command === 'diff') {
      cmdDiff(env);
    }
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Command failed: ${error.message}\n`));
    process.exit(1);
  }
}

main();
