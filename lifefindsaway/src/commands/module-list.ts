import chalk from 'chalk';
import { listAllModules, listModulesFromSource, type ModuleSource } from '../core/modules.js';
import { loadConfig } from '../core/config.js';

interface ListOptions {
  source?: ModuleSource;
}

export async function moduleListCommand(options: ListOptions): Promise<void> {
  const config = loadConfig();
  
  console.log(chalk.bold('\n🦖 Life Finds a Way!\n'));

  const modules = options.source 
    ? listModulesFromSource(options.source)
    : listAllModules();

  if (modules.length === 0) {
    console.log(chalk.gray('No modules found.'));
    return;
  }

  // Group by source
  const bySource = modules.reduce((acc, mod) => {
    if (!acc[mod.source]) acc[mod.source] = [];
    acc[mod.source].push(mod);
    return acc;
  }, {} as Record<ModuleSource, typeof modules>);

  const sourceLabels: Record<ModuleSource, string> = {
    core: '📦 Core (built-in)',
    imports: '📥 Imports',
    exports: '📤 Exports',
    custom: '✏️  Custom',
  };

  for (const [source, mods] of Object.entries(bySource)) {
    console.log(chalk.bold(sourceLabels[source as ModuleSource]));
    
    for (const mod of mods) {
      const enabled = config.enabled.includes(mod.name);
      const status = enabled ? chalk.green('[enabled]') : chalk.gray('[available]');
      console.log(`  - ${mod.name} (v${mod.version}) ${status}`);
      console.log(chalk.gray(`    ${mod.description}`));
    }
    console.log('');
  }

  console.log(chalk.bold('Enabled modules:'));
  if (config.enabled.length === 0) {
    console.log(chalk.gray('  None. Run "lifefindsaway module import <name>" to enable one.'));
  } else {
    for (const name of config.enabled) {
      console.log(`  - ${name}`);
    }
  }
  console.log('');
}
