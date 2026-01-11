#!/bin/bash
# Script pour nettoyer les doublons et regrouper les commits restants

# Créer les messages de commit pour chaque groupe
cat > /tmp/commit-msg-e2e-final.txt << 'EOF'
test(e2e): add and fix E2E tests

- Add GPS button feature tests
- Fix step definitions for dev panel and bottom menu
- Add and correct E2E tests
EOF

cat > /tmp/commit-msg-lint-final.txt << 'EOF'
fix: correct linting errors and build issues

- Correct remaining linting errors in search-steps.ts
- Correct build errors and add type-check to pre-commit
- Remove unused variables and imports
- Resolve build errors after component extraction
EOF

# Créer le fichier de rebase avec les instructions (ordre chronologique)
cat > /tmp/rebase-todo << 'EOF'
pick 099eb3b test(e2e): add and fix E2E tests
squash e731218 test(e2e): add and fix E2E tests
squash b0fddd9 test(e2e): add and fix E2E tests
pick b0cb569 feat(ux): utiliser image PNG pour l'icône du panneau développeur
pick 6de1e94 feat(ux): lecteur GPS, panneau dev et infos de déploiement
pick c023cee fix(simulation): stop GPS simulation at end of route
pick 6c7b398 docs(aws): update provisioning README
pick 00fa567 feat(ui): add centralized UI rules configuration
pick 87d02a4 feat(story): add chapter player and story types
pick 750dd5b feat(admin): add virtual route editor
pick ce8232a fix: correct linting errors and build issues
squash ba6a35a fix: correct linting errors and build issues
squash 7a51223 fix: resolve build errors after component extraction
pick be72601 fix(ui): improve bottom-sheet positioning and z-index management
pick f75bec1 feat(mocks): enrich POI data with chapters structure
pick f02aee1 refactor(utils): update distance utilities
pick 2e57942 chore(scripts): update dev start script
pick a7c316a chore: remove old Playwright screenshots
pick 3ed9256 ci: disable e2e tests temporarily
pick 6669d00 fix(security): upgrade Next.js to v14.2.35 to resolve critical vulnerabilities
pick 3c81bad feat: add update-config script for rapid SSM parameter updates
pick 8ce1e9c feat: add standardized npm scripts for environment management
pick 9a51a85 fix: auto-setup Docker permissions on SSH connection
pick 84efc40 feat: add dedicated Docker network and data volume management scripts
pick c4eadd3 feat: add support for custom environment names and infrastructure destruction
pick b038549 refactor: decouple EC2/ECS infrastructure with modular deployers
EOF

# Créer un script éditeur pour le rebase
cat > /tmp/git-rebase-editor.sh << 'SCRIPT'
#!/bin/bash
cp /tmp/rebase-todo "$1"
SCRIPT

# Créer un script pour les messages de commit (squash)
cat > /tmp/git-commit-editor.sh << 'SCRIPT'
#!/bin/bash
# Détecter quel message utiliser selon le contexte
if grep -qi "test.*e2e\|e2e.*test" "$1" 2>/dev/null; then
    cp /tmp/commit-msg-e2e-final.txt "$1"
elif grep -qi "lint\|build.*error\|unused" "$1" 2>/dev/null; then
    cp /tmp/commit-msg-lint-final.txt "$1"
else
    # Pour les autres commits, garder le message original
    head -n 1 "$1" > "$1.tmp" 2>/dev/null || echo "" > "$1.tmp"
    mv "$1.tmp" "$1"
fi
SCRIPT

chmod +x /tmp/git-rebase-editor.sh
chmod +x /tmp/git-commit-editor.sh

# Utiliser ces scripts comme éditeurs
export GIT_SEQUENCE_EDITOR="/tmp/git-rebase-editor.sh"
export GIT_EDITOR="/tmp/git-commit-editor.sh"

# Lancer le rebase interactif depuis b835931
echo "Starting cleanup rebase from b835931..."
git rebase -i b835931
