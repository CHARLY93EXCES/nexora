// Règles métier : statuts, montants, stock, numérotation.
import { db } from './db.js';
import { uid } from './util.js';

export const STATUTS = [
  { id: 'recu', nom: 'Reçu', court: 'Reçu', couleur: 'gris' },
  { id: 'diagnostic', nom: 'En diagnostic', court: 'Diagnostic', couleur: 'bleu' },
  { id: 'devis', nom: 'Devis envoyé', court: 'Devis', couleur: 'violet' },
  { id: 'attente_piece', nom: 'En attente de pièce', court: 'Attente pièce', couleur: 'orange' },
  { id: 'en_cours', nom: 'En réparation', court: 'En réparation', couleur: 'bleu' },
  { id: 'pret', nom: 'Prêt à récupérer', court: 'Prêt', couleur: 'vert' },
  { id: 'livre', nom: 'Livré au client', court: 'Livré', couleur: 'neutre' },
  { id: 'annule', nom: 'Annulé / non réparé', court: 'Annulé', couleur: 'rouge' },
];
export const statut = (id) => STATUTS.find((s) => s.id === id) || STATUTS[0];
export const ACTIFS = ['recu', 'diagnostic', 'devis', 'attente_piece', 'en_cours'];
export const estTermine = (r) => r.statut === 'livre' || r.statut === 'annule';

export const ETATS_RECEPTION = [
  'Écran fissuré', 'Rayures écran', 'Vitre arrière cassée', 'Châssis tordu / choc',
  'Traces d\'oxydation', 'Bouton manquant', 'Caméra fissurée', 'Ne s\'allume pas',
];
export const ACCESSOIRES = ['Chargeur', 'Câble', 'Coque', 'Carte SIM', 'Carte mémoire', 'Boîte', 'Écouteurs'];
export const MODES_PAIEMENT = ['Espèces', 'Orange Money', 'MTN MoMo', 'Moov Money', 'Wave', 'Autre'];
export const TYPES_APPAREIL = ['Téléphone', 'Tablette', 'Montre', 'Ordinateur', 'Autre'];

export const REGLAGES_DEFAUT = {
  nom: 'Mon atelier',
  adresse: '',
  telephone: '',
  logo: '',
  devise: 'FCFA',
  indicatif: '225',
  prefixe: 'R',
  garantieJours: 30,
  format: '80',
  pied: 'Merci de votre confiance.',
  conditions: 'Garantie sur la réparation effectuée, hors casse, oxydation et ouverture par un tiers. ' +
    'Les données de l\'appareil restent sous la responsabilité du client. ' +
    'Tout appareil non récupéré dans les 90 jours après l\'avis « prêt » peut être considéré comme abandonné.',
};

export async function boutique() {
  return { ...REGLAGES_DEFAUT, ...(await db.reglage('boutique', {})) };
}

// ---------- Montants ----------

export function montants(r) {
  const lignes = r.lignes || [];
  const brut = lignes.reduce((s, l) => s + (Number(l.qte) || 0) * (Number(l.prix) || 0), 0);
  const cout = lignes.reduce((s, l) => s + (Number(l.qte) || 0) * (Number(l.cout) || 0), 0);
  const remise = Math.min(Number(r.remise) || 0, brut);
  const total = brut - remise;
  const paye = (r.paiements || []).reduce((s, p) => s + (Number(p.montant) || 0), 0);
  return { brut, remise, total, cout, marge: total - cout, paye, reste: Math.max(0, total - paye) };
}

export function finGarantie(r) {
  if (!r.livreLe || !r.garantieJours) return null;
  const d = new Date(r.livreLe);
  d.setDate(d.getDate() + Number(r.garantieJours));
  return d;
}

export function enRetard(r) {
  return r.datePromise && !estTermine(r) && r.statut !== 'pret' &&
    r.datePromise < new Date().toISOString().slice(0, 10);
}

// ---------- Chargement ----------

export async function chargerTout() {
  const [reparations, clients, appareils] = await Promise.all([
    db.tous('reparations'), db.tous('clients'), db.tous('appareils'),
  ]);
  const cl = new Map(clients.map((c) => [c.id, c]));
  const ap = new Map(appareils.map((a) => [a.id, a]));
  reparations.sort((a, b) => (b.majLe || '').localeCompare(a.majLe || ''));
  return { reparations, clients, appareils, cl, ap };
}

export function nomAppareil(a) {
  if (!a) return 'Appareil';
  return [a.marque, a.modele].filter(Boolean).join(' ') || a.type || 'Appareil';
}

// ---------- Création et changement de statut ----------

export async function nouvelleReparation(donnees) {
  const b = await boutique();
  const n = await db.numeroSuivant();
  const maintenant = new Date().toISOString();
  const r = {
    id: uid(),
    numero: `${b.prefixe || 'R'}-${String(n).padStart(4, '0')}`,
    statut: 'recu',
    lignes: [],
    paiements: [],
    remise: 0,
    photos: [],
    garantieJours: Number(b.garantieJours) || 0,
    historique: [{ statut: 'recu', date: maintenant }],
    creeLe: maintenant,
    majLe: maintenant,
    ...donnees,
  };
  await db.ecrire('reparations', r);
  return r;
}

export async function enregistrer(r) {
  r.majLe = new Date().toISOString();
  await db.ecrire('reparations', r);
  return r;
}

/**
 * Change le statut et applique ses effets :
 * - « Prêt » ou « Livré » : les pièces du stock sont déduites (une seule fois).
 * - « Annulé » : les pièces déjà déduites retournent en stock.
 * - « Livré » : début de la garantie, le code de déverrouillage est effacé.
 */
export async function changerStatut(r, nouveau, note = '') {
  const maintenant = new Date().toISOString();
  if (r.statut === nouveau) return r;
  r.statut = nouveau;
  r.historique = [...(r.historique || []), { statut: nouveau, date: maintenant, note }];

  if ((nouveau === 'pret' || nouveau === 'livre') && !r.stockDeduit) {
    await mouvementStock(r.lignes, -1);
    r.stockDeduit = true;
  }
  if (nouveau === 'annule' && r.stockDeduit) {
    await mouvementStock(r.lignes, +1);
    r.stockDeduit = false;
  }
  if (nouveau === 'livre') {
    r.livreLe = maintenant;
    if (r.code) { r.code = ''; r.codeEfface = true; }
  }
  if (nouveau === 'devis' && r.devisStatut !== 'accepte') r.devisStatut = 'envoye';
  return enregistrer(r);
}

async function mouvementStock(lignes, sens) {
  for (const l of lignes || []) {
    if (!l.stockId) continue;
    const p = await db.lire('stock', l.stockId);
    if (!p) continue;
    p.qte = (Number(p.qte) || 0) + sens * (Number(l.qte) || 0);
    await db.ecrire('stock', p);
  }
}

export async function supprimerReparation(r) {
  if (r.stockDeduit) await mouvementStock(r.lignes, +1);
  for (const pid of r.photos || []) await db.supprimer('photos', pid);
  await db.supprimer('reparations', r.id);
}
