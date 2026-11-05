// Outil NEXORA : création des liens d'activation de NEXORA Mobile.
//
// Sécurité :
// - La clé privée n'est jamais envoyée sur internet et n'est jamais enregistrée en clair.
//   Si vous la mémorisez, elle est chiffrée (AES-GCM 256, mot de passe dérivé par PBKDF2).
// - En mémoire, la clé est non exportable et elle est oubliée après 5 minutes en arrière-plan.
// - Chaque licence est liée au code du téléphone du client.
'use strict';

const BASE_DEFAUT = 'https://charly93exces.github.io/nexora/app/';
const STOCKAGE_CLE = 'nexora-cle-protegee';
const ITERATIONS = 310000;
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const $ = (id) => document.getElementById(id);
let cle = null; // CryptoKey non exportable
let jwkCharge = null; // contenu du fichier, gardé seulement le temps de proposer la mémorisation

const memoire = {
  lire(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  ecrire(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  effacer(k) { try { localStorage.removeItem(k); } catch (e) { /* stockage indisponible */ } },
};
// Ancienne version : la clé était mémorisée en clair. On l'efface.
memoire.effacer('nexora-cle');

const b64 = (o) => { const u = new Uint8Array(o); let s = ''; for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); };
const unb64 = (t) => Uint8Array.from(atob(t), (c) => c.charCodeAt(0));
const b64url = (o) => b64(o).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function cleMotDePasse(motDePasse, sel, usages) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(motDePasse), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: sel, iterations: ITERATIONS }, base,
    { name: 'AES-GCM', length: 256 }, false, usages);
}

async function importer(jwk) {
  if (!jwk || jwk.kty !== 'EC' || jwk.crv !== 'P-256' || !jwk.d) throw new Error('Ce fichier n\'est pas la clé privée NEXORA.');
  return crypto.subtle.importKey('jwk', { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, d: jwk.d },
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

function afficherEtat() {
  const protegee = !!memoire.lire(STOCKAGE_CLE);
  $('etat-pret').hidden = !cle;
  $('form').hidden = !cle;
  $('etat-protegee').hidden = !!cle || !protegee;
  $('etat-fichier').hidden = !!cle || protegee;
  $('memoriser-bloc').hidden = !(cle && jwkCharge && !protegee);
}

// ----- Charger le fichier de clé -----
$('fichier-cle').addEventListener('change', async () => {
  const f = $('fichier-cle').files[0];
  $('fichier-cle').value = '';
  if (!f) return;
  try {
    const jwk = JSON.parse(await f.text());
    cle = await importer(jwk);
    jwkCharge = { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, d: jwk.d };
    $('err-cle').textContent = '';
  } catch (e) {
    $('err-cle').textContent = e.message.includes('NEXORA') ? e.message : 'Fichier de clé illisible.';
  }
  afficherEtat();
});

// ----- Mémoriser la clé, chiffrée -----
$('memoriser').addEventListener('click', async () => {
  const m1 = $('mdp1').value;
  if (m1.length < 8) { $('err-mem').textContent = 'Mot de passe trop court : 8 caractères minimum.'; return; }
  if (m1 !== $('mdp2').value) { $('err-mem').textContent = 'Les deux mots de passe ne sont pas identiques.'; return; }
  const sel = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await cleMotDePasse(m1, sel, ['encrypt']);
  const chiffre = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(JSON.stringify(jwkCharge)));
  if (!memoire.ecrire(STOCKAGE_CLE, JSON.stringify({ sel: b64(sel), iv: b64(iv), donnees: b64(chiffre) }))) {
    $('err-mem').textContent = 'Impossible d\'enregistrer sur ce navigateur.';
    return;
  }
  jwkCharge = null;
  $('mdp1').value = ''; $('mdp2').value = ''; $('err-mem').textContent = '';
  afficherEtat();
});

// ----- Déverrouiller la clé mémorisée -----
async function ouvrir() {
  const paquet = JSON.parse(memoire.lire(STOCKAGE_CLE));
  try {
    const k = await cleMotDePasse($('mdp-ouvrir').value, unb64(paquet.sel), ['decrypt']);
    const clair = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(paquet.iv) }, k, unb64(paquet.donnees));
    cle = await importer(JSON.parse(new TextDecoder().decode(clair)));
    $('err-ouvrir').textContent = '';
  } catch (e) {
    $('err-ouvrir').textContent = 'Mot de passe incorrect.';
  }
  $('mdp-ouvrir').value = '';
  afficherEtat();
}
$('ouvrir').addEventListener('click', ouvrir);
$('mdp-ouvrir').addEventListener('keydown', (e) => { if (e.key === 'Enter') ouvrir(); });
$('oublier').addEventListener('click', () => {
  if (!confirm('Oublier la clé sur ce téléphone ? Vous devrez recharger le fichier de clé.')) return;
  memoire.effacer(STOCKAGE_CLE);
  cle = null;
  afficherEtat();
});

