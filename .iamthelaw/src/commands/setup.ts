import chalk from 'chalk';
import { resolve } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { getProjectRoot, getIamthelawRoot } from '../core/config.js';
import { generateEntryFile } from '../core/generator.js';

type Target = 'cursor' | 'claude';

interface SetupOptions {
  force?: boolean;
}

const targetConfig: Record<Target, { file: string; template: string }> = {
  cursor: { file: '.cursorrules', template: 'cursorrules.md' },
  claude: { file: 'CLAUDE.md', template: 'claude.md' },
};

export async function setupCommand(target: Target, options: SetupOptions): Promise<void> {
  const projectRoot = getProjectRoot();
  const iamthelawRoot = getIamthelawRoot();
  const config = targetConfig[target];
  
  console.log(chalk.bold(`\n⚖️  Setup for ${target}\n`));
  console.log(chalk.gray(`Project root: ${projectRoot}`));
  console.log('');

  // 1. Generate ENTRY.md
  const entryFile = generateEntryFile();
  const entryPath = resolve(iamthelawRoot, 'ENTRY.md');
  writeFileSync(entryPath, entryFile.content, 'utf-8');
  console.log(chalk.green(`✓ Generated: iamthelaw/ENTRY.md`));

  // 2. Setup target file (.cursorrules or CLAUDE.md)
  const targetPath = resolve(projectRoot, config.file);
  const templatePath = resolve(iamthelawRoot, 'core/templates', config.template);
  
  if (!existsSync(templatePath)) {
    console.error(chalk.red(`Template not found: ${config.template}`));
    process.exit(1);
  }

  const template = readFileSync(templatePath, 'utf-8');

  if (!existsSync(targetPath)) {
    // Create from template
    writeFileSync(targetPath, template, 'utf-8');
    console.log(chalk.green(`✓ Created: ${config.file}`));
  } else {
    const content = readFileSync(targetPath, 'utf-8');
    
    // Check if iamthelaw reference exists
    if (content.includes('iamthelaw/ENTRY.md')) {
      console.log(chalk.yellow(`${config.file} already references iamthelaw/ENTRY.md`));
    } else if (options.force) {
      // Overwrite with template
      writeFileSync(targetPath, template, 'utf-8');
      console.log(chalk.green(`✓ Replaced: ${config.file}`));
    } else {
      // Append reference
      const reference = `\n- **DOIT** : Lire [iamthelaw/ENTRY.md](./iamthelaw/ENTRY.md) pour les règles de développement\n`;
      writeFileSync(targetPath, content.trimEnd() + reference, 'utf-8');
      console.log(chalk.green(`✓ Updated: ${config.file} (added iamthelaw reference)`));
    }
  }

  console.log('');
  console.log(chalk.blue('Setup complete!'));
  console.log(chalk.gray(`Chain: ${config.file} → iamthelaw/ENTRY.md`));
}
