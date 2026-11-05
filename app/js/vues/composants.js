// Éléments d'interface réutilisés par plusieurs écrans.
import { h, icone, argent, date, ilYa, champ, feuille, toast, correspond } from '../util.js';
import { statut, montants, nomAppareil, enRetard } from '../modele.js';
import { db } from '../db.js';

export function badge(idStatut) {
  const s = statut(idStatut);
  return h('span', { class: 'badge b-' + s.couleur }, s.court);
}

export function carteReparation(r, client, appareil) {
  const m = montants(r);
  const retard = enRetard(r);
  return h('a', { class: 'item', href: '#/reparation/' + r.id },
    h('div', { class: 'item-main' },
      h('div', { class: 'item-top' },
        h('span', { class: 'num' }, r.numero),
        badge(r.statut),
        retard ? h('span', { class: 'badge b-rouge' }, 'En retard') : null),
      h('div', { class: 'item-title' }, nomAppareil(appareil)),
      h('div', { class: 'item-sub' }, [client ? client.nom : 'Client inconnu', r.panne].filter(Boolean).join(' · '))),
    h('div', { class: 'item-side' },
      h('span', { class: 'muted small' }, ilYa(r.majLe || r.creeLe)),
      r.statut === 'pret' && m.reste ? h('span', { class: 'reste' }, argent(m.reste)) : null));
}

export function vide(texte, action) {
  return h('div', { class: 'empty' }, h('p', null, texte), action || null);
}

export function section(titre, ...contenu) {
  return h('section', { class: 'card' }, titre ? h('h2', { class: 'card-title' }, titre) : null, ...contenu);
}

export function recherche(placeholder, surSaisie, valeur = '') {
  const input = h('input', { type: 'search', placeholder, value: valeur, 'aria-label': placeholder, enterkeyhint: 'search' });
  input.addEventListener('input', () => surSaisie(input.value));
  return h('div', { class: 'search' }, icone('search', 18), input);
}

export function stat(libelle, valeur, lien) {
  return h(lien ? 'a' : 'div', { class: 'stat', href: lien },
    h('div', { class: 'stat-v' }, valeur),
    h('div', { class: 'stat-l' }, libelle));
}

/** Champ numérique (montants, quantités). */
export function nombre(valeur, attrs = {}) {
  return h('input', { type: 'number', inputmode: 'numeric', min: '0', step: 'any', value: valeur ?? '', ...attrs });
}

/**
 * Feuille d'édition d'une ligne de devis. Propose les pièces du stock les plus proches du libellé.
 * Retourne la ligne modifiée, ou undefined si annulé.
 */
export async function editerLigne(ligne = {}) {
  const pieces = await db.tous('stock');
  const l = { type: 'piece', qte: 1, prix: '', cout: '', libelle: '', ...ligne };
  const mots = (l.libelle || '').toLowerCase().split(/\W+/).filter((m) => m.length > 3);
  const score = (p) => mots.filter((m) => (p.nom + ' ' + (p.compat || '') + ' ' + (p.categorie || '')).toLowerCase().includes(m)).length;
  pieces.sort((a, b) => score(b) - score(a) || a.nom.localeCompare(b.nom));

  return feuille(ligne.id ? 'Modifier la ligne' : 'Ajouter au devis', (fermer) => {
    const libelle = h('input', { type: 'text', value: l.libelle, required: true });
    const qte = nombre(l.qte, { min: '1' });
    const prix = nombre(l.prix, { placeholder: '0' });
    const cout = nombre(l.cout, { placeholder: '0' });
    const type = h('select', null,
      h('option', { value: 'piece', selected: l.type === 'piece' }, 'Pièce'),
      h('option', { value: 'mo', selected: l.type === 'mo' }, 'Main d\'œuvre / service'));
    const choixStock = h('select', null,
      h('option', { value: '' }, 'Aucune (prix saisi à la main)'),
      pieces.map((p) => h('option', { value: p.id, selected: p.id === l.stockId },
        `${p.nom}${p.compat ? ' — ' + p.compat : ''} (${p.qte} en stock)`)));
    choixStock.addEventListener('change', () => {
      const p = pieces.find((x) => x.id === choixStock.value);
      if (!p) return;
      libelle.value = p.nom + (p.compat ? ' ' + p.compat : '');
      if (p.prix) prix.value = p.prix;
      if (p.cout) cout.value = p.cout;
      type.value = 'piece';
    });
    const err = h('p', { class: 'err' });
    const valider = () => {
      if (!libelle.value.trim()) { err.textContent = 'Indiquez un libellé.'; libelle.focus(); return; }
      fermer({
        ...l,
        id: l.id || Math.random().toString(36).slice(2, 10),
        libelle: libelle.value.trim(),
        type: type.value,
        qte: Math.max(1, Number(qte.value) || 1),
        prix: Number(prix.value) || 0,
        cout: Number(cout.value) || 0,
        stockId: choixStock.value || null,
      });
    };
    return h('form', { onsubmit: (e) => { e.preventDefault(); valider(); } },
      pieces.length ? champ('Pièce du stock', choixStock, 'Déduite du stock quand la réparation passe à « Prêt ».') : null,
      champ('Libellé', libelle),
      h('div', { class: 'grid2' }, champ('Type', type), champ('Quantité', qte)),
      h('div', { class: 'grid2' }, champ('Prix client', prix), champ('Coût d\'achat', cout, 'Pour calculer votre marge.')),
      err,
      h('button', { class: 'btn primary block', type: 'submit' }, 'Valider'));
  });
}

/** Feuille de saisie d'un paiement. */
export function saisirPaiement(reste, modes) {
  return feuille('Encaisser', (fermer) => {
    const montant = nombre(reste || '', { placeholder: '0' });
    let mode = modes[0];
    const puces = h('div', { class: 'chips' }, modes.map((m) => {
      const b = h('button', { type: 'button', class: 'chip' + (m === mode ? ' on' : '') }, m);
      b.addEventListener('click', () => {
        mode = m;
        puces.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x === b));
      });
      return b;
    }));
    const err = h('p', { class: 'err' });
    return h('form', {
      onsubmit: (e) => {
        e.preventDefault();
        const v = Number(montant.value);
        if (!v || v <= 0) { err.textContent = 'Indiquez un montant.'; return; }
        fermer({ montant: v, mode, date: new Date().toISOString() });
      },
    },
    reste ? h('p', { class: 'muted' }, 'Reste à payer : ', h('b', null, argent(reste))) : null,
    champ('Montant reçu', montant),
    h('div', { class: 'field' }, h('span', { class: 'lbl' }, 'Moyen de paiement'), puces),
    err,
    h('button', { class: 'btn primary block', type: 'submit' }, 'Enregistrer le paiement'));
  });
}

/** Liste filtrable pour choisir un client existant. */
export function filtrerClients(clients, q) {
  return clients.filter((c) => correspond(`${c.nom} ${c.tel}`, q));
}

export { toast, date };
