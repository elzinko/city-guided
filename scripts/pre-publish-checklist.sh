#!/usr/bin/env bash

# Pre-publish checklist pour @bacasable/lifefindsaway et @bacasable/iamthelaw
# Vérifie que tout est prêt avant la première publication

set -e

REPO_ROOT=$(git rev-parse --show-toplevel)

echo ""
echo "================================================"
echo "Pre-publish Checklist"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_passed=0
check_failed=0

check_item() {
    local name=$1
    local command=$2
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name"
        ((check_passed++))
        return 0
    else
        echo -e "${RED}✗${NC} $name"
        ((check_failed++))
        return 1
    fi
}

check_item_manual() {
    local name=$1
    local message=$2
    
    echo -e "${YELLOW}?${NC} $name"
    echo "  $message"
}

echo "1. Configuration GitHub Token"
echo "───────────────────────────────"
check_item "~/.npmrc existe" "test -f ~/.npmrc"
check_item "Registry GitHub configuré" "grep -q 'npm.pkg.github.com' ~/.npmrc"
check_item "Token configuré" "grep -q '_authToken' ~/.npmrc"
echo ""

echo "2. Packages - Configuration"
echo "───────────────────────────────"
check_item "lifefindsaway/package.json a scope @bacasable" "grep -q '@bacasable/lifefindsaway' $REPO_ROOT/.lifefindsaway/package.json"
check_item "iamthelaw/package.json a scope @bacasable" "grep -q '@bacasable/iamthelaw' $REPO_ROOT/.iamthelaw/package.json"
check_item "lifefindsaway/LICENSE existe" "test -f $REPO_ROOT/.lifefindsaway/LICENSE"
check_item "iamthelaw/LICENSE existe" "test -f $REPO_ROOT/.iamthelaw/LICENSE"
check_item "lifefindsaway/CHANGELOG.md existe" "test -f $REPO_ROOT/.lifefindsaway/CHANGELOG.md"
check_item "iamthelaw/CHANGELOG.md existe" "test -f $REPO_ROOT/.iamthelaw/CHANGELOG.md"
echo ""

echo "3. TypeScript Configuration"
echo "───────────────────────────────"
check_item "lifefindsaway/tsconfig.json existe" "test -f $REPO_ROOT/.lifefindsaway/tsconfig.json"
check_item "iamthelaw/tsconfig.json existe" "test -f $REPO_ROOT/.iamthelaw/tsconfig.json"
check_item "lifefindsaway génère .d.ts" "grep -q '\"declaration\": true' $REPO_ROOT/.lifefindsaway/tsconfig.json"
check_item "iamthelaw génère .d.ts" "grep -q '\"declaration\": true' $REPO_ROOT/.iamthelaw/tsconfig.json"
echo ""

echo "4. Build"
echo "───────────────────────────────"

# Test lifefindsaway build
cd "$REPO_ROOT/.lifefindsaway"
if pnpm install --ignore-workspace > /dev/null 2>&1 && pnpm build > /dev/null 2>&1; then
    check_item "lifefindsaway build" "test -d dist && test -f dist/cli.js"
else
    echo -e "${RED}✗${NC} lifefindsaway build"
    ((check_failed++))
fi

# Test iamthelaw build
cd "$REPO_ROOT/.iamthelaw"
if pnpm install --ignore-workspace > /dev/null 2>&1 && pnpm build > /dev/null 2>&1; then
    check_item "iamthelaw build" "test -d dist && test -f dist/cli.js"
else
    echo -e "${RED}✗${NC} iamthelaw build"
    ((check_failed++))
fi

cd "$REPO_ROOT"
echo ""

echo "5. Scripts"
echo "───────────────────────────────"
check_item "publish-package.sh existe" "test -f $REPO_ROOT/scripts/publish-package.sh"
check_item "publish-package.sh exécutable" "test -x $REPO_ROOT/scripts/publish-package.sh"
check_item "test-packages.sh existe" "test -f $REPO_ROOT/scripts/test-packages.sh"
check_item "test-packages.sh exécutable" "test -x $REPO_ROOT/scripts/test-packages.sh"
echo ""

echo "6. Documentation"
echo "───────────────────────────────"
check_item "PACKAGES.md existe" "test -f $REPO_ROOT/PACKAGES.md"
check_item "QUICKSTART-PACKAGES.md existe" "test -f $REPO_ROOT/QUICKSTART-PACKAGES.md"
check_item "VERSIONING.md existe" "test -f $REPO_ROOT/VERSIONING.md"
check_item "INDEX.md existe" "test -f $REPO_ROOT/INDEX.md"
check_item "lifefindsaway/PUBLISH.md existe" "test -f $REPO_ROOT/.lifefindsaway/PUBLISH.md"
check_item "iamthelaw/PUBLISH.md existe" "test -f $REPO_ROOT/.iamthelaw/PUBLISH.md"
echo ""

echo "7. Git"
echo "───────────────────────────────"
check_item "Dans un repo Git" "git rev-parse --git-dir"
check_item "Pas de changements non commités" "test -z \"\$(git status --porcelain)\""
echo ""

echo "8. GitHub Actions"
echo "───────────────────────────────"
check_item "Workflow publish-packages.yml existe" "test -f $REPO_ROOT/.github/workflows/publish-packages.yml"
echo ""

echo "================================================"
echo "Résumé"
echo "================================================"
echo ""
echo -e "${GREEN}✓ Checks passed: $check_passed${NC}"
if [ $check_failed -gt 0 ]; then
    echo -e "${RED}✗ Checks failed: $check_failed${NC}"
fi
echo ""

if [ $check_failed -eq 0 ]; then
    echo -e "${GREEN}🎉 Tout est prêt pour la publication !${NC}"
    echo ""
    echo "Prochaines étapes:"
    echo "  1. Vérifiez que votre token GitHub est valide"
    echo "  2. Lancez: ./scripts/test-packages.sh"
    echo "  3. Publiez: ./scripts/publish-package.sh both patch"
    echo ""
    exit 0
else
    echo -e "${RED}⚠️  Certains checks ont échoué.${NC}"
    echo ""
    echo "Actions recommandées:"
    if ! grep -q '_authToken' ~/.npmrc 2>/dev/null; then
        echo "  → Configurez votre token GitHub dans ~/.npmrc"
        echo "    Voir: npmrc.user.example"
    fi
    if [ ! -d "$REPO_ROOT/.lifefindsaway/dist" ] || [ ! -d "$REPO_ROOT/.iamthelaw/dist" ]; then
        echo "  → Lancez un build: cd .lifefindsaway && pnpm build"
        echo "  → Lancez un build: cd .iamthelaw && pnpm build"
    fi
    if [ -n "$(git status --porcelain)" ]; then
        echo "  → Commitez vos changements: git add . && git commit -m 'message'"
    fi
    echo ""
    echo "Pour plus d'aide, consultez: PACKAGES.md"
    echo ""
    exit 1
fi
