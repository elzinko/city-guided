#!/bin/bash

# Script pour démarrer l'application en mode développement avec toutes les options activées

echo "🚀 Démarrage de CityGuided avec options développeur..."
echo "   - API: http://localhost:3001"
echo "   - Frontend: http://localhost:3080"
echo "   - Options dev: ACTIVÉES"
echo ""

# Démarrer avec OSRM et options dev activées
API_PORT=3001 WEB_PORT=3080 NEXT_PUBLIC_SHOW_DEV_OPTIONS=true SKIP_OSRM=1 pnpm dev