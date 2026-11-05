// Outils de sécurité : code d'accès de l'application et chiffrement des sauvegardes.
import { db } from './db.js';

// ---------- Base64 (gère les gros fichiers) ----------

export function versB64(octets) {
  const u = octets instanceof Uint8Array ? octets : new Uint8Array(octets);
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
}
export function depuisB64(texte) {
  const b = atob(texte);
  const u = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return u;
}

async function cleDerivee(motDePasse, sel, iterations, usages) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(motDePasse), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
  if (usages === 'bits') {
    return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sel, iterations }, base, 256));
  }
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: sel, iterations }, base,
    { name: 'AES-GCM', length: 256 }, false, usages);
}

// ---------- Chiffrement des sauvegardes (AES-GCM 256, clé dérivée du mot de passe) ----------

const ITER_SAUVEGARDE = 250000;

export async function chiffrer(texte, motDePasse) {
  const sel = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cle = await cleDerivee(motDePasse, sel, ITER_SAUVEGARDE, ['encrypt']);
  const chiffre = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cle, new TextEncoder().encode(texte));
  return { algo: 'AES-GCM-256/PBKDF2-SHA256', iterations: ITER_SAUVEGARDE, sel: versB64(sel), iv: versB64(iv), donnees: versB64(chiffre) };
}

export async function dechiffrer(paquet, motDePasse) {
  const cle = await cleDerivee(motDePasse, depuisB64(paquet.sel), paquet.iterations || ITER_SAUVEGARDE, ['decrypt']);
  try {
    const clair = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: depuisB64(paquet.iv) }, cle, depuisB64(paquet.donnees));
    return new TextDecoder().decode(clair);
  } catch (e) {
    throw new Error('Mot de passe incorrect.');
  }
}

// ---------- Code d'accès de l'application ----------
// Le code n'est jamais enregistré : seule son empreinte PBKDF2 (avec sel) l'est.

const ITER_CODE = 150000;
let echecs = 0;
let bloqueJusqua = 0;

export async function codeAccesActif() {
  return !!(await db.reglage('verrou', null));
}

export async function definirCodeAcces(code) {
  const sel = crypto.getRandomValues(new Uint8Array(16));
  const empreinte = await cleDerivee(code, sel, ITER_CODE, 'bits');
  await db.definir('verrou', { sel: versB64(sel), empreinte: versB64(empreinte), cree: Date.now() });
}

export async function retirerCodeAcces() {
  await db.definir('verrou', null);
}

/** Vérifie le code. Après 5 erreurs, attente croissante (30 s, 60 s, …). */
export async function verifierCodeAcces(code) {
  const v = await db.reglage('verrou', null);
  if (!v) return { ok: true };
  const attente = Math.ceil((bloqueJusqua - Date.now()) / 1000);
  if (attente > 0) return { ok: false, erreur: `Trop d'essais. Réessayez dans ${attente} s.` };
  const essai = versB64(await cleDerivee(String(code), depuisB64(v.sel), ITER_CODE, 'bits'));
  if (essai === v.empreinte) { echecs = 0; return { ok: true }; }
  echecs += 1;
  if (echecs >= 5) bloqueJusqua = Date.now() + 30000 * (echecs - 4);
  return { ok: false, erreur: echecs >= 5 ? 'Code incorrect. Trop d\'essais : patientez 30 secondes.' : 'Code incorrect.' };
}

/** Un nouveau lien d'activation (créé après le code) retire le code oublié. */
export async function retirerSiLienPlusRecent(licence) {
  const v = await db.reglage('verrou', null);
  if (v && licence && licence.ts && licence.ts > v.cree) {
    await retirerCodeAcces();
    return true;
  }
  return false;
}
