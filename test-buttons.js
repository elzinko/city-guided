#!/usr/bin/env node

/**
 * Script de test automatique pour vérifier que tous les boutons fonctionnent
 * Utilise Playwright pour tester l'application CityGuided
 */

const { chromium } = require('playwright');

async function testButtons() {
  console.log('🧪 Test des boutons CityGuided...\n');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Aller sur l'application
    console.log('📱 Navigation vers http://localhost:3080...');
    await page.goto('http://localhost:3080', { waitUntil: 'networkidle' });

    // Attendre que les boutons soient chargés
    await page.waitForSelector('button', { timeout: 5000 });

    // Test 1: Bouton "Démarrer la visite guidée"
    console.log('▶️  Test 1: Bouton "Démarrer la visite guidée"...');
    const startButton = page.locator('button:has-text("Démarrer la visite guidée")');
    await startButton.click();

    // Vérifier que le bouton change
    const stopButton = page.locator('button:has-text("Arrêter la visite guidée")');
    await stopButton.waitFor({ state: 'visible', timeout: 1000 });
    console.log('✅ Bouton transformé en "Arrêter la visite guidée"');

    // Test 2: Bouton développeur
    console.log('🔧 Test 2: Bouton développeur...');
    const devButton = page.locator('button:has-text("Développeur")');
    await devButton.click();

    // Attendre que le panneau développeur apparaisse
    await page.waitForSelector('button:has-text("Activer l\'audio")', { timeout: 2000 });
    console.log('✅ Panneau développeur ouvert');

    // Test 3: Bouton audio
    console.log('🔊 Test 3: Bouton audio...');
    const audioButton = page.locator('button:has-text("Activer l\'audio")');
    await audioButton.click();

    // Vérifier le changement
    const audioOffButton = page.locator('button:has-text("Couper l\'audio")');
    await audioOffButton.waitFor({ state: 'visible', timeout: 1000 });
    console.log('✅ Bouton audio transformé en "Couper l\'audio"');

    // Test 4: Contrôle de zoom
    console.log('🔍 Test 4: Contrôle de zoom...');
    const zoomValue = page.locator('text=14'); // Valeur initiale
    await zoomValue.waitFor({ state: 'visible', timeout: 1000 });

    const zoomUpButton = page.locator('button[title="Zoom avant"]');
    await zoomUpButton.click();

    const zoomValue15 = page.locator('text=15'); // Valeur après zoom
    await zoomValue15.waitFor({ state: 'visible', timeout: 1000 });
    console.log('✅ Zoom augmenté de 14 à 15');

    // Test 5: Bouton catégorie
    console.log('🏰 Test 5: Bouton catégorie "Château"...');
    const chateauButton = page.locator('button:has-text("Château")');
    await chateauButton.click();
    console.log('✅ Bouton "Château" cliqué');

    // Vérifier les logs de console
    const logs = [];
    page.on('console', msg => {
      if (msg.text().includes('QUICK SELECT') || msg.text().includes('Simulation')) {
        logs.push(msg.text());
      }
    });

    console.log('\n📋 Logs détectés:');
    logs.forEach(log => console.log(`   ${log}`));

    console.log('\n🎉 Tous les tests sont passés avec succès !');
    console.log('🎯 Les boutons fonctionnent parfaitement.');

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testButtons();