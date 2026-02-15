#!/usr/bin/env tsx
/**
 * Environment Loader - Applicatif + Provider (AWS)
 *
 * Charge et fusionne .env.<env> (applicatif) + .env.aws.<env> (provider AWS).
 * Si .env.aws.<env> n'existe pas, retourne uniquement l'applicatif (rétrocompat).
 *
 * Usage: import { loadMergedEnv } from './env-loader.js';
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { getEnvFilePath, getAwsEnvFilePath, type EnvironmentName } from '../constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..', '..', '..');

function parseEnvFile(filePath: string): Record<string, string> {
  const variables: Record<string, string> = {};
  const content = readFileSync(filePath, 'utf-8');

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        variables[key.trim()] = valueParts.join('=').trim();
      }
    }
  }

  return variables;
}

/**
 * Load merged environment: applicatif (.env.<env>) + provider (.env.aws.<env>).
 * Provider overrides applicatif for keys that exist in both.
 */
export function loadMergedEnv(env: EnvironmentName): Record<string, string> {
  const applicatifPath = join(projectRoot, getEnvFilePath(env));

  if (!existsSync(applicatifPath)) {
    throw new Error(`Environment file not found: ${applicatifPath}`);
  }

  const applicatif = parseEnvFile(applicatifPath);
  const awsPath = join(projectRoot, getAwsEnvFilePath(env));

  if (!existsSync(awsPath)) {
    return applicatif;
  }

  const provider = parseEnvFile(awsPath);
  return { ...applicatif, ...provider };
}
