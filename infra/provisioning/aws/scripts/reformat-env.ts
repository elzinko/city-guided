#!/usr/bin/env tsx
/**
 * Reformat Environment File Script
 * 
 * Reformats .env.staging to match .env.template structure
 * 
 * Usage:
 *   tsx scripts/reformat-env.ts staging
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import chalk from 'chalk';
import { getEnvFilePath, type EnvironmentName } from '../constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..', '..', '..');

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
// REFORMAT
// ═══════════════════════════════════════════════════════════════════════════════

function reformatEnvFile(env: EnvironmentName): void {
  const templatePath = join(projectRoot, 'infra/config/.env.template');
  const envFilePath = join(projectRoot, getEnvFilePath(env));
  const outputPath = join(projectRoot, getEnvFilePath(env) + '.reformat');

  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan(`║         🔄 Reformat Environment File                    ║`));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════╝\n'));

  // Load template
  if (!existsSync(templatePath)) {
    console.error(chalk.red(`❌ Template not found: ${templatePath}`));
    process.exit(1);
  }

  const templateContent = readFileSync(templatePath, 'utf8');

  // Load current env file
  if (!existsSync(envFilePath)) {
    console.error(chalk.red(`❌ Environment file not found: ${envFilePath}`));
    process.exit(1);
  }

  const envVars = loadEnvFile(envFilePath);
  console.log(chalk.blue(`📋 Loaded ${Object.keys(envVars).length} variables from ${getEnvFilePath(env)}`));

  // Create a map of variables
  const varMap = new Map<string, string>();
  for (const [key, value] of Object.entries(envVars)) {
    varMap.set(key, value);
  }

  // Parse template and reformat
  const templateLines = templateContent.split('\n');
  const output: string[] = [];
  const usedVars = new Set<string>();

  // Track current section
  let currentSection: string[] = [];
  let inSection = false;

  for (let i = 0; i < templateLines.length; i++) {
    const line = templateLines[i];
    const trimmed = line.trim();

    // Section separator (═══ or ───)
    if (line.match(/^# ═+$/)) {
      if (currentSection.length > 0) {
        output.push(...currentSection);
        currentSection = [];
      }
      output.push(line);
      inSection = false;
    } else if (line.match(/^# ─+$/)) {
      if (currentSection.length > 0) {
        output.push(...currentSection);
        currentSection = [];
      }
      output.push(line);
      inSection = true;
    } else if (line.match(/^# [A-Z]/)) {
      // Section title
      if (currentSection.length > 0) {
        output.push(...currentSection);
        currentSection = [];
      }
      output.push(line);
    } else if (trimmed.startsWith('#')) {
      // Comment - preserve it
      if (inSection) {
        currentSection.push(line);
      } else {
        output.push(line);
      }
    } else if (trimmed.includes('=')) {
      // Environment variable
      const [key] = trimmed.split('=');
      const envKey = key.trim();
      
      if (varMap.has(envKey)) {
        const value = varMap.get(envKey)!;
        // Preserve comment if present in template
        const commentMatch = line.match(/#.*$/);
        const comment = commentMatch ? ` ${commentMatch[0]}` : '';
        currentSection.push(`${envKey}=${value}${comment}`);
        usedVars.add(envKey);
        varMap.delete(envKey);
      } else {
        // Variable in template but not in env file - keep template line (with default/empty value)
        currentSection.push(line);
      }
    } else if (trimmed === '') {
      // Empty line
      if (inSection) {
        currentSection.push(line);
      } else {
        output.push(line);
      }
    } else {
      // Other line
      if (inSection) {
        currentSection.push(line);
      } else {
        output.push(line);
      }
    }
  }

  // Add remaining section if any
  if (currentSection.length > 0) {
    output.push(...currentSection);
  }

  // Add variables that are in env file but not in template
  const extraVars: Array<[string, string]> = [];
  for (const [key, value] of varMap.entries()) {
    // Skip SECRET_ variables that are auto-generated (they'll be added by provision script)
    if (key.startsWith('SECRET_') && (key.includes('AWS_') || key.includes('EC2_'))) {
      continue;
    }
    extraVars.push([key, value]);
  }

  if (extraVars.length > 0) {
    output.push('');
    output.push('# ───────────────────────────────────────────────────────────────────────────────');
    output.push('# Additional Variables (not in template)');
    output.push('# ───────────────────────────────────────────────────────────────────────────────');
    output.push('');

    // Sort extra variables
    extraVars.sort((a, b) => a[0].localeCompare(b[0]));

    for (const [key, value] of extraVars) {
      output.push(`${key}=${value}`);
    }
  }

  // Write output
  const formatted = output.join('\n');
  writeFileSync(outputPath, formatted, 'utf8');

  console.log(chalk.green(`✓ Reformatted file written to: ${getEnvFilePath(env)}.reformat`));
  console.log(chalk.white(`   Variables used from template: ${usedVars.size}`));
  console.log(chalk.white(`   Additional variables: ${extraVars.length}`));
  console.log(chalk.white(`   Total variables: ${Object.keys(envVars).length}\n`));

  if (extraVars.length > 0) {
    console.log(chalk.yellow('⚠️  Variables not in template:'));
    for (const [key] of extraVars) {
      console.log(chalk.gray(`   - ${key}`));
    }
    console.log('');
  }

  // Check for missing variables from template
  const templateVars = loadEnvFile(templatePath);
  const missingVars: string[] = [];
  for (const key of Object.keys(templateVars)) {
    if (!usedVars.has(key) && !key.startsWith('SECRET_')) {
      missingVars.push(key);
    }
  }

  if (missingVars.length > 0) {
    console.log(chalk.yellow('⚠️  Variables in template but missing in env file:'));
    for (const key of missingVars) {
      console.log(chalk.gray(`   - ${key}`));
    }
    console.log('');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

function main() {
  const args = process.argv.slice(2);
  const env = args[0] as EnvironmentName;

  if (!env || (env !== 'staging' && env !== 'prod' && env !== 'local')) {
    console.error(chalk.red('Usage: tsx scripts/reformat-env.ts <environment>'));
    console.error(chalk.red('Valid environments: staging, prod, local'));
    process.exit(1);
  }

  try {
    reformatEnvFile(env);
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Reformat failed: ${error.message}\n`));
    process.exit(1);
  }
}

main();
