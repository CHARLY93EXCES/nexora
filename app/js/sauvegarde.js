// Sauvegarde et restauration de toutes les données dans un fichier.
import { db, MAGASINS } from './db.js';
import { lireCommeDataURL, partagerFichier } from './util.js';

const FORMAT = 'nexora-mobile-sauvegarde';

export async function exporter(avecPhotos) {
  const donnees = await db.exporterTout();
  // La licence reste liée à ce téléphone : elle n'est pas copiée dans la sauvegarde.
  donnees.reglages = donnees.reglages.filter((r) => r.cle !== 'licence');
  if (avecPhotos) {
    donnees.photos = await Promise.all(donnees.photos.map(async (p) => ({ ...p, blob: await lireCommeDataURL(p.blob) })));
  } else {
    donnees.photos = [];
  }
  const contenu = { format: FORMAT, version: 1, date: new Date().toISOString(), avecPhotos: !!avecPhotos, donnees };
  const blob = new Blob([JSON.stringify(contenu)], { type: 'application/json' });
  const nom = `nexora-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
  await partagerFichier(blob, nom, 'Sauvegarde NEXORA Mobile');
  await db.definir('derniereSauvegarde', contenu.date);
  return { taille: blob.size, nom };
}

/** Lit un fichier de sauvegarde et retourne un résumé, sans rien modifier. */
export async function lire(fichier) {
  let contenu;
  try {
    contenu = JSON.parse(await fichier.text());
  } catch (e) {
    throw new Error('Ce fichier n\'est pas une sauvegarde NEXORA.');
  }
  if (!contenu || contenu.format !== FORMAT || !contenu.donnees) {
    throw new Error('Ce fichier n\'est pas une sauvegarde NEXORA Mobile.');
  }
  const d = contenu.donnees;
  return {
    contenu,
    resume: {
      date: contenu.date,
      reparations: (d.reparations || []).length,
      clients: (d.clients || []).length,
      stock: (d.stock || []).length,
      photos: (d.photos || []).length,
    },
  };
}

/** Remplace toutes les données par celles de la sauvegarde (la licence est conservée). */
export async function restaurer(contenu) {
  const d = { ...contenu.donnees };
  const licence = await db.reglage('licence', null);
  d.photos = await Promise.all((d.photos || []).map(async (p) => ({
    ...p,
    blob: typeof p.blob === 'string' ? await (await fetch(p.blob)).blob() : p.blob,
  })));
  // Les photos absentes de la sauvegarde sont retirées des dossiers.
  const ids = new Set(d.photos.map((p) => p.id));
  d.reparations = (d.reparations || []).map((r) => ({ ...r, photos: (r.photos || []).filter((id) => ids.has(id)) }));
  d.reglages = (d.reglages || []).filter((r) => r.cle !== 'licence');
  if (licence) d.reglages.push({ cle: 'licence', valeur: licence });
  for (const m of MAGASINS) d[m] = d[m] || [];
  await db.remplacerTout(d);
}
