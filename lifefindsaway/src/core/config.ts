import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface Config {
  enabled: string[];  // List of enabled module names
  customRules: CustomRule[];
  featuresPath: string;
}

export interface CustomRule {
  id: string;
  title: string;
  content: string;
}

const configPath = resolve(__dirname, '../../config/lifefindsaway.yaml');

export function loadConfig(): Config {
  if (!existsSync(configPath)) {
    return getDefaultConfig();
  }

  const content = readFileSync(configPath, 'utf-8');
  const parsed = parseYaml(content) as Partial<Config>;
  
  return {
    ...getDefaultConfig(),
    ...parsed,
  };
}

export function saveConfig(config: Config): void {
  writeFileSync(configPath, stringifyYaml(config), 'utf-8');
}

function getDefaultConfig(): Config {
  return {
    enabled: [],
    customRules: [],
    featuresPath: 'features',
  };
}

export function getLifefindsawayRoot(): string {
  return resolve(__dirname, '../../');
}

export function getProjectRoot(): string {
  const lfaRoot = getLifefindsawayRoot();
  const parentDir = resolve(lfaRoot, '..');
  
  if (existsSync(resolve(parentDir, 'package.json'))) {
    return parentDir;
  }
  
  return process.cwd();
}
