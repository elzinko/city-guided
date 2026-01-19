import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { loadConfig, getProjectRoot, getLifefindsawayRoot } from './config.js';
import { loadModule, type Module } from './modules.js';

export interface GeneratedFile {
  path: string;
  content: string;
}

/**
 * Generate ENTRY.md - the central entry point for ideation
 */
export function generateEntryFile(): GeneratedFile {
  const config = loadConfig();
  const projectRoot = getProjectRoot();
  const lfaRoot = getLifefindsawayRoot();
  const sections: string[] = [];

  // Header
  sections.push(`# Life Finds a Way 🦖

> *"Life finds a way"* — Dr. Ian Malcolm, Jurassic Park

Point d'entrée pour l'idéation et l'exploration de features.

## How to Read

- Explore, test, fill gaps, surface unknowns
- Documents can be imperfect, incomplete, evolving
- No formal validation required in Phase A`);

  // Project context
  if (existsSync(resolve(projectRoot, 'RESUME.md'))) {
    sections.push(`## Contexte du projet

- **DOIT** : Lire [RESUME.md](../RESUME.md) pour le contexte complet`);
  }

  // Agile method references
  sections.push(`## Méthode agile

- **DOIT** : Lire et respecter [README.md](./README.md) (méthode)
- **DOIT** : Appliquer les rôles définis dans [AGENTS.md](./AGENTS.md)
- **DOIT** : Consulter [planning.md](./planning.md) pour les statuts`);

  // Enabled modules
  const enabledModules = config.enabled
    .map(name => loadModule(name))
    .filter((m): m is Module => m !== null);

  if (enabledModules.length > 0) {
    sections.push(`## Modules activés`);
    
    for (const mod of enabledModules) {
      sections.push(formatModule(mod));
    }
  }

  // Custom rules
  if (config.customRules.length > 0) {
    sections.push(`## Règles custom

${config.customRules.map(r => `### ${r.title}\n\n${r.content}`).join('\n\n')}`);
  }

  // Commands reference
  const commandsPath = resolve(lfaRoot, '.cursor/commands');
  if (existsSync(commandsPath)) {
    sections.push(`## Commandes disponibles

Les commandes Cursor suivantes sont disponibles pour l'idéation :
- Voir \`.cursor/commands/\` pour la liste complète`);
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
  
  for (const guideline of mod.guidelines) {
    lines.push(`#### ${guideline.title}

${guideline.content.trim()}`);
  }
  
  return lines.join('\n\n');
}
