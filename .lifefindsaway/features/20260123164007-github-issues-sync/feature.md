# Feature – Phase A (Exploration)

## Identifiant
github-issues-sync

## Résumé
Synchroniser les bugs documentés localement dans `.lifefindsaway/bugs/` avec les Issues GitHub du projet, permettant une gestion bidirectionnelle.

## Problème adressé
- Les bugs sont documentés localement (Markdown) mais pas visibles sur GitHub Issues
- Pas de lien entre la documentation locale et le tracking externe
- Duplication d'effort si on veut maintenir les deux systèmes
- Les contributeurs externes ne voient pas les bugs documentés

## Hypothèse de valeur
Une synchronisation automatique ou semi-automatique permettrait de :
- Bénéficier des avantages des deux systèmes (local = riche, GitHub = collaboratif)
- Éviter la double saisie
- Garder une source de vérité locale tout en exposant sur GitHub

⚠️ Hypothèse : les utilisateurs veulent cette intégration (pas juste du local-only)

## Utilisateurs concernés
- Développeurs utilisant lifefindsaway
- Contributeurs externes (via GitHub Issues)
- Mainteneurs du projet

## Scénarios d'usage pressentis

### Scénario 1 : Push local → GitHub
1. Dev crée un bug avec `/create-bug`
2. Bug documenté dans `bugs/YYYYMMDDHHMMSS-slug/bug.md`
3. Commande `lifefindsaway sync push` 
4. Issue GitHub créée automatiquement avec le contenu du bug.md
5. L'ID de l'issue est ajouté au bug.md local (lien bidirectionnel)

### Scénario 2 : Pull GitHub → local
1. Quelqu'un crée une Issue sur GitHub
2. Commande `lifefindsaway sync pull`
3. Un bug.md est créé localement avec le contenu de l'issue
4. Le bug apparaît dans le planning local

### Scénario 3 : Sync bidirectionnel
1. Commande `lifefindsaway sync` détecte les différences
2. Propose les actions : créer local, créer remote, mettre à jour
3. Gère les conflits (modification des deux côtés)

## Idées de solution (non exclusives)

### Option A : CLI avec gh (GitHub CLI)
Utiliser `gh` (GitHub CLI) pour créer/lire les issues :

```typescript
// lifefindsaway sync push
import { execSync } from 'child_process';

function pushBugToGitHub(bugPath: string) {
  const bug = parseBugMd(bugPath);
  const body = formatForGitHub(bug);
  
  // Créer l'issue via gh CLI
  const result = execSync(`gh issue create --title "${bug.title}" --body "${body}" --label bug`);
  
  // Extraire l'issue number et l'ajouter au bug.md
  const issueUrl = result.toString().trim();
  addGitHubLink(bugPath, issueUrl);
}
```

**Pros** : Simple, utilise des outils existants, pas besoin de token
**Cons** : Dépend de gh CLI installé et configuré

### Option B : API GitHub directe (Octokit)
Utiliser l'API GitHub via Octokit :

```typescript
import { Octokit } from '@octokit/rest';

async function syncBugs(direction: 'push' | 'pull' | 'both') {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  
  if (direction === 'push' || direction === 'both') {
    await pushLocalBugsToGitHub(octokit);
  }
  
  if (direction === 'pull' || direction === 'both') {
    await pullGitHubIssuesToLocal(octokit);
  }
}
```

**Pros** : Plus de contrôle, pas de dépendance externe
**Cons** : Nécessite un token GitHub, plus de code

### Option C : MCP GitHub Integration
Utiliser le MCP server GitHub existant :

```typescript
// Via CallMcpTool
async function createIssueViaMcp(bug: Bug) {
  return callMcpTool('user-github', 'create_issue', {
    owner: config.github.owner,
    repo: config.github.repo,
    title: bug.title,
    body: formatBugForGitHub(bug),
    labels: ['bug', bug.criticality.toLowerCase()]
  });
}
```

**Pros** : Réutilise l'infra MCP existante
**Cons** : Couplé à l'environnement Cursor/MCP

## Critères d'acceptation (brouillon)

- [ ] Commande `lifefindsaway sync push` pour pousser les bugs vers GitHub
- [ ] Commande `lifefindsaway sync pull` pour récupérer les issues GitHub
- [ ] Lien bidirectionnel : bug.md contient l'URL de l'issue, issue contient le lien vers le repo
- [ ] Labels GitHub mappés depuis la criticité du bug
- [ ] Gestion de l'état : open/closed synchronisé
- [ ] Dry-run mode pour prévisualiser les actions
- [ ] Configuration dans `lifefindsaway.yaml` (repo, labels, etc.)

## Contraintes connues

### Techniques
- Dépendance à gh CLI ou token GitHub
- Mapping des champs bug.md ↔ Issue (pas 1:1)
- Gestion des conflits si modifié des deux côtés

### Organisationnelles
- Décider de la source de vérité (local ou GitHub ?)
- Politique de synchronisation (auto, manuelle, hook ?)

## Hypothèses explicites
- ⚠️ Le format bug.md peut être converti en Markdown GitHub propre
- ⚠️ gh CLI ou token GitHub disponible
- ⚠️ Un seul repo GitHub par projet lifefindsaway

## Dépendances pressenties
- GitHub CLI (`gh`) ou Octokit
- Configuration du repo GitHub dans `lifefindsaway.yaml`
- Potentiellement : hook pre-commit ou CI/CD

## Questions ouvertes
- Quelle source de vérité ? Local-first ou GitHub-first ?
- Sync automatique (hook) ou manuelle (commande) ?
- Comment gérer les issues créées directement sur GitHub (pas via lifefindsaway) ?
- Faut-il supporter les labels, milestones, assignees ?
- Comment mapper la criticité (Bloquant/Majeur/Mineur) aux labels GitHub ?
- Faut-il fermer l'issue GitHub quand le bug passe en "fixed" localement ?

## Risques pressentis
- **Risque UX** : Trop de friction si sync manuelle trop fréquente
- **Risque data** : Désynchronisation / conflits
- **Risque technique** : Rate limits GitHub API
- **Risque scope** : Feature creep (sync features, epics, etc.)

## Indicateurs de succès (indicatifs)
- 90% des bugs locaux ont leur issue GitHub correspondante
- Pas de divergence > 24h entre local et GitHub
- Temps de sync < 5 secondes pour 50 bugs

## Notes libres

### Configuration suggérée

```yaml
# lifefindsaway.yaml
github:
  enabled: true
  owner: "elzinko"
  repo: "city-guided"
  sync:
    direction: "push"  # push | pull | both
    auto: false        # true = hook pre-commit
    labels:
      bloquant: "P0-critical"
      majeur: "P1-high"
      mineur: "P2-medium"
      cosmétique: "P3-low"
```

### Format du lien dans bug.md

```markdown
## Liens
- **GitHub Issue** : https://github.com/elzinko/city-guided/issues/42
- **Créé le** : 2026-01-23
- **Sync** : 2026-01-23T16:40:07Z
```

### Évolution future
- Sync des Features → GitHub Discussions ou Projects
- Sync des Epics → GitHub Milestones
- Webhook GitHub pour sync automatique bidirectionnelle
- GitHub Actions pour sync sur push

### Priorité
Cette feature est **non prioritaire** - nice-to-have pour améliorer le workflow mais pas bloquante pour l'utilisation de lifefindsaway.
