import chalk from 'chalk';
import { findModule } from '../core/modules.js';
import { loadConfig, saveConfig } from '../core/config.js';

export async function moduleImportCommand(name: string): Promise<void> {
  const result = findModule(name);
  
  if (!result) {
    console.error(chalk.red(`Module not found: ${name}`));
    console.log(chalk.yellow('Run "lifefindsaway module list" to see available modules.'));
    process.exit(1);
  }

  const { module, source } = result;
  const config = loadConfig();

  if (config.enabled.includes(name)) {
    console.log(chalk.yellow(`Module "${name}" is already enabled.`));
    return;
  }

  config.enabled.push(name);
  saveConfig(config);

  console.log(chalk.green(`✓ Imported module: ${name} (v${module.version})`));
  console.log(chalk.gray(`  Source: ${source}`));
  console.log(chalk.gray(`  Guidelines: ${module.guidelines.length}`));
  console.log('');
  console.log(chalk.blue('Next: Run "lifefindsaway setup cursor" to update configuration'));
}
