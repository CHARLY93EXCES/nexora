import { h, icone, argent, uid, feuille, champ, confirmer, toast, correspond } from '../util.js';
import { db } from '../db.js';
import { rafraichir } from '../nav.js';
import { recherche, vide, nombre } from './composants.js';

const CATEGORIES = ['Écran', 'Batterie', 'Connecteur', 'Caméra', 'Audio', 'Nappe', 'Vitre / châssis', 'Accessoire', 'Autre'];
const etat = { q: '', bas: false };

export async function vue(params, requete) {
  if (requete === 'bas') etat.bas = true;
  const pieces = await db.tous('stock');
  pieces.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  const valeur = pieces.reduce((s, p) => s + (Number(p.qte) || 0) * (Number(p.cout) || 0), 0);
  const nbBas = pieces.filter(estBas).length;

  const zone = h('div', { class: 'list' });
  const dessiner = () => {
    const res = pieces.filter((p) => (!etat.bas || estBas(p)) &&
      (!etat.q || correspond(`${p.nom} ${p.compat || ''} ${p.categorie || ''}`, etat.q)));
    zone.replaceChildren(...(res.length ? res.map(ligne) : [vide(pieces.length
      ? 'Aucune pièce ne correspond.'
      : 'Ajoutez vos pièces (écrans, batteries, connecteurs…) pour suivre les quantités et calculer vos marges.')]));
  };
  const filtreBas = h('button', { type: 'button', class: 'chip' + (etat.bas ? ' on' : '') }, `Stock bas (${nbBas})`);
  filtreBas.addEventListener('click', () => { etat.bas = !etat.bas; filtreBas.classList.toggle('on', etat.bas); dessiner(); });
  dessiner();

  return {
    titre: 'Stock',
    action: h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Ajouter une pièce', onclick: async () => {
      if (await editer({})) rafraichir();
    } }, icone('plus')),
    contenu: h('div', { class: 'stack' },
      h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('div', { class: 'stat-v' }, pieces.length), h('div', { class: 'stat-l' }, 'Références')),
        h('div', { class: 'stat' }, h('div', { class: 'stat-v' }, argent(valeur)), h('div', { class: 'stat-l' }, 'Valeur du stock (coût)'))),
      recherche('Pièce, modèle compatible…', (q) => { etat.q = q; dessiner(); }, etat.q),
      h('div', { class: 'chips' }, filtreBas),
      zone),
  };
}

function estBas(p) {
  return Number(p.qte) <= Number(p.seuil || 0);
}

function ligne(p) {
  const qte = h('span', { class: 'qty' + (estBas(p) ? ' low' : '') }, p.qte);
  const ajuster = async (delta, e) => {
    e.stopPropagation();
    p.qte = Math.max(0, (Number(p.qte) || 0) + delta);
    await db.ecrire('stock', p);
    qte.textContent = p.qte;
    qte.classList.toggle('low', estBas(p));
  };
  return h('div', { class: 'item' },
    h('button', { type: 'button', class: 'item-main as-btn', onclick: async () => { if (await editer(p)) rafraichir(); } },
      h('div', { class: 'item-title' }, p.nom),
      h('div', { class: 'item-sub' }, [p.compat, p.categorie, p.prix ? 'Vente ' + argent(p.prix) : ''].filter(Boolean).join(' · '))),
    h('div', { class: 'stepper' },
      h('button', { type: 'button', class: 'icon-btn sm', 'aria-label': 'Retirer une unité', onclick: (e) => ajuster(-1, e) }, icone('minus', 16)),
      qte,
      h('button', { type: 'button', class: 'icon-btn sm', 'aria-label': 'Ajouter une unité', onclick: (e) => ajuster(1, e) }, icone('plus', 16))));
}

async function editer(p) {
  const res = await feuille(p.id ? 'Modifier la pièce' : 'Nouvelle pièce', (fermer) => {
    const nom = h('input', { type: 'text', value: p.nom || '', placeholder: 'Écran OLED, batterie…' });
    const compat = h('input', { type: 'text', value: p.compat || '', placeholder: 'iPhone 11, Galaxy A14…' });
    const categorie = h('select', null, CATEGORIES.map((c) => h('option', { value: c, selected: c === p.categorie }, c)));
    const qte = nombre(p.qte ?? 0);
    const seuil = nombre(p.seuil ?? 1);
    const cout = nombre(p.cout ?? '', { placeholder: '0' });
    const prix = nombre(p.prix ?? '', { placeholder: '0' });
    const err = h('p', { class: 'err' });
    return h('form', { onsubmit: (e) => {
      e.preventDefault();
      if (!nom.value.trim()) { err.textContent = 'Indiquez le nom de la pièce.'; return; }
      fermer({
        nom: nom.value.trim(), compat: compat.value.trim(), categorie: categorie.value,
        qte: Math.max(0, Number(qte.value) || 0), seuil: Math.max(0, Number(seuil.value) || 0),
        cout: Number(cout.value) || 0, prix: Number(prix.value) || 0,
      });
    } },
    champ('Nom de la pièce', nom),
    h('div', { class: 'grid2' }, champ('Compatible avec', compat), champ('Catégorie', categorie)),
    h('div', { class: 'grid2' }, champ('Quantité', qte), champ('Alerte si ≤', seuil)),
    h('div', { class: 'grid2' }, champ('Coût d\'achat', cout), champ('Prix de vente posé', prix)),
    err,
    h('button', { class: 'btn primary block', type: 'submit' }, 'Enregistrer'),
    p.id ? h('button', { type: 'button', class: 'btn danger-ghost block mt', onclick: () => fermer('supprimer') }, icone('trash', 16), 'Supprimer la pièce') : null);
  });
  if (!res) return false;
  if (res === 'supprimer') {
    if (!(await confirmer('Supprimer cette pièce ?', `${p.nom} sera retirée du stock. Les dossiers existants ne changent pas.`, 'Supprimer', true))) return false;
    await db.supprimer('stock', p.id);
    toast('Pièce supprimée');
    return true;
  }
  await db.ecrire('stock', { id: p.id || uid(), creeLe: p.creeLe || new Date().toISOString(), ...p, ...res });
  toast('Pièce enregistrée', 'ok');
  return true;
}
