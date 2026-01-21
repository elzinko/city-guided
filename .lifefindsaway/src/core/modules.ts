import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { getLifefindsawayRoot } from './config.js';

export type ModuleSource = 'core' | 'imports' | 'exports' | 'custom';

export interface Guideline {
  id: string;
  title: string;
  content: string;
}

export interface Module {
  name: string;
  version: string;
  description: string;
  tags?: string[];
  guidelines: Guideline[];
  source: ModuleSource;
}

const sourcePaths: Record<ModuleSource, string> = {
  core: 'core/modules',
  imports: 'modules/imports',
  exports: 'modules/exports',
  custom: 'modules/custom',
};

export function getSourcePath(source: ModuleSource): string {
  const root = getLifefindsawayRoot();
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
    const modulePath = resolve(getSourcePath(source), name, 'module.yaml');
    
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
