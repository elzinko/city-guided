#!/usr/bin/env node
import { Command } from 'commander';
import { moduleImportCommand } from './commands/module-import.js';
import { moduleExportCommand } from './commands/module-export.js';
import { moduleListCommand } from './commands/module-list.js';
import { setupCommand } from './commands/setup.js';
import { ruleAddCommand, ruleListCommand } from './commands/rule.js';

const program = new Command();

program
  .name('lifefindsaway')
  .description('Life Finds a Way 🦖 Feature ideation and exploration system')
  .version('0.1.0');

// Module subcommand
const moduleCmd = program
  .command('module')
  .description('Manage modules (guidelines)');

moduleCmd
  .command('import <name>')
  .description('Import a module (from core, file, or URL)')
  .action(moduleImportCommand);

moduleCmd
  .command('export')
  .description('Export custom rules as a shareable module')
  .option('-n, --name <name>', 'Module name')
  .action(moduleExportCommand);

moduleCmd
  .command('list')
  .description('List available and enabled modules')
  .option('-s, --source <source>', 'Filter by source (core, imports, exports, custom)')
  .action(moduleListCommand);

// Rule subcommand
const ruleCmd = program
  .command('rule')
  .description('Manage custom rules');

ruleCmd
  .command('add')
  .description('Add a custom rule')
  .requiredOption('-t, --title <title>', 'Rule title')
  .requiredOption('-c, --content <content>', 'Rule content')
  .action(ruleAddCommand);

ruleCmd
  .command('list')
  .description('List custom rules')
  .action(ruleListCommand);

// Setup subcommand
const setupCmd = program
  .command('setup')
  .description('Setup lifefindsaway in target IDE/LLM');

setupCmd
  .command('cursor')
  .description('Setup for Cursor (add reference + install commands)')
  .option('-f, --force', 'Overwrite existing files')
  .action((options) => setupCommand('cursor', options));

setupCmd
  .command('claude')
  .description('Setup for Claude Code (add reference + install agents)')
  .option('-f, --force', 'Overwrite existing files')
  .action((options) => setupCommand('claude', options));

program.parse();
