#!/usr/bin/env node

/**
 * Script simple pour vérifier que l'application fonctionne
 * Test l'API et vérifie les services de base
 */

const https = require('http');

// Utilise les variables d'environnement si définies, sinon les valeurs par défaut
const API_PORT = process.env.API_PORT || '3001';
const WEB_PORT = process.env.WEB_PORT || '3080';

const API_URL = `http://localhost:${API_PORT}`;
const FRONTEND_URL = `http://localhost:${WEB_PORT}`;

async function checkService(url, name) {
  try {
    console.log(`🔍 Vérification de ${name}...`);

    const response = await new Promise((resolve, reject) => {
      const req = https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      req.on('error', reject);
      req.setTimeout(5000, () => reject(new Error('Timeout')));
    });

    if (response.status === 200) {
      console.log(`✅ ${name} fonctionne (${response.status})`);
      return true;
    } else {
      console.log(`❌ ${name} retourne ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name} ne répond pas: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Vérification de l\'application CityGuided...\n');

  // Vérifier l'API
  const apiOk = await checkService(`${API_URL}/api/health`, 'API');

  // Vérifier le frontend (page d'accueil)
  const frontendOk = await checkService(FRONTEND_URL, 'Frontend');

  console.log('\n' + '='.repeat(50));

  if (apiOk && frontendOk) {
    console.log('🎉 Application CityGuided opérationnelle !');
    console.log('   - API: http://localhost:3001');
    console.log('   - Frontend: http://localhost:3080');
    process.exit(0);
  } else {
    console.log('❌ Problèmes détectés:');
    if (!apiOk) console.log('   - API ne répond pas');
    if (!frontendOk) console.log('   - Frontend ne répond pas');
    process.exit(1);
  }
}

main().catch(console.error);