import { h, icone, argent, ilYa } from '../util.js';
import { db } from '../db.js';
import { chargerTout, boutique, montants, ACTIFS, enRetard, REGLAGES_DEFAUT } from '../modele.js';
import { carteReparation, section, stat, vide } from './composants.js';

export async function vue() {
  const { reparations, cl, ap } = await chargerTout();
  const [b, stock, derniere] = await Promise.all([boutique(), db.tous('stock'), db.reglage('derniereSauvegarde', null)]);

  const mois = new Date().toISOString().slice(0, 7);
  let encaisse = 0;
  let marge = 0;
  for (const r of reparations) {
    for (const p of r.paiements || []) if ((p.date || '').startsWith(mois)) encaisse += Number(p.montant) || 0;
    if (r.statut === 'livre' && (r.livreLe || '').startsWith(mois)) marge += montants(r).marge;
  }
  const actifs = reparations.filter((r) => ACTIFS.includes(r.statut));
  const prets = reparations.filter((r) => r.statut === 'pret');
  const retards = reparations.filter(enRetard);
  const stockBas = stock.filter((p) => Number(p.qte) <= Number(p.seuil || 0));

  const alertes = [];
  if (b.nom === REGLAGES_DEFAUT.nom) {
    alertes.push(h('a', { class: 'alert', href: '#/plus/boutique' }, icone('store', 20),
      h('span', null, h('b', null, 'Configurez votre atelier'), ' : nom, logo et téléphone apparaîtront sur vos reçus.')));
  }
  const joursSansSauvegarde = derniere ? Math.floor((Date.now() - new Date(derniere)) / 86400000) : null;
  if (reparations.length && (joursSansSauvegarde === null || joursSansSauvegarde >= 1)) {
    alertes.push(h('a', { class: 'alert warn', href: '#/plus' }, icone('shield', 20),
      h('span', null, h('b', null, 'Sauvegardez vos données'), derniere
        ? ` : dernière sauvegarde ${ilYa(derniere)}.`
        : ' : aucune sauvegarde pour l\'instant. Vos données sont uniquement sur ce téléphone.')));
  }
  if (stockBas.length) {
    alertes.push(h('a', { class: 'alert', href: '#/stock?bas' }, icone('box', 20),
      h('span', null, h('b', null, `${stockBas.length} pièce${stockBas.length > 1 ? 's' : ''} en stock bas`), ' : pensez à commander.')));
  }

  // Chaque dossier n'apparaît qu'une fois, dans la liste la plus urgente.
  const dejaVus = new Set();
  const liste = (titre, tous, max = 5) => {
    const items = tous.filter((r) => !dejaVus.has(r.id));
    items.slice(0, max).forEach((r) => dejaVus.add(r.id));
    return items.length
      ? section(titre, h('div', { class: 'list' }, items.slice(0, max).map((r) => carteReparation(r, cl.get(r.clientId), ap.get(r.appareilId)))),
        items.length > max ? h('a', { class: 'more', href: '#/reparations' }, `Voir les ${items.length}`) : null)
      : null;
  };

  const contenu = h('div', { class: 'stack' },
    h('div', { class: 'hello' },
      h('div', { class: 'muted small' }, new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })),
      h('div', { class: 'hello-name' }, b.nom)),
    alertes.length ? h('div', { class: 'stack-s' }, alertes) : null,
    h('div', { class: 'stats' },
      stat('En cours', actifs.length, '#/reparations'),
      stat('Prêts à rendre', prets.length, '#/reparations?pret'),
      stat('Encaissé ce mois', argent(encaisse)),
      stat('Marge ce mois', argent(marge))),
    reparations.length === 0
      ? section(null, vide('Aucune réparation pour l\'instant. Créez votre premier dossier quand un client dépose un appareil.',
        h('a', { class: 'btn primary', href: '#/reparation/nouvelle' }, icone('plus', 18), 'Nouvelle réparation')))
      : null,
    liste('En retard', retards),
    liste('Prêts à rendre', prets),
    liste('En attente de pièce', reparations.filter((r) => r.statut === 'attente_piece')),
    liste('Derniers dossiers', reparations, 6));

  return {
    titre: 'Accueil',
    contenu,
    fab: { href: '#/reparation/nouvelle', libelle: 'Nouvelle réparation' },
  };
}
