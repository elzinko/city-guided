import { resolve } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import { loadConfig, getProjectRoot } from './config.js';
import { loadModule, type Module } from './modules.js';

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
- **🟢 MAY / PEUT** : Optional, use when beneficial

## Instructions pour les LLM

Les modules listés ci-dessous contiennent les règles à appliquer. Vous **DEVEZ** :

1. Lire le fichier \`ruleset.yaml\` de chaque module activé au démarrage
2. Appliquer les règles selon leur niveau (MUST/SHOULD/MAY)
3. Ne pas réinventer des règles qui existent déjà dans les modules`);

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
    .map(name => {
      const mod = loadModule(name);
      return mod ? { module: mod, folderName: name } : null;
    })
    .filter((item): item is { module: Module; folderName: string } => item !== null);

  if (enabledModules.length === 0) {
    sections.push(`## Modules activés

*Aucun module activé. Exécuter \`iamthelaw module import <name>\` pour en ajouter.*`);
  } else {
    sections.push(`## Modules activés`);
    
    for (const { module: mod, folderName } of enabledModules) {
      sections.push(formatModule(mod, folderName));
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

function formatModule(mod: Module, folderName: string): string {
  const sourcePaths: Record<string, string> = {
    'core': 'core/rulesets',
    'imports': 'modules/imports',
    'exports': 'modules/exports',
    'custom': 'modules/custom',
  };
  
  const rulesetPath = `${sourcePaths[mod.source]}/${folderName}/ruleset.yaml`;
  const ruleCount = mod.rules.length;
  const ruleCountText = ruleCount === 1 ? '1 règle' : `${ruleCount} règles`;
  
  return `### ${mod.name} (v${mod.version}) [${mod.source}]

${mod.description}

- **Règles** : ${ruleCountText}
- **Fichier** : [${folderName}/ruleset.yaml](${rulesetPath})`;
}
