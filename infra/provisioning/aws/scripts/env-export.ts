#!/usr/bin/env tsx
/**
 * Environment Variables Export Script
 * 
 * Exports environment variables from AWS SSM Parameter Store to a .env file
 * in the same format as .env.template, with comparison logs.
 * 
 * Usage:
 *   pnpm env:export staging
 *   pnpm env:export staging --output .env.staging.exported
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import chalk from 'chalk';
import {
  AWS_CONFIG,
  getSsmPath,
  getEnvFilePath,
  type EnvironmentName,
} from '../constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..', '..', '..');

function execSilent(command: string): string {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (error: any) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SSM PARAMETER RETRIEVAL
// ═══════════════════════════════════════════════════════════════════════════════

interface SsmParameter {
  name: string;
  value: string;
  type: string;
}

function getSsmParameters(env: EnvironmentName): SsmParameter[] {
  const ssmPath = getSsmPath(env);

  try {
    const output = execSilent(
      `aws ssm get-parameters-by-path \
        --path "${ssmPath}" \
        --region ${AWS_CONFIG.region} \
        --recursive \
        --with-decryption \
        --query 'Parameters[*].[Name,Value,Type]' \
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
        const fullName = parts[0];
        const key = fullName.replace(`${ssmPath}/`, '');
        // Keep SECRET_ prefix for consistency (same as in .env.staging and SSM)
        // This ensures comparisons between local .env and deployed config are accurate
        const envKey = key; // Keep original key name (with SECRET_ prefix if present)
        
        params.push({
          name: envKey,
          value: parts[1],
          type: parts[2]
        });
      }
    }

    return params;
  } catch (error: any) {
    throw new Error(`Failed to retrieve SSM parameters: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENV FILE PARSING
// ═══════════════════════════════════════════════════════════════════════════════

function loadEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) {
    return {};
  }

  const content = readFileSync(filePath, 'utf8');
  const envVars: Record<string, string> = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      envVars[key.trim()] = value;
    }
  }

  return envVars;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE FORMATTING
// ═══════════════════════════════════════════════════════════════════════════════

function formatAsTemplate(env: EnvironmentName, params: SsmParameter[], templatePath: string): string {
  // Load template to get structure
  let templateContent = '';
  if (existsSync(templatePath)) {
    templateContent = readFileSync(templatePath, 'utf8');
  }

  // Create a map of parameters
  const paramMap = new Map<string, string>();
  for (const param of params) {
    paramMap.set(param.name, param.value);
  }

  // If template exists, try to preserve structure
  if (templateContent) {
    const lines = templateContent.split('\n');
    const output: string[] = [];
    let inSection = false;
    let currentSection: string[] = [];

    for (const line of lines) {
      // Check if it's a section header
      if (line.match(/^# ─+$/)) {
        if (currentSection.length > 0) {
          output.push(...currentSection);
          currentSection = [];
        }
        output.push(line);
        inSection = true;
      } else if (line.match(/^# ═+$/)) {
        if (currentSection.length > 0) {
          output.push(...currentSection);
          currentSection = [];
        }
        output.push(line);
        inSection = false;
      } else if (line.match(/^# [A-Z]/)) {
        if (currentSection.length > 0) {
          output.push(...currentSection);
          currentSection = [];
        }
        output.push(line);
      } else if (line.trim().startsWith('#')) {
        // Comment line - preserve it
        if (inSection) {
          currentSection.push(line);
        } else {
          output.push(line);
        }
      } else if (line.includes('=')) {
        // Environment variable line
        const [key] = line.split('=');
        const envKey = key.trim();
        if (paramMap.has(envKey)) {
          const value = paramMap.get(envKey)!;
          // Preserve comment if present
          const commentMatch = line.match(/#.*$/);
          const comment = commentMatch ? ` ${commentMatch[0]}` : '';
          currentSection.push(`${envKey}=${value}${comment}`);
          paramMap.delete(envKey); // Mark as used
        } else {
          // Variable not in SSM, preserve original line
          currentSection.push(line);
        }
      } else {
        // Other line - preserve it
        if (inSection) {
          currentSection.push(line);
        } else {
          output.push(line);
        }
      }
    }

    // Add any remaining parameters that weren't in template
    if (paramMap.size > 0) {
      output.push('');
      output.push('# ───────────────────────────────────────────────────────────────────────────────');
      output.push('# Additional Configuration (not in template)');
      output.push('# ───────────────────────────────────────────────────────────────────────────────');
      output.push('');
      for (const [key, value] of Array.from(paramMap.entries()).sort()) {
        output.push(`${key}=${value}`);
      }
    }

    return output.join('\n');
  } else {
    // No template, create simple format
    const header = `# ═══════════════════════════════════════════════════════════════════════════════
# Environment Configuration: ${env}
# Exported from AWS SSM Parameter Store
# Source: ${getSsmPath(env)}/*
# Generated at: ${new Date().toISOString()}
# ═══════════════════════════════════════════════════════════════════════════════

`;
    
    const vars = Array.from(paramMap.entries())
      .sort()
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    return header + vars + '\n';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPARISON
// ═══════════════════════════════════════════════════════════════════════════════

function compareWithLocal(ssmParams: SsmParameter[], localFilePath: string): void {
  const localVars = loadEnvFile(localFilePath);
  const ssmVars = new Map<string, string>();
  
  for (const param of ssmParams) {
    ssmVars.set(param.name, param.value);
  }

  const localKeys = new Set(Object.keys(localVars));
  const ssmKeys = new Set(Array.from(ssmVars.keys()));

  const onlyLocal: string[] = [];
  const onlySsm: string[] = [];
  const different: Array<{ key: string; local: string; ssm: string }> = [];

  for (const key of localKeys) {
    if (!ssmKeys.has(key)) {
      onlyLocal.push(key);
    } else if (localVars[key] !== ssmVars.get(key)) {
      different.push({
        key,
        local: localVars[key],
        ssm: ssmVars.get(key)!
      });
    }
  }

  for (const key of ssmKeys) {
    if (!localKeys.has(key)) {
      onlySsm.push(key);
    }
  }

  if (onlyLocal.length === 0 && onlySsm.length === 0 && different.length === 0) {
    console.log(chalk.green('✅ SSM parameters match local .env file\n'));
    return;
  }

  console.log(chalk.yellow('⚠️  Differences found:\n'));

  if (onlyLocal.length > 0) {
    console.log(chalk.cyan('📝 Only in local .env file:'));
    for (const key of onlyLocal.sort()) {
      const value = localVars[key];
      const displayValue = value.length > 50 ? `${value.substring(0, 47)}...` : value;
      console.log(chalk.white(`   + ${key} = ${displayValue}`));
    }
    console.log('');
  }

  if (onlySsm.length > 0) {
    console.log(chalk.cyan('📝 Only in SSM (not in local .env):'));
    for (const key of onlySsm.sort()) {
      const value = ssmVars.get(key)!;
      const displayValue = value.length > 50 ? `${value.substring(0, 47)}...` : value;
      console.log(chalk.white(`   - ${key} = ${displayValue}`));
    }
    console.log('');
  }

  if (different.length > 0) {
    console.log(chalk.cyan('📝 Different values:'));
    for (const { key, local, ssm } of different.sort((a, b) => a.key.localeCompare(b.key))) {
      console.log(chalk.white(`   ~ ${key}:`));
      const localDisplay = local.length > 50 ? `${local.substring(0, 47)}...` : local;
      const ssmDisplay = ssm.length > 50 ? `${ssm.substring(0, 47)}...` : ssm;
      console.log(chalk.red(`     Local: ${localDisplay}`));
      console.log(chalk.green(`     SSM:   ${ssmDisplay}`));
    }
    console.log('');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  
  let env: EnvironmentName = 'staging';
  let outputPath: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && i + 1 < args.length) {
      outputPath = args[i + 1];
      i++;
    } else if (!args[i].startsWith('--')) {
      env = args[i] as EnvironmentName;
    }
  }

  if (!env || (env !== 'staging' && env !== 'prod')) {
    console.error(chalk.red('Usage: pnpm env:export <environment> [--output <path>]'));
    process.exit(1);
  }

  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan(`║         📤 Export Environment Variables                ║`));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════╝\n'));

  const ssmPath = getSsmPath(env);
  console.log(chalk.blue(`🔍 Fetching from: ${ssmPath}/*\n`));

  try {
    // Get SSM parameters
    const params = getSsmParameters(env);

    if (params.length === 0) {
      console.log(chalk.red('❌ No parameters found in SSM'));
      console.log(chalk.yellow('   Run: pnpm provision staging'));
      process.exit(1);
    }

    console.log(chalk.green(`✓ Retrieved ${params.length} parameters from SSM\n`));

    // Load template
    const templatePath = join(projectRoot, 'infra/config/.env.template');
    
    // Format as template
    const formatted = formatAsTemplate(env, params, templatePath);

    // Determine output path (resolve relative to project root)
    const finalOutputPath = outputPath 
      ? (outputPath.startsWith('/') ? outputPath : join(projectRoot, outputPath))
      : join(projectRoot, getEnvFilePath(env) + '.exported');
    
    // Write to file
    writeFileSync(finalOutputPath, formatted, 'utf8');
    console.log(chalk.green(`✓ Exported to: ${finalOutputPath}\n`));

    // Compare with local file if it exists
    const localFilePath = join(projectRoot, getEnvFilePath(env));
    if (existsSync(localFilePath)) {
      console.log(chalk.blue('🔍 Comparing with local .env file...\n'));
      compareWithLocal(params, localFilePath);
    } else {
      console.log(chalk.yellow(`⚠️  Local .env file not found: ${localFilePath}\n`));
    }

    console.log(chalk.cyan('📋 Summary:'));
    console.log(chalk.white(`   Environment: ${env}`));
    console.log(chalk.white(`   SSM Path:    ${ssmPath}/*`));
    console.log(chalk.white(`   Parameters:  ${params.length}`));
    console.log(chalk.white(`   Output:      ${finalOutputPath}\n`));

  } catch (error: any) {
    console.error(chalk.red(`\n❌ Export failed: ${error.message}\n`));
    process.exit(1);
  }
}

main();
