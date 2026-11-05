// Licence NEXORA Mobile.
// L'accès se fait par un lien d'activation signé, envoyé par NEXORA après achat.
// La signature est vérifiée sur le téléphone avec la clé publique ci-dessous :
// sans la clé privée (gardée par NEXORA, jamais publiée), personne ne peut créer de licence.
import { db } from './db.js';

const CLE_PUBLIQUE = {
  kty: 'EC',
  crv: 'P-256',
  x: 'ZT5rg7g6HFnVPrVsqZKTn_b-HunlqQ_EaC56EgPA-vo',
  y: 'uOuNNVXD550uNOYuZmSG7tSm3yBWaEg_gIh7Q1IH_Gg',
};

function b64urlVersOctets(s) {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

/** Extrait le jeton d'un lien complet, d'un texte collé ou d'un jeton seul. */
export function extraireJeton(texte) {
  const t = String(texte || '').trim();
  const m = t.match(/activer=([A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+)/);
  if (m) return m[1];
  const n = t.match(/^[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+$/);
  return n ? t : null;
}

/** Vérifie un jeton. Retourne { ok, licence, erreur }. */
export async function verifier(jeton) {
  try {
    const [partie, signature] = jeton.split('.');
    const donnees = b64urlVersOctets(partie);
    const cle = await crypto.subtle.importKey('jwk', CLE_PUBLIQUE, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const valide = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, cle, b64urlVersOctets(signature), donnees);
    if (!valide) return { ok: false, erreur: 'Ce lien d\'activation n\'est pas valide.' };
    const licence = JSON.parse(new TextDecoder().decode(donnees));
    if (licence.exp && licence.exp < new Date().toISOString().slice(0, 10)) {
      return { ok: false, licence, erreur: `Cette licence a expiré le ${new Date(licence.exp).toLocaleDateString('fr-FR')}.` };
    }
    return { ok: true, licence };
  } catch (e) {
    return { ok: false, erreur: 'Ce lien d\'activation est incomplet ou abîmé. Copiez-le en entier.' };
  }
}

export async function licenceActive() {
  const jeton = await db.reglage('licence', null);
  if (!jeton) return { ok: false };
  return verifier(jeton);
}

export async function activer(jeton) {
  const r = await verifier(jeton);
  if (r.ok) await db.definir('licence', jeton);
  return r;
}
