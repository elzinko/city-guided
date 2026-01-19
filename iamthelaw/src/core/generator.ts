import { resolve } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import { loadConfig, getProjectRoot } from './config.js';
import { loadModule, type Module, type Rule } from './modules.js';

export interface GeneratedFile {
  path: string;
  content: string;
}

/**
 * Generate ENTRY.md - the central entry point for all LLM rules
 * This file is referenced directly from .cursorrules or CLAUDE.md
 */
export function generateEntryFile(): GeneratedFile {
  const config = loadConfig();
  const projectRoot = getProjectRoot();
  const sections: string[] = [];

  // Header
  sections.push(`# I AM THE LAW ⚖️

> *"I am the law!"* — Judge Dredd

Point d'entrée unique pour tous les LLM/agents conversationnels.

## How to Read

- **🔴 MUST / DOIT** : Non-negotiable requirement
- **🟡 SHOULD / DEVRAIT** : Recommended, exceptions must be justified
- **🟢 MAY / PEUT** : Optional, use when beneficial`);

  // Project context
  if (existsSync(resolve(projectRoot, 'RESUME.md'))) {
    sections.push(`## Contexte du projet

- **DOIT** : Lire [RESUME.md](../RESUME.md) pour le contexte complet du projet`);
  }

  // Agile method
  if (existsSync(resolve(projectRoot, 'agile/README.md'))) {
    sections.push(`## Méthode agile

- **DOIT** : Lire et respecter [agile/README.md](../agile/README.md)
- **DOIT** : Appliquer les rôles définis dans [agile/AGENTS.md](../agile/AGENTS.md)`);
  }

  // Enabled modules (iamthelaw rulesets)
  const enabledModules = config.enabled
    .map(name => loadModule(name))
    .filter((m): m is Module => m !== null);

  if (enabledModules.length === 0) {
    sections.push(`## Modules activés

*Aucun module activé. Exécuter \`iamthelaw module import <name>\` pour en ajouter.*`);
  } else {
    sections.push(`## Modules activés`);
    
    for (const mod of enabledModules) {
      sections.push(formatModule(mod));
    }
  }

  // Project rules (rules/*.md)
  const rulesPath = resolve(projectRoot, config.projectRulesPath);
  if (existsSync(rulesPath)) {
    const ruleFiles = readdirSync(rulesPath)
      .filter(f => f.endsWith('.md') && !f.startsWith('.') && f !== 'RULESETS.md');
    
    if (ruleFiles.length > 0) {
      sections.push(`## Règles du projet

Les règles suivantes **DOIVENT** être lues et appliquées :

${ruleFiles.map(f => `- **DOIT** : Lire et appliquer [${f.replace('.md', '')}](../rules/${f})`).join('\n')}`);
    }
  }

  return {
    path: 'ENTRY.md',
    content: sections.join('\n\n'),
  };
}

function formatModule(mod: Module): string {
  const lines: string[] = [];
  
  lines.push(`### ${mod.name} (v${mod.version}) [${mod.source}]`);
  lines.push(`${mod.description}`);
  
  for (const rule of mod.rules) {
    lines.push(formatRule(rule));
  }
  
  return lines.join('\n\n');
}

function formatRule(rule: Rule): string {
  const levelEmoji = {
    'MUST': '🔴',
    'SHOULD': '🟡',
    'MAY': '🟢',
  };
  
  return `#### ${levelEmoji[rule.level]} ${rule.title} [${rule.level}]

${rule.content.trim()}`;
}
