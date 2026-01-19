import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { getIamthelawRoot } from './config.js';

/**
 * Module sources (in priority order):
 * 1. core/rulesets/     - Built-in with iamthelaw
 * 2. modules/imports/   - Imported from external sources
 * 3. modules/exports/   - Exported from this project
 * 4. modules/custom/    - Created locally by user
 */

export type ModuleSource = 'core' | 'imports' | 'exports' | 'custom';

export interface Rule {
  id: string;
  title: string;
  level: 'MUST' | 'SHOULD' | 'MAY';
  content: string;
}

export interface Module {
  name: string;
  version: string;
  description: string;
  tags?: string[];
  rules: Rule[];
  source: ModuleSource;
}

const sourcePaths: Record<ModuleSource, string> = {
  core: 'core/rulesets',
  imports: 'modules/imports',
  exports: 'modules/exports',
  custom: 'modules/custom',
};

export function getSourcePath(source: ModuleSource): string {
  const root = getIamthelawRoot();
  return resolve(root, sourcePaths[source]);
}

export function listAllModules(): Module[] {
  const modules: Module[] = [];
  const sources: ModuleSource[] = ['core', 'imports', 'exports', 'custom'];
  
  for (const source of sources) {
    const sourceModules = listModulesFromSource(source);
    modules.push(...sourceModules);
  }
  
  return modules;
}

export function listModulesFromSource(source: ModuleSource): Module[] {
  const sourcePath = getSourcePath(source);
  
  if (!existsSync(sourcePath)) {
    return [];
  }

  const dirs = readdirSync(sourcePath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  const modules: Module[] = [];

  for (const dir of dirs) {
    const mod = loadModule(dir, source);
    if (mod) {
      modules.push(mod);
    }
  }

  return modules;
}

export function loadModule(name: string, preferredSource?: ModuleSource): Module | null {
  const sources: ModuleSource[] = preferredSource 
    ? [preferredSource]
    : ['core', 'imports', 'exports', 'custom'];
  
  for (const source of sources) {
    const modulePath = resolve(getSourcePath(source), name, 'ruleset.yaml');
    
    if (existsSync(modulePath)) {
      try {
        const content = readFileSync(modulePath, 'utf-8');
        const parsed = parseYaml(content) as Omit<Module, 'source'>;
        return { ...parsed, source };
      } catch {
        continue;
      }
    }
  }
  
  return null;
}

export function findModule(name: string): { module: Module; source: ModuleSource } | null {
  const mod = loadModule(name);
  if (mod) {
    return { module: mod, source: mod.source };
  }
  return null;
}
