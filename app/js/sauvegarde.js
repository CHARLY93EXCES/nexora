// Sauvegarde et restauration de toutes les données dans un fichier.
//
// Sécurité :
// - Avec un mot de passe, le fichier est chiffré (AES-GCM 256) : illisible sans le mot de passe.
// - Les codes de déverrouillage des clients ne sont jamais copiés dans une sauvegarde.
// - La licence, le code du téléphone et le code d'accès restent liés à ce téléphone.
import { db, MAGASINS } from './db.js';
import { lireCommeDataURL, partagerFichier } from './util.js';
import { chiffrer, dechiffrer } from './securite.js';

const FORMAT = 'nexora-mobile-sauvegarde';
// Réglages propres à ce téléphone : jamais exportés, jamais remplacés par une restauration.
const PROPRES_AU_TELEPHONE = ['licence', 'appareil', 'verrou', 'dernierJour'];

export async function exporter(avecPhotos, motDePasse) {
  const donnees = await db.exporterTout();
  donnees.reglages = donnees.reglages.filter((r) => !PROPRES_AU_TELEPHONE.includes(r.cle));
  donnees.reparations = donnees.reparations.map((r) => ({ ...r, code: '' }));
  donnees.photos = avecPhotos
    ? await Promise.all(donnees.photos.map(async (p) => ({ ...p, blob: await lireCommeDataURL(p.blob) })))
    : [];

  const date = new Date().toISOString();
  const entete = { format: FORMAT, version: 2, date, avecPhotos: !!avecPhotos };
  const contenu = motDePasse
    ? { ...entete, chiffre: await chiffrer(JSON.stringify(donnees), motDePasse) }
    : { ...entete, donnees };
  const blob = new Blob([JSON.stringify(contenu)], { type: 'application/json' });
  const nom = `nexora-sauvegarde-${date.slice(0, 10)}${motDePasse ? '-protegee' : ''}.json`;
  await partagerFichier(blob, nom, 'Sauvegarde NEXORA Mobile');
  await db.definir('derniereSauvegarde', date);
  return { taille: blob.size, nom };
}

/** Lit un fichier de sauvegarde. Retourne { contenu, protegee }. */
export async function ouvrir(fichier) {
  let contenu;
  try {
    contenu = JSON.parse(await fichier.text());
  } catch (e) {
    throw new Error('Ce fichier n\'est pas une sauvegarde NEXORA.');
  }
  if (!contenu || contenu.format !== FORMAT || !(contenu.donnees || contenu.chiffre)) {
    throw new Error('Ce fichier n\'est pas une sauvegarde NEXORA Mobile.');
  }
  return { contenu, protegee: !!contenu.chiffre };
}

/** Donne les données (déchiffrées si besoin) et un résumé, sans rien modifier. */
export async function lire(contenu, motDePasse) {
  const donnees = contenu.chiffre ? JSON.parse(await dechiffrer(contenu.chiffre, motDePasse)) : contenu.donnees;
  return {
    donnees,
    resume: {
      date: contenu.date,
      reparations: (donnees.reparations || []).length,
      clients: (donnees.clients || []).length,
      stock: (donnees.stock || []).length,
      photos: (donnees.photos || []).length,
    },
  };
}

/** Remplace les données par celles de la sauvegarde (les réglages propres au téléphone sont conservés). */
export async function restaurer(donneesFichier) {
  const d = { ...donneesFichier };
  const conserves = [];
  for (const cle of PROPRES_AU_TELEPHONE) {
    const valeur = await db.reglage(cle, null);
    if (valeur !== null) conserves.push({ cle, valeur });
  }
  const photos = [];
  for (const p of d.photos || []) {
    // Seules les images intégrées au fichier sont acceptées (pas de lien vers l'extérieur).
    if (typeof p.blob === 'string' && p.blob.startsWith('data:image/')) photos.push({ ...p, blob: await (await fetch(p.blob)).blob() });
    else if (p.blob instanceof Blob) photos.push(p);
  }
  d.photos = photos;
  const ids = new Set(photos.map((p) => p.id));
  d.reparations = (d.reparations || []).map((r) => ({ ...r, photos: (r.photos || []).filter((id) => ids.has(id)) }));
  d.reglages = [...(d.reglages || []).filter((r) => !PROPRES_AU_TELEPHONE.includes(r.cle)), ...conserves];
  for (const m of MAGASINS) d[m] = d[m] || [];
  await db.remplacerTout(d);
}
