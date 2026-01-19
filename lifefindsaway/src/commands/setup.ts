import chalk from 'chalk';
import { resolve } from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, cpSync } from 'node:fs';
import { getProjectRoot, getLifefindsawayRoot } from '../core/config.js';
import { generateEntryFile } from '../core/generator.js';

type Target = 'cursor' | 'claude';

interface SetupOptions {
  force?: boolean;
}

const targetConfig: Record<Target, { file: string; template: string; commandsDir: string }> = {
  cursor: { 
    file: '.cursorrules', 
    template: 'cursorrules.md',
    commandsDir: '.cursor/commands',
  },
  claude: { 
    file: 'CLAUDE.md', 
    template: 'claude.md',
    commandsDir: '.claude/agents',
  },
};

export async function setupCommand(target: Target, options: SetupOptions): Promise<void> {
  const projectRoot = getProjectRoot();
  const lfaRoot = getLifefindsawayRoot();
  const config = targetConfig[target];
  
  console.log(chalk.bold(`\n🦖 Setup for ${target}\n`));
  console.log(chalk.gray(`Project root: ${projectRoot}`));
  console.log('');

  // 1. Generate ENTRY.md
  const entryFile = generateEntryFile();
  const entryPath = resolve(lfaRoot, 'ENTRY.md');
  writeFileSync(entryPath, entryFile.content, 'utf-8');
  console.log(chalk.green(`✓ Generated: lifefindsaway/ENTRY.md`));

  // 2. Setup target file (.cursorrules or CLAUDE.md)
  const targetPath = resolve(projectRoot, config.file);
  const templatePath = resolve(lfaRoot, 'core/templates', config.template);
  
  if (!existsSync(templatePath)) {
    console.error(chalk.red(`Template not found: ${config.template}`));
    process.exit(1);
  }

  const template = readFileSync(templatePath, 'utf-8');

  if (!existsSync(targetPath)) {
    writeFileSync(targetPath, template, 'utf-8');
    console.log(chalk.green(`✓ Created: ${config.file}`));
  } else {
    const content = readFileSync(targetPath, 'utf-8');
    
    if (content.includes('lifefindsaway/ENTRY.md')) {
      console.log(chalk.yellow(`${config.file} already references lifefindsaway/ENTRY.md`));
    } else if (options.force) {
      writeFileSync(targetPath, template, 'utf-8');
      console.log(chalk.green(`✓ Replaced: ${config.file}`));
    } else {
      const reference = `\n- **DOIT** : Lire [lifefindsaway/ENTRY.md](./lifefindsaway/ENTRY.md) pour l'idéation\n`;
      writeFileSync(targetPath, content.trimEnd() + reference, 'utf-8');
      console.log(chalk.green(`✓ Updated: ${config.file} (added lifefindsaway reference)`));
    }
  }

  // 3. Install commands/agents
  const commandsSourceDir = resolve(lfaRoot, 'core/commands', target);
  const commandsTargetDir = resolve(projectRoot, config.commandsDir);

  if (existsSync(commandsSourceDir)) {
    // Create target directory if needed
    if (!existsSync(commandsTargetDir)) {
      mkdirSync(commandsTargetDir, { recursive: true });
    }

    // Copy all command files
    const commandFiles = readdirSync(commandsSourceDir);
    let installed = 0;
    
    for (const file of commandFiles) {
      const sourcePath = resolve(commandsSourceDir, file);
      const targetFilePath = resolve(commandsTargetDir, file);
      
      if (existsSync(targetFilePath) && !options.force) {
        console.log(chalk.yellow(`  [skip] ${config.commandsDir}/${file} (exists, use --force)`));
      } else {
        cpSync(sourcePath, targetFilePath);
        console.log(chalk.green(`  ✓ Installed: ${config.commandsDir}/${file}`));
        installed++;
      }
    }

    if (installed > 0) {
      console.log(chalk.green(`✓ Installed ${installed} command(s)`));
    }
  } else {
    console.log(chalk.gray(`No commands to install for ${target}`));
  }

  console.log('');
  console.log(chalk.blue('Setup complete!'));
  console.log(chalk.gray(`Chain: ${config.file} → lifefindsaway/ENTRY.md`));
}
