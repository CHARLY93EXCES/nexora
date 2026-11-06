// Licence NEXORA Mobile.
//
// Sécurité :
// - Le lien d'activation est signé (ECDSA P-256). La signature est vérifiée sur le téléphone avec la
//   clé publique ci-dessous ; sans la clé privée (gardée par NEXORA, jamais publiée), personne ne
//   peut créer ni modifier une licence.
// - Chaque licence est liée au code d'UN téléphone : un lien partagé ne fonctionne pas ailleurs.
// - La date d'expiration est protégée contre le recul de l'horloge du téléphone.
import { db } from './db.js';

const CLE_PUBLIQUE = {
  kty: 'EC',
  crv: 'P-256',
  x: 'ZT5rg7g6HFnVPrVsqZKTn_b-HunlqQ_EaC56EgPA-vo',
  y: 'uOuNNVXD550uNOYuZmSG7tSm3yBWaEg_gIh7Q1IH_Gg',
};
const VERSION_LICENCE = 2;

// Caractères sans ambiguïté (pas de 0/O ni 1/I) pour un code facile à lire et à dicter.
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/** Code unique de ce téléphone, créé au premier lancement. */
export async function codeAppareil() {
  let code = await db.reglage('appareil', null);
  if (!code) {
    code = [...crypto.getRandomValues(new Uint8Array(8))].map((o) => ALPHABET[o % 32]).join('');
    await db.definir('appareil', code);
  }
  return code;
}
export const formaterCode = (c) => `${c.slice(0, 4)}-${c.slice(4)}`;
export const normaliserCode = (s) => String(s || '').toUpperCase().replace(/[^0-9A-Z]/g, '');

function b64urlVersOctets(s) {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

export function jourLocal(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Extrait le jeton d'un lien complet, d'un texte collé ou d'un jeton seul. */
export function extraireJeton(texte) {
  // Un lien copié depuis WhatsApp ou une conversation peut contenir des retours à la ligne ou des espaces,
  // et être suivi d'autre texte. La signature ECDSA P-256 fait toujours 64 octets, soit 86 caractères :
  // on prend exactement ce qu'il faut.
  const t = String(texte || '').replace(/\s+/g, '');
  const m = t.match(/activer=([A-Za-z0-9_-]+\.[A-Za-z0-9_-]{86})/) || t.match(/([A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{86})/);
  return m ? m[1] : null;
}

/** Vérifie un jeton. Retourne { ok, licence, erreur }. */
export async function verifier(jeton) {
  let licence;
  try {
    const [partie, signature] = jeton.split('.');
    const donnees = b64urlVersOctets(partie);
    const cle = await crypto.subtle.importKey('jwk', CLE_PUBLIQUE, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const valide = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, cle, b64urlVersOctets(signature), donnees);
    if (!valide) return { ok: false, erreur: 'Ce lien d\'activation n\'est pas valide.' };
    licence = JSON.parse(new TextDecoder().decode(donnees));
  } catch (e) {
    return { ok: false, erreur: 'Ce lien d\'activation est incomplet ou abîmé. Copiez-le en entier.' };
  }

  if (licence.v !== VERSION_LICENCE) {
    return { ok: false, licence, erreur: 'Ce lien d\'activation date d\'une ancienne version. Demandez un nouveau lien à NEXORA.' };
  }
  const appareil = await codeAppareil();
  if (normaliserCode(licence.a) !== appareil) {
    return {
      ok: false, licence,
      erreur: `Ce lien a été créé pour un autre téléphone. Le code de ce téléphone est ${formaterCode(appareil)} : envoyez-le à NEXORA pour recevoir le bon lien.`,
    };
  }

  // Le jour retenu ne recule jamais, même si on remet la date du téléphone en arrière.
  const aujourdhui = jourLocal();
  const dernier = await db.reglage('dernierJour', '');
  if (aujourdhui > dernier) await db.definir('dernierJour', aujourdhui);
  const jour = aujourdhui > dernier ? aujourdhui : dernier;
  if (licence.exp && licence.exp < jour) {
    return {
      ok: false, licence,
      erreur: `Cette licence a expiré le ${new Date(licence.exp).toLocaleDateString('fr-FR')}. Contactez NEXORA pour la renouveler.`,
    };
  }
  return { ok: true, licence };
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
