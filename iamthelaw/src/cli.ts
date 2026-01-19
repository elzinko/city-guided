#!/usr/bin/env node
import { Command } from 'commander';
import { moduleImportCommand } from './commands/module-import.js';
import { moduleExportCommand } from './commands/module-export.js';
import { moduleListCommand } from './commands/module-list.js';
import { setupCommand } from './commands/setup.js';

const program = new Command();

program
  .name('iamthelaw')
  .description('I AM THE LAW! ⚖️ LLM rules management system')
  .version('0.1.0');

// Module subcommand
const moduleCmd = program
  .command('module')
  .description('Manage modules (rulesets)');

moduleCmd
  .command('import <name>')
  .description('Import a module (from core, file, or URL)')
  .action(moduleImportCommand);

moduleCmd
  .command('export')
  .description('Export rules as a shareable module')
  .option('-n, --name <name>', 'Module name')
  .action(moduleExportCommand);

moduleCmd
  .command('list')
  .description('List available and enabled modules')
  .option('-s, --source <source>', 'Filter by source (core, imports, exports, custom)')
  .action(moduleListCommand);

// Setup subcommand
const setupCmd = program
  .command('setup')
  .description('Setup iamthelaw in target IDE/LLM');

setupCmd
  .command('cursor')
  .description('Add iamthelaw reference to .cursorrules')
  .option('-f, --force', 'Overwrite existing reference')
  .action((options) => setupCommand('cursor', options));

setupCmd
  .command('claude')
  .description('Add iamthelaw reference to CLAUDE.md')
  .option('-f, --force', 'Overwrite existing reference')
  .action((options) => setupCommand('claude', options));

program.parse();
