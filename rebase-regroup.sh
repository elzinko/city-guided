#!/bin/bash
# Script pour regrouper les commits par thème sur main

# Créer les messages de commit pour chaque groupe
cat > /tmp/commit-msg-docs.txt << 'EOF'
docs: update and consolidate documentation

- Simplify README and improve maintainability
- Add resume file
- Remove obsolete documentation files
- Update documentation files
- Update AWS provisioning README
EOF

cat > /tmp/commit-msg-zustand.txt << 'EOF'
refactor: migrate to Zustand state management

- Correct TypeScript errors in Zustand store usage
- Migrate to Zustand state management and fix UI positioning
EOF

cat > /tmp/commit-msg-bottom-sheet.txt << 'EOF'
fix(ui): improve bottom-sheet positioning and z-index management

- Preserve discover panel position when opening/closing POI
- Improve bottom-sheet positioning and z-index management
- Add z-index hierarchy and dev options visibility
EOF

cat > /tmp/commit-msg-components-ids.txt << 'EOF'
refactor(components): add IDs and extract components

- Add IDs to search components
- Extract components from index.tsx
- Update various components with IDs and improvements
- Add IDs and improve component structure
EOF

cat > /tmp/commit-msg-tests-e2e.txt << 'EOF'
test(e2e): add and fix E2E tests

- Add GPS button feature tests
- Fix step definitions for dev panel and bottom menu
- Add and correct E2E tests
EOF

cat > /tmp/commit-msg-lint-fix.txt << 'EOF'
fix: correct linting errors and build issues

- Correct remaining linting errors in search-steps.ts
- Correct build errors and add type-check to pre-commit
- Remove unused variables and imports
EOF

# Créer le fichier de rebase avec les instructions (ordre chronologique : plus ancien en premier)
cat > /tmp/rebase-todo << 'EOF'
pick 514f810 test(e2e): ajout et correction des tests E2E
squash 6106fb8 test(e2e): fix step definitions for dev panel and bottom menu
squash a7a2f81 test(e2e): add GPS button feature tests
pick 2ffff88 fix(lint): remove unused variables and imports
squash 5e4d3ce fix: correct build errors and add type-check to pre-commit
squash 1ff51d3 fix(lint): correct remaining linting errors in search-steps.ts
pick 3b802a5 feat(ux): utiliser image PNG pour l'icône du panneau développeur
pick b57a47a feat(ux): lecteur GPS, panneau dev et infos de déploiement
pick 7a94fba fix(simulation): stop GPS simulation at end of route
pick 5243ad0 docs(aws): update provisioning README
pick 52dae67 feat(ui): add centralized UI rules configuration
pick db65cea feat(story): add chapter player and story types
pick d236892 feat(admin): add virtual route editor
pick fe9d37e refactor(components): add IDs and improve component structure
squash f3de560 refactor(components): update various components with IDs and improvements
squash a86d19c refactor: extract components from index.tsx
squash c7e9caa feat: add IDs to search components
pick 1e5009b feat(config): add z-index hierarchy and dev options visibility
squash 61d6a95 fix: improve bottom-sheet positioning and z-index management
squash 10e1adb fix(bottom-sheet): preserve discover panel position when opening/closing POI
pick e6e13e1 feat(mocks): enrich POI data with chapters structure
pick b26a165 refactor(utils): update distance utilities
pick c0bca0d chore(scripts): update dev start script
pick 26ee85b docs: update documentation files
squash 8fe135d chore: remove obsolete documentation files
squash ce466a2 docs: add resume file
squash 5c7c4d9 docs: simplify README and improve maintainability
pick 36a4018 chore: remove old Playwright screenshots
pick 9287f59 ci: disable e2e tests temporarily
pick 9002904 fix: resolve build errors after component extraction
pick 7c7e5db fix(security): upgrade Next.js to v14.2.35 to resolve critical vulnerabilities
pick e7dc31a refactor: migrate to Zustand state management and fix UI positioning
squash 3f73aa3 fix: correct TypeScript errors in Zustand store usage
pick 8fc0d16 feat: add update-config script for rapid SSM parameter updates
pick 77ddd5e feat: add standardized npm scripts for environment management
pick 4defd00 fix: auto-setup Docker permissions on SSH connection
pick 8a6f4bb feat: add dedicated Docker network and data volume management scripts
pick 62f7161 feat: add support for custom environment names and infrastructure destruction
pick 39f4568 refactor: decouple EC2/ECS infrastructure with modular deployers
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
    cp /tmp/commit-msg-tests-e2e.txt "$1"
elif grep -qi "lint\|build.*error\|unused" "$1" 2>/dev/null; then
    cp /tmp/commit-msg-lint-fix.txt "$1"
elif grep -qi "component.*id\|id.*component\|extract.*component" "$1" 2>/dev/null; then
    cp /tmp/commit-msg-components-ids.txt "$1"
elif grep -qi "bottom.*sheet\|z-index\|zIndex" "$1" 2>/dev/null; then
    cp /tmp/commit-msg-bottom-sheet.txt "$1"
elif grep -qi "zustand\|state.*management" "$1" 2>/dev/null; then
    cp /tmp/commit-msg-zustand.txt "$1"
elif grep -qi "docs\|documentation\|readme" "$1" 2>/dev/null; then
    cp /tmp/commit-msg-docs.txt "$1"
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
echo "Starting rebase from b835931..."
git rebase -i b835931
