import { h, correspond } from '../util.js';
import { chargerTout, ACTIFS } from '../modele.js';
import { carteReparation, recherche, vide } from './composants.js';

const FILTRES = [
  ['actifs', 'En cours', (r) => ACTIFS.includes(r.statut)],
  ['pret', 'Prêts', (r) => r.statut === 'pret'],
  ['livre', 'Livrés', (r) => r.statut === 'livre'],
  ['annule', 'Annulés', (r) => r.statut === 'annule'],
  ['tous', 'Tous', () => true],
];

const etat = { filtre: 'actifs', q: '' };

export async function liste(params, requete) {
  if (requete && FILTRES.some(([id]) => id === requete)) etat.filtre = requete;
  const { reparations, cl, ap } = await chargerTout();
  const zone = h('div', { class: 'list' });
  const compteur = h('div', { class: 'muted small' });

  const dessiner = () => {
    const test = FILTRES.find(([id]) => id === etat.filtre)[2];
    const res = reparations.filter((r) => {
      if (etat.q) {
        const c = cl.get(r.clientId) || {};
        const a = ap.get(r.appareilId) || {};
        // La recherche porte sur tous les dossiers, quel que soit le filtre.
        return correspond([r.numero, c.nom, c.tel, a.marque, a.modele, a.imei, r.panne].join(' '), etat.q);
      }
      return test(r);
    });
    compteur.textContent = `${res.length} dossier${res.length > 1 ? 's' : ''}`;
    zone.replaceChildren(...(res.length
      ? res.map((r) => carteReparation(r, cl.get(r.clientId), ap.get(r.appareilId)))
      : [vide(etat.q ? 'Aucun dossier ne correspond à cette recherche.' : 'Aucun dossier ici.')]));
  };

  const puces = h('div', { class: 'chips scroll', role: 'tablist' }, FILTRES.map(([id, nom]) => {
    const b = h('button', { type: 'button', class: 'chip' + (etat.filtre === id ? ' on' : ''), role: 'tab', 'aria-selected': String(etat.filtre === id) }, nom);
    b.addEventListener('click', () => {
      etat.filtre = id;
      puces.querySelectorAll('.chip').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', String(x === b)); });
      dessiner();
    });
    return b;
  }));

  dessiner();
  return {
    titre: 'Réparations',
    contenu: h('div', { class: 'stack' },
      recherche('N° dossier, client, téléphone, IMEI…', (q) => { etat.q = q; dessiner(); }, etat.q),
      puces, compteur, zone),
    fab: { href: '#/reparation/nouvelle', libelle: 'Nouvelle réparation' },
  };
}
