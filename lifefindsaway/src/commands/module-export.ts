import chalk from 'chalk';
import { resolve } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { stringify as stringifyYaml } from 'yaml';
import { getLifefindsawayRoot, loadConfig } from '../core/config.js';
import { loadModule } from '../core/modules.js';

interface ExportOptions {
  name?: string;
}

export async function moduleExportCommand(options: ExportOptions): Promise<void> {
  const config = loadConfig();
  
  console.log(chalk.bold('\n🦖 Export Module\n'));

  // Collect all guidelines from enabled modules + custom rules
  const allGuidelines: Array<{ id: string; title: string; content: string }> = [];

  // Add guidelines from enabled modules
  for (const moduleName of config.enabled) {
    const mod = loadModule(moduleName);
    if (mod) {
      for (const guideline of mod.guidelines) {
        allGuidelines.push({
          id: `${moduleName}-${guideline.id}`,
          title: `[${moduleName}] ${guideline.title}`,
          content: guideline.content,
        });
      }
    }
  }

  // Add custom rules
  for (const rule of config.customRules) {
    allGuidelines.push({
      id: rule.id,
      title: rule.title,
      content: rule.content,
    });
  }

  if (allGuidelines.length === 0) {
    console.error(chalk.red('Nothing to export.'));
    console.log(chalk.yellow('Import modules or add custom rules first.'));
    process.exit(1);
  }

  console.log(chalk.bold('Guidelines to export:'));
  for (const g of allGuidelines) {
    console.log(`  - ${g.title}`);
  }
  console.log('');

  const moduleName = options.name || 'exported-ideation';
  const exportPath = resolve(getLifefindsawayRoot(), 'modules/exports', moduleName);
  
  if (existsSync(exportPath)) {
    console.error(chalk.red(`Module "${moduleName}" already exists in exports/.`));
    console.log(chalk.yellow('Use --name to specify a different name.'));
    process.exit(1);
  }

  mkdirSync(exportPath, { recursive: true });

  const moduleData = {
    name: moduleName,
    version: '1.0.0',
    description: `Exported ideation guidelines`,
    tags: ['exported', 'ideation'],
    guidelines: allGuidelines,
  };

  writeFileSync(
    resolve(exportPath, 'module.yaml'),
    stringifyYaml(moduleData),
    'utf-8'
  );

  console.log(chalk.green(`✓ Exported module: ${moduleName}`));
  console.log(chalk.gray(`  Path: modules/exports/${moduleName}/`));
  console.log(chalk.gray(`  Guidelines: ${allGuidelines.length}`));
  console.log('');
  console.log(chalk.blue('Share this module or import it in another project.'));
}
