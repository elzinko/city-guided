import chalk from 'chalk';
import { findModule } from '../core/modules.js';
import { loadConfig, saveConfig } from '../core/config.js';

export async function moduleImportCommand(name: string): Promise<void> {
  const result = findModule(name);
  
  if (!result) {
    console.error(chalk.red(`Module not found: ${name}`));
    console.log(chalk.yellow('Run "iamthelaw module list" to see available modules.'));
    process.exit(1);
  }

  const { module, source } = result;
  const config = loadConfig();

  // Check if already enabled
  if (config.enabled.includes(name)) {
    console.log(chalk.yellow(`Module "${name}" is already enabled.`));
    return;
  }

  // Add to enabled list
  config.enabled.push(name);
  saveConfig(config);

  console.log(chalk.green(`✓ Imported module: ${name} (v${module.version})`));
  console.log(chalk.gray(`  Source: ${source}`));
  console.log(chalk.gray(`  Rules: ${module.rules.length}`));
  console.log('');
  console.log(chalk.blue('Next: Run "iamthelaw setup cursor" to update .cursorrules'));
}
