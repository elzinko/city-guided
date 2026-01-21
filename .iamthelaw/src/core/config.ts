import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface Config {
  enabled: string[];  // List of enabled module names
  projectRulesPath: string;
}

const configPath = resolve(__dirname, '../../config/iamthelaw.yaml');

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
    projectRulesPath: 'rules',
  };
}

export function getIamthelawRoot(): string {
  return resolve(__dirname, '../../');
}

export function getProjectRoot(): string {
  // iamthelaw is installed in the project, so project root is parent
  const iamthelawRoot = getIamthelawRoot();
  const parentDir = resolve(iamthelawRoot, '..');
  
  // Verify it's a valid project (has rules/ or package.json)
  if (existsSync(resolve(parentDir, 'rules')) || existsSync(resolve(parentDir, 'package.json'))) {
    return parentDir;
  }
  
  // Fallback to current working directory
  return process.cwd();
}