// Oublier la clé de la mémoire après 5 minutes en arrière-plan.
let cacheLe = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cacheLe = Date.now(); return; }
  if (cle && Date.now() - cacheLe > 5 * 60 * 1000) { cle = null; jwkCharge = null; afficherEtat(); }
});

// ----- Réglage de l'adresse -----
$('base').value = memoire.lire('nexora-base') || BASE_DEFAUT;
$('base').addEventListener('change', () => memoire.ecrire('nexora-base', $('base').value.trim()));

function numeroWhatsApp(tel, indicatif) {
  let d = String(tel || '').trim();
  const inter = d.startsWith('+') || d.startsWith('00');
  d = d.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (inter || (d.startsWith(indicatif) && d.length > 10)) return d;
  return indicatif + d;
}

// Mise en forme du code pendant la saisie : XXXX-XXXX
$('code').addEventListener('input', () => {
  const c = $('code').value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 8);
  $('code').value = c.length > 4 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
});

// ----- Créer une licence -----
$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('err-form').textContent = '';
  if (!cle) { afficherEtat(); return; }
  const nom = $('nom').value.trim();
  const code = $('code').value.toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (!nom) { $('err-form').textContent = 'Indiquez le nom de l\'atelier.'; return; }
  if (code.length !== 8 || [...code].some((c) => !ALPHABET.includes(c))) {
    $('err-form').textContent = 'Code du téléphone invalide : 8 caractères, comme affiché dans l\'application du client.';
    return;
  }
  const maintenant = new Date();
  const licence = {
    v: 2,
    id: 'NXM-' + maintenant.toISOString().slice(2, 10).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
    n: nom,
    a: code,
    d: maintenant.toISOString().slice(0, 10),
    ts: maintenant.getTime(),
  };
  const tel = $('tel').value.trim();
  if (tel) licence.t = tel;
  const mois = Number($('duree').value);
  if (mois) {
    const fin = new Date(maintenant);
    fin.setMonth(fin.getMonth() + mois);
    licence.exp = fin.toISOString().slice(0, 10);
  }
  const donnees = new TextEncoder().encode(JSON.stringify(licence));
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, cle, donnees);
  const base = ($('base').value.trim() || BASE_DEFAUT).replace(/#.*$/, '');
  const lien = `${base}#activer=${b64url(donnees)}.${b64url(signature)}`;
  const codeAffiche = `${code.slice(0, 4)}-${code.slice(4)}`;

  $('lien').value = lien;
  $('resume').textContent = `${nom} · téléphone ${codeAffiche} · ${licence.exp ? 'jusqu\'au ' + new Date(licence.exp).toLocaleDateString('fr-FR') : 'sans limite'} · n° ${licence.id}`;
  $('resultat').hidden = false;

  const message = `Bonjour, voici votre accès à *NEXORA Mobile* pour ${nom} :\n\n${lien}\n\n` +
    `Ce lien fonctionne uniquement sur le téléphone dont le code est ${codeAffiche}.\n` +
    `• Android : touchez le lien, il s'ouvre dans Chrome.\n` +
    `• iPhone : copiez le lien et collez-le dans l'application NEXORA.\n\nN° de licence : ${licence.id}`;
  $('envoyer').href = `https://wa.me/${tel ? numeroWhatsApp(tel, $('indicatif').value.replace(/\D/g, '') || '225') : ''}?text=${encodeURIComponent(message)}`;

  const journal = JSON.parse(memoire.lire('nexora-journal') || '[]');
  journal.unshift({ id: licence.id, n: nom, a: codeAffiche, t: tel, d: licence.d, exp: licence.exp || '' });
  memoire.ecrire('nexora-journal', JSON.stringify(journal.slice(0, 300)));
  afficherJournal();
  $('resultat').scrollIntoView({ behavior: 'smooth' });
});

$('copier').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('lien').value); } catch (e) { $('lien').select(); document.execCommand('copy'); }
  $('copier').textContent = 'Lien copié';
  setTimeout(() => { $('copier').textContent = 'Copier le lien'; }, 2000);
});

function afficherJournal() {
  let journal = [];
  try { journal = JSON.parse(memoire.lire('nexora-journal') || '[]'); } catch (e) { journal = []; }
  $('journal-bloc').hidden = !journal.length;
  $('journal').replaceChildren(...journal.map((l) => {
    const tr = document.createElement('tr');
    const a = document.createElement('td');
    const nom = document.createElement('b');
    nom.textContent = l.n;
    const details = document.createElement('div');
    details.className = 'muted small';
    details.textContent = [l.id, l.a, l.t].filter(Boolean).join(' · ');
    a.append(nom, details);
    const b = document.createElement('td');
    b.className = 'small';
    b.textContent = l.exp ? 'jusqu\'au ' + new Date(l.exp).toLocaleDateString('fr-FR') : 'sans limite';
    tr.append(a, b);
    return tr;
  }));
}

afficherEtat();
afficherJournal();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
