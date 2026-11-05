// Aides communes aux tests.
// Les tests créent une clé de licence TEMPORAIRE et la substituent à la clé publique de l'application
// pendant le test : la vraie clé privée de NEXORA n'est jamais nécessaire ni utilisée.
const c = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { publicKey, privateKey } = c.generateKeyPairSync('ec', { namedCurve: 'P-256' });
const pub = publicKey.export({ format: 'jwk' });

/** Signe une licence avec la clé temporaire (même format que l'outil de licences). */
function jeton(payload) {
  const data = Buffer.from(JSON.stringify(payload));
  const sig = c.sign('sha256', data, { key: privateKey, dsaEncoding: 'ieee-p1363' });
  return data.toString('base64url') + '.' + sig.toString('base64url');
}

/** Fichier de clé privée temporaire, pour tester l'outil de licences. */
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-tests-'));
const fichierCle = path.join(dossier, 'cle-test.json');
fs.writeFileSync(fichierCle, JSON.stringify(privateKey.export({ format: 'jwk' })));

/** Remplace la clé publique de l'application par la clé temporaire, dans ce contexte de navigateur. */
async function preparer(ctx) {
  await ctx.route('**/app/js/licence.js', async (route) => {
    const rep = await route.fetch();
    const code = (await rep.text())
      .replace(/\bx: '[^']+'/, `x: '${pub.x}'`)
      .replace(/\by: '[^']+'/, `y: '${pub.y}'`);
    await route.fulfill({ response: rep, body: code });
  });
  // Pas de service worker pendant les tests : il servirait la vraie clé depuis son cache.
  return ctx;
}

module.exports = { jeton, fichierCle, dossier, preparer };
