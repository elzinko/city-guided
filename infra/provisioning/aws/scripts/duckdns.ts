#!/usr/bin/env tsx
/**
 * DuckDNS Management Script
 * 
 * Utility to manage DuckDNS configuration for the staging environment.
 * 
 * Usage:
 *   pnpm duckdns:update staging           # Update DuckDNS with current Elastic IP
 *   pnpm duckdns:check staging            # Check current DuckDNS IP
 *   pnpm duckdns:ip staging               # Get Elastic IP from AWS
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..', '..', '..');

function execSilent(command: string): string {
  try {
    return execSync(command, { encoding: 'utf-8', stdio: 'pipe' }).trim();
  } catch (error: any) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

function loadEnvFile(env: string): Record<string, string> {
  const envFilePath = join(projectRoot, `infra/config/.env.${env}`);
  
  if (!existsSync(envFilePath)) {
    console.error(chalk.red(`\n❌ Environment file not found: ${envFilePath}`));
    process.exit(1);
  }

  const variables: Record<string, string> = {};
  const content = readFileSync(envFilePath, 'utf-8');
  
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

async function getElasticIp(): Promise<string | null> {
  try {
    // Try from CloudFormation stack output
    const outputs = execSilent(
      `aws cloudformation describe-stacks --stack-name CityGuidedReverseProxyStack --query 'Stacks[0].Outputs' --output json`
    );
    const parsedOutputs = JSON.parse(outputs);
    const elasticIp = parsedOutputs.find((o: any) => o.OutputKey === 'ElasticIP')?.OutputValue;
    
    if (elasticIp) {
      return elasticIp;
    }
  } catch {
    // Stack might not exist
  }

  // Try from elastic address resources
  try {
    const ip = execSilent(
      `aws ec2 describe-addresses --filters "Name=tag:Name,Values=city-guided-proxy" --query 'Addresses[0].PublicIp' --output text`
    );
    
    if (ip && ip !== 'None') {
      return ip;
    }
  } catch {
    // No Elastic IP found
  }

  return null;
}

async function getCurrentDuckDnsIp(domain: string): Promise<string | null> {
  const subdomain = domain.replace('.duckdns.org', '');
  
  try {
    const response = await fetch(`https://www.duckdns.org/update?domains=${subdomain}&token=get&ip=`);
    const text = await response.text();
    
    // DuckDNS returns current IP if token is invalid/empty
    if (text && text !== 'KO' && text !== 'OK') {
      return text.trim();
    }
  } catch {
    // Could not fetch
  }

  // Fallback: use dig/nslookup
  try {
    const ip = execSilent(`dig +short ${domain} | tail -n1`);
    if (ip) {
      return ip;
    }
  } catch {
    // dig not available
  }

  return null;
}

async function updateDuckDns(token: string, domain: string, ip: string): Promise<boolean> {
  const subdomain = domain.replace('.duckdns.org', '');
  
  try {
    const url = `https://www.duckdns.org/update?domains=${subdomain}&token=${token}&ip=${ip}`;
    const response = await fetch(url);
    const result = await response.text();

    return result.trim() === 'OK';
  } catch {
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const env = args[1] || 'staging';

  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan(`║         🦆 DuckDNS Management - ${env.toUpperCase().padEnd(8)}          ║`));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════╝\n'));

  // Load environment variables
  const envVars = loadEnvFile(env);
  const duckdnsToken = envVars.SECRET_DUCKDNS_TOKEN || '';
  const duckdnsDomain = envVars.SITE_DOMAIN || '';

  if (!duckdnsDomain.endsWith('.duckdns.org')) {
    console.error(chalk.red(`❌ Not a DuckDNS domain: ${duckdnsDomain}`));
    console.error(chalk.yellow(`   SITE_DOMAIN must end with .duckdns.org`));
    process.exit(1);
  }

  switch (command) {
    case 'ip':
      // Get Elastic IP from AWS
      const elasticIp = await getElasticIp();
      
      if (elasticIp) {
        console.log(chalk.green(`✓ Elastic IP: ${elasticIp}`));
      } else {
        console.log(chalk.yellow('⚠️  No Elastic IP found'));
        console.log(chalk.dim('   Run: pnpm infra:provision staging'));
      }
      break;

    case 'check':
      // Check current DuckDNS IP
      console.log(chalk.blue(`📡 Checking DNS for: ${duckdnsDomain}`));
      
      const currentIp = await getCurrentDuckDnsIp(duckdnsDomain);
      
      if (currentIp) {
        console.log(chalk.green(`✓ Current IP: ${currentIp}`));
        
        // Compare with Elastic IP
        const awsIp = await getElasticIp();
        if (awsIp && awsIp !== currentIp) {
          console.log(chalk.yellow(`⚠️  AWS Elastic IP: ${awsIp}`));
          console.log(chalk.yellow('   IPs do not match! Run: pnpm duckdns:update staging'));
        } else if (awsIp) {
          console.log(chalk.green(`✓ Matches AWS Elastic IP`));
        }
      } else {
        console.log(chalk.yellow('⚠️  Could not resolve DNS'));
      }
      break;

    case 'update':
      // Update DuckDNS with current Elastic IP
      if (!duckdnsToken) {
        console.error(chalk.red('❌ SECRET_DUCKDNS_TOKEN not set in .env file'));
        process.exit(1);
      }

      const ipToUpdate = await getElasticIp();
      
      if (!ipToUpdate) {
        console.error(chalk.red('❌ No Elastic IP found'));
        console.log(chalk.dim('   Run: pnpm infra:provision staging'));
        process.exit(1);
      }

      console.log(chalk.blue(`📡 Updating DuckDNS: ${duckdnsDomain} → ${ipToUpdate}`));
      
      const success = await updateDuckDns(duckdnsToken, duckdnsDomain, ipToUpdate);
      
      if (success) {
        console.log(chalk.green(`✓ DuckDNS updated successfully`));
        console.log(chalk.dim(`   Wait 1-5 minutes for DNS propagation`));
      } else {
        console.error(chalk.red('❌ DuckDNS update failed'));
        console.log(chalk.dim('   Check your token and domain configuration'));
      }
      break;

    case 'help':
    default:
      console.log(chalk.cyan('Available commands:\n'));
      console.log(chalk.white('  pnpm duckdns:ip staging       ') + chalk.dim('Get Elastic IP from AWS'));
      console.log(chalk.white('  pnpm duckdns:check staging    ') + chalk.dim('Check current DuckDNS IP'));
      console.log(chalk.white('  pnpm duckdns:update staging   ') + chalk.dim('Update DuckDNS with Elastic IP'));
      console.log();
      break;
  }
}

main().catch((error) => {
  console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
  process.exit(1);
});
