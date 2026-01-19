import chalk from 'chalk';
import { loadConfig, saveConfig } from '../core/config.js';

interface AddOptions {
  title: string;
  content: string;
}

export async function ruleAddCommand(options: AddOptions): Promise<void> {
  const config = loadConfig();
  
  const id = options.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  
  // Check for duplicates
  if (config.customRules.some(r => r.id === id)) {
    console.error(chalk.red(`Rule with id "${id}" already exists.`));
    process.exit(1);
  }

  config.customRules.push({
    id,
    title: options.title,
    content: options.content,
  });

  saveConfig(config);

  console.log(chalk.green(`✓ Added custom rule: ${options.title}`));
  console.log(chalk.gray(`  ID: ${id}`));
  console.log('');
  console.log(chalk.blue('Run "lifefindsaway setup cursor" to regenerate ENTRY.md'));
}

export async function ruleListCommand(): Promise<void> {
  const config = loadConfig();
  
  console.log(chalk.bold('\n🦖 Custom Rules\n'));

  if (config.customRules.length === 0) {
    console.log(chalk.gray('No custom rules.'));
    console.log(chalk.yellow('Add one with: lifefindsaway rule add --title "My Rule" --content "..."'));
    return;
  }

  for (const rule of config.customRules) {
    console.log(chalk.bold(`- ${rule.title}`));
    console.log(chalk.gray(`  ID: ${rule.id}`));
    console.log(chalk.gray(`  ${rule.content.slice(0, 80)}...`));
    console.log('');
  }
}
