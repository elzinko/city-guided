import chalk from 'chalk';
import { resolve } from 'node:path';
import { existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { stringify as stringifyYaml } from 'yaml';
import { getIamthelawRoot, getProjectRoot } from '../core/config.js';

interface ExportOptions {
  name?: string;
}

export async function moduleExportCommand(options: ExportOptions): Promise<void> {
  const projectRoot = getProjectRoot();
  const rulesPath = resolve(projectRoot, 'rules');
  
  console.log(chalk.bold('\n⚖️  Export Module\n'));
  console.log(chalk.gray(`Project root: ${projectRoot}`));
  console.log('');

  // Check if rules/ exists
  if (!existsSync(rulesPath)) {
    console.error(chalk.red('No rules/ directory found in project.'));
    console.log(chalk.yellow('Create rules in rules/*.md first.'));
    process.exit(1);
  }

  // List available rule files
  const ruleFiles = readdirSync(rulesPath)
    .filter(f => f.endsWith('.md') && !f.startsWith('.') && f !== 'RULESETS.md');

  if (ruleFiles.length === 0) {
    console.error(chalk.red('No rule files found in rules/.'));
    process.exit(1);
  }

  console.log(chalk.bold('Available rule files:'));
  for (const file of ruleFiles) {
    console.log(`  - ${file}`);
  }
  console.log('');

  // For now, create a simple export with file references
  // In the future, this could use LLM to synthesize rules
  const moduleName = options.name || 'exported-rules';
  const exportPath = resolve(getIamthelawRoot(), 'modules/exports', moduleName);
  
  if (existsSync(exportPath)) {
    console.error(chalk.red(`Module "${moduleName}" already exists in exports/.`));
    console.log(chalk.yellow('Use --name to specify a different name.'));
    process.exit(1);
  }

  // Create the export
  mkdirSync(exportPath, { recursive: true });

  const ruleset = {
    name: moduleName,
    version: '1.0.0',
    description: `Rules exported from ${projectRoot.split('/').pop()}`,
    tags: ['exported'],
    rules: ruleFiles.map((file) => ({
      id: file.replace('.md', '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title: file.replace('.md', '').replace(/_/g, ' '),
      level: 'SHOULD' as const,
      content: `See [${file}](../../../rules/${file}) for details.`,
    })),
  };

  writeFileSync(
    resolve(exportPath, 'ruleset.yaml'),
    stringifyYaml(ruleset),
    'utf-8'
  );

  console.log(chalk.green(`✓ Exported module: ${moduleName}`));
  console.log(chalk.gray(`  Path: modules/exports/${moduleName}/`));
  console.log(chalk.gray(`  Rules: ${ruleset.rules.length}`));
  console.log('');
  console.log(chalk.blue('Edit modules/exports/' + moduleName + '/ruleset.yaml to customize.'));
  console.log(chalk.blue('Then run "iamthelaw module import ' + moduleName + '" to enable it.'));
}
