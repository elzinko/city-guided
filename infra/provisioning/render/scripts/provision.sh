#!/usr/bin/env bash
# Provisioning Render : validation du Blueprint + instructions pour créer la stack.
# La stack elle-même se crée depuis le Dashboard Render (New → Blueprint).
# Usage : depuis la racine du repo : pnpm run infra:provision:render
#         ou : bash infra/provisioning/render/scripts/provision.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RENDER_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(cd "$RENDER_DIR/../.." && pwd)"
BLUEPRINT_PATH="$RENDER_DIR/render.yaml"
ENV_EXAMPLE="$ROOT_DIR/infra/config/.env.render.example"

cd "$ROOT_DIR"

echo "═══════════════════════════════════════════════════════════════════════════════"
echo "  Render – Provisioning (validation + instructions)"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""

# 1. Vérifier que le Blueprint existe
if [ ! -f "$BLUEPRINT_PATH" ]; then
  echo "❌ Blueprint introuvable : $BLUEPRINT_PATH"
  exit 1
fi
echo "✅ Blueprint trouvé : infra/provisioning/render/render.yaml"
echo ""

# 2. Valider le Blueprint avec le CLI Render si disponible
if command -v render &>/dev/null; then
  echo "🔍 Validation du Blueprint (Render CLI)..."
  if render blueprints validate "$BLUEPRINT_PATH" 2>/dev/null; then
    echo "✅ Blueprint valide."
  else
    echo "⚠️  Validation CLI échouée ou erreur. Vérifie le fichier à la main."
  fi
else
  echo "ℹ️  Render CLI non installé. Pour valider le Blueprint :"
  echo "   brew install render   # ou voir https://render.com/docs/cli"
  echo "   render blueprints validate infra/provisioning/render/render.yaml"
fi
echo ""

# 3. Instructions pour créer la stack
echo "───────────────────────────────────────────────────────────────────────────────"
echo "  Création de la stack sur Render"
echo "───────────────────────────────────────────────────────────────────────────────"
echo ""
echo "1. Ouvre : https://dashboard.render.com/select-repo?type=blueprint"
echo "2. Connecte le repo GitHub (branche à déployer : ex. feature/staging ou main)."
echo "3. Chemin du Blueprint : infra/provisioning/render/render.yaml"
echo "4. Après création des services, renseigne les variables (sync: false) dans le"
echo "   Dashboard pour chaque service. Référence : $ENV_EXAMPLE"
echo ""
if [ -f "$ENV_EXAMPLE" ]; then
  echo "   Copie : cp infra/config/.env.render.example infra/config/.env.render"
  echo "   Puis remplis infra/config/.env.render et reporte les valeurs dans le Dashboard."
fi
echo ""
echo "5. Premier déploiement : l'API exécutera db:push (preDeployCommand)."
echo ""
echo "───────────────────────────────────────────────────────────────────────────────"
echo "  Doc complète : infra/provisioning/render/README.md"
echo "  Scripts      : pnpm run render:docs | pnpm run infra:provision:render"
echo "═══════════════════════════════════════════════════════════════════════════════"
