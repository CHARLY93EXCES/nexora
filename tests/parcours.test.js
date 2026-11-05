const { chromium, devices } = require('playwright');
const { jeton, fichierCle, dossier, preparer } = require('./aides.js');
const S = dossier + '/';
const BASE = (process.env.NEXORA_URL || 'http://127.0.0.1:8765/') + 'app/';
const log = (...a) => console.log('•', ...a);

(async () => {
  const b = await chromium.launch();
  const ctx = await preparer(await b.newContext({ ...devices['Pixel 5'], acceptDownloads: true, locale: 'fr-FR' , serviceWorkers: 'block' }));
  const erreurs = [];
  const wa = [];
  await ctx.route('https://wa.me/**', (r) => { wa.push(decodeURIComponent(r.request().url())); r.fulfill({ body: 'ok' }); });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => erreurs.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') erreurs.push('console: ' + m.text()); });
  const fermerFeuille = async () => { await p.click('.sheet-head .icon-btn'); await p.waitForTimeout(250); };

  // 1. Écran d'activation
  await p.goto(BASE);
  await p.waitForSelector('.activation');
  await p.screenshot({ path: S + '01-activation.png' });
  await p.fill('.activation textarea', 'nimporte quoi');
  await p.click('.activation button[type=submit]');
  log('texte invalide →', await p.textContent('.activation .err'));

  // Jeton falsifié (atelier modifié)
  const code = (await p.textContent('.device-code')).replace('-', '');
  const vrai = jeton({ v: 2, id: 'NXM-TEST', n: 'Koné Phone', a: code, d: '2026-11-05', ts: Date.now() });
  const faux = Buffer.from(JSON.stringify({ v: 2, id: 'NXM-TEST', n: 'Pirate', a: code, d: '2026-11-05', ts: Date.now() })).toString('base64url') + '.' + vrai.split('.')[1];
  await p.goto(BASE + '#activer=' + faux);
  await p.waitForSelector('.activation');
  log('jeton falsifié →', await p.textContent('.activation .err'));
  // Jeton expiré
  await p.goto(BASE + '#activer=' + jeton({ v: 2, id: 'NXM-OLD', n: 'Vieux', a: code, d: '2025-01-01', ts: 1, exp: '2025-12-31' }));
  await p.waitForSelector('.activation');
  log('jeton expiré →', await p.textContent('.activation .err'));
  // Lien collé (cas iPhone)
  await p.fill('.activation textarea', 'Voici votre accès : ' + BASE + '#activer=' + vrai + ' merci');
  await p.click('.activation button[type=submit]');
  await p.waitForSelector('.sheet');
  log('activation par lien collé → feuille :', await p.textContent('.sheet-head h2'));
  await p.screenshot({ path: S + '02-bienvenue.png' });

  // 2. Configurer l'atelier
  await p.click('.sheet .btn.primary');
  await p.waitForSelector('form .logo-row');
  log('nom prérempli depuis la licence :', await p.inputValue('form input[placeholder="Nom de votre atelier"]'));
  await p.fill('input[placeholder="Quartier, ville"]', 'Cité, San-Pedro');
  await p.fill('input[placeholder="07 00 00 00 00"]', '07 11 22 33 44');
  await p.click('form button[type=submit]');
  await p.waitForSelector('.row-link');

  // 3. Une pièce en stock
  await p.goto(BASE + '#/stock');
  await p.waitForSelector('.stats');
  await p.click('#action .icon-btn');
  await p.fill('.sheet input[placeholder^="Écran OLED"]', 'Écran');
  await p.fill('.sheet input[placeholder^="iPhone 11"]', 'Galaxy A14');
  const nums = await p.$$('.sheet input[type=number]');
  await nums[0].fill('3'); await nums[1].fill('1'); await nums[2].fill('18000'); await nums[3].fill('35000');
  await p.click('.sheet button[type=submit]');
  await p.waitForTimeout(400);
  log('stock :', (await p.textContent('.list')).replace(/\s+/g, ' ').trim());

  // 4. Nouvelle réparation
  await p.goto(BASE + '#/reparation/nouvelle');
  await p.waitForSelector('form .card');
  await p.fill('input[placeholder="Nom du client"]', 'Awa Koné');
  await p.fill('input[placeholder="07 00 00 00 00"]', '07 08 09 10 11');
  await p.fill('input[placeholder^="Samsung, Tecno"]', 'Samsung');
  await p.fill('input[placeholder^="Galaxy A14, Spark"]', 'Galaxy A14');
  await p.fill('input[placeholder^="Tapez *#06#"]', '356789101112131');
  await p.click('button.chip:has-text("Écran cassé")');
  await p.click('.chip-choice:has-text("Écran fissuré")');
  await p.click('.chip-choice:has-text("Chargeur")');
  await p.fill('input[placeholder^="Code PIN"]', '1234');
  await p.setInputFiles('input[type=file]', S + '01-activation.png').catch(() => {});
  await p.waitForTimeout(500);
  const acompte = await p.$$('form input[type=number]');
  await acompte[0].fill('10000');
  await p.screenshot({ path: S + '03-nouvelle.png', fullPage: true });
  await p.click('form button[type=submit]');
  await p.waitForSelector('.sheet-head h2');
  log('après création →', await p.textContent('.sheet-head h2'));
  await p.screenshot({ path: S + '04-dossier-cree.png' });
  await p.click('.sheet .btn.primary'); // bon de dépôt
  await p.waitForSelector('.preview img');
  await p.waitForTimeout(300);
  await p.screenshot({ path: S + '05-bon-depot.png' });
  const dl = p.waitForEvent('download', { timeout: 5000 }).catch(() => null);
  await p.click('.sheet .btn.primary:has-text("Partager")');
  const d1 = await dl; log('bon de dépôt partagé/téléchargé :', d1 ? d1.suggestedFilename() : 'partage natif');
  await fermerFeuille();
  await p.screenshot({ path: S + '06-fiche.png', fullPage: true });

  // 5. Diagnostic guidé
  await p.click('a:has-text("Diagnostic guidé")');
  await p.waitForSelector('.search input');
  await p.fill('.search input', 'écran cassé');
  await p.waitForTimeout(200);
  await p.click('.row-link:has-text("Écran cassé")');
  await p.waitForSelector('.steps-check');
  const cases = await p.$$('.steps-check input');
  await cases[0].check(); await cases[1].check();
  await p.click('.line:has-text("Remplacement écran complet") button');
  await p.waitForSelector('.sheet select');
  const opt = await p.$$eval('.sheet select:first-of-type option', (o) => o.map((x) => x.textContent));
  log('pièces proposées :', opt.join(' | '));
  const sel = await p.$$('.sheet select');
  await sel[0].selectOption({ index: 1 });
  await p.click('.sheet button[type=submit]');
  await p.waitForTimeout(400);
  await p.click('.line:has-text("Remplacement vitre seule") button');
  await p.waitForSelector('.sheet');
  const n2 = await p.$$('.sheet input[type=number]');
  await n2[1].fill('5000');
  await p.click('.sheet button[type=submit]');
  await p.waitForTimeout(400);
  await p.screenshot({ path: S + '07-diagnostic.png', fullPage: true });
  await p.click('a:has-text("Voir le devis")');
  await p.waitForSelector('.head-top');

  // 6. Devis accepté → en réparation → prêt
  await p.click('button.chip:has-text("Accepté")');
  await p.waitForTimeout(500);
  log('statut après devis accepté :', await p.textContent('.head-top .badge'));
  await p.click('.action:has-text("Statut")');
  await p.click('.status-opt:has-text("Prêt à récupérer")');
  await p.waitForSelector('.sheet-head h2:has-text("WhatsApp")');
  await p.screenshot({ path: S + '08-whatsapp.png' });
  await p.click('.sheet a.btn.whatsapp');
  await p.waitForTimeout(800);
  log('message WhatsApp « prêt » :', wa[wa.length - 1]);
  await p.goto(BASE + '#/stock');
  await p.waitForSelector('.qty');
  log('stock écran après « Prêt » :', await p.textContent('.qty'));

  // 7. Livraison avec reste à payer
  await p.goto(BASE + '#/reparations?pret');
  await p.waitForSelector('.item');
  await p.click('.list .item');
  await p.waitForSelector('.head-top');
  log('reste à payer :', (await p.textContent('.card:has-text("Paiements") .kv.total')).replace(/\s+/g, ' '));
  await p.click('.action:has-text("Statut")');
  await p.click('.status-opt:has-text("Livré au client")');
  await p.click('.sheet button:has-text("Encaisser puis livrer")');
  await p.waitForSelector('.sheet-head h2:has-text("Encaisser")');
  await p.click('.sheet button.chip:has-text("Wave")');
  await p.click('.sheet button[type=submit]');
  await p.waitForSelector('.preview img');
  await p.waitForTimeout(400);
  await p.screenshot({ path: S + '09-recu.png' });
  await fermerFeuille();
  await p.waitForTimeout(400);
  log('après livraison :', await p.textContent('.head-top .badge'), '| code :', await p.$('.code') ? 'encore là' : 'effacé');
  await p.screenshot({ path: S + '10-fiche-livree.png', fullPage: true });

  // 8. Accueil
  await p.goto(BASE + '#/');
  await p.waitForSelector('.stats');
  await p.screenshot({ path: S + '11-accueil.png', fullPage: true });
  log('stats :', (await p.textContent('.stats')).replace(/\s+/g, ' '));

  // 9. Sauvegarde puis restauration
  await p.goto(BASE + '#/plus');
  await p.waitForSelector('.card');
  await p.check('label.check input');
  const dl2 = p.waitForEvent('download');
  await p.click('button:has-text("Sauvegarder maintenant")');
  const d2 = await dl2;
  const chemin = S + d2.suggestedFilename();
  await d2.saveAs(chemin);
  log('sauvegarde :', d2.suggestedFilename());
  await p.screenshot({ path: S + '12-plus.png', fullPage: true });
  await p.setInputFiles('input[type=file]', chemin);
  await p.waitForSelector('.sheet');
  log('résumé restauration :', await p.textContent('.sheet p'));
  await p.click('.sheet .btn.danger');
  await p.waitForTimeout(800);
  log('après restauration, dossiers :', await p.$$eval('.item', (x) => x.length));

  // Le mode hors ligne (service worker) se vérifie à part : il est désactivé ici pour substituer la clé de test.

  // 11. Impression A4 (aperçu)
  await p.goto(BASE + '#/reparations?tous');
  await p.waitForSelector('.item');
  await p.click('.list .item');
  await p.waitForSelector('.head-top');
  await p.evaluate(() => { window.print = () => {}; });
  await p.click('.action:has-text("Reçu")');
  await p.click('.sheet button.chip:has-text("A4")');
  await p.waitForTimeout(400);
  await p.click('.sheet button:has-text("Imprimer")');
  await p.emulateMedia({ media: 'print' });
  await p.setViewportSize({ width: 794, height: 1123 });
  await p.screenshot({ path: S + '13-a4.png', fullPage: true });
  await p.emulateMedia({ media: 'screen' });

  console.log('\nERREURS :', erreurs.length ? erreurs : 'aucune');
  await b.close();
})().catch((e) => { console.error('ÉCHEC DU TEST :', e); process.exit(1); });
