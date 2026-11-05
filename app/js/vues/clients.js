import { h, icone, argent, uid, feuille, champ, confirmer, toast, correspond, numeroWhatsApp, date } from '../util.js';
import { db } from '../db.js';
import { montants, nomAppareil, boutique, TYPES_APPAREIL, finGarantie } from '../modele.js';
import { aller, rafraichir } from '../nav.js';
import { recherche, vide, section, carteReparation } from './composants.js';

export async function liste() {
  const [clients, reparations] = await Promise.all([db.tous('clients'), db.tous('reparations')]);
  clients.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  const nb = new Map();
  for (const r of reparations) nb.set(r.clientId, (nb.get(r.clientId) || 0) + 1);

  const zone = h('div', { class: 'list' });
  const dessiner = (q = '') => {
    const res = clients.filter((c) => !q || correspond(`${c.nom} ${String(c.tel).replace(/\s/g, '')} ${c.tel}`, q));
    zone.replaceChildren(...(res.length ? res.map((c) => h('a', { class: 'item', href: '#/client/' + c.id },
      h('div', { class: 'avatar' }, initiales(c.nom)),
      h('div', { class: 'item-main' }, h('div', { class: 'item-title' }, c.nom), h('div', { class: 'item-sub' }, c.tel || 'Sans téléphone')),
      h('div', { class: 'item-side' }, h('span', { class: 'muted small' }, `${nb.get(c.id) || 0} réparation${(nb.get(c.id) || 0) > 1 ? 's' : ''}`))))
      : [vide(q ? 'Aucun client ne correspond.' : 'Vos clients apparaîtront ici dès le premier dossier.')]));
  };
  dessiner();
  return {
    titre: 'Clients',
    action: h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Nouveau client', onclick: async () => {
      const c = await editerClient({});
      if (c) aller('client/' + c.id);
    } }, icone('plus')),
    contenu: h('div', { class: 'stack' },
      recherche('Nom ou téléphone', dessiner),
      h('div', { class: 'muted small' }, `${clients.length} client${clients.length > 1 ? 's' : ''}`),
      zone),
  };
}

export async function fiche([id]) {
  const c = await db.lire('clients', id);
  if (!c) return { titre: 'Client introuvable', retour: '#/clients', contenu: vide('Ce client n\'existe plus.') };
  const [appareils, reparations, b] = await Promise.all([db.parIndex('appareils', 'clientId', id), db.parIndex('reparations', 'clientId', id), boutique()]);
  const ap = new Map(appareils.map((a) => [a.id, a]));
  reparations.sort((x, y) => (y.creeLe || '').localeCompare(x.creeLe || ''));
  const depense = reparations.filter((r) => r.statut !== 'annule').reduce((s, r) => s + montants(r).paye, 0);
  const credit = reparations.filter((r) => r.statut === 'livre').reduce((s, r) => s + montants(r).reste, 0);

  return {
    titre: c.nom,
    retour: '#/clients',
    action: h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Modifier le client', onclick: async () => {
      if (await editerClient(c)) rafraichir();
    } }, icone('edit')),
    contenu: h('div', { class: 'stack' },
      h('section', { class: 'card head' },
        h('div', { class: 'head-title' }, c.nom),
        h('div', { class: 'muted' }, c.tel || 'Sans téléphone'),
        c.notes ? h('p', { class: 'note-text' }, c.notes) : null,
        h('div', { class: 'actions' },
          c.tel ? h('a', { class: 'action', href: 'tel:' + c.tel.replace(/\s/g, '') }, icone('phone'), h('span', null, 'Appeler')) : null,
          c.tel ? h('a', { class: 'action', href: `https://wa.me/${numeroWhatsApp(c.tel, b.indicatif)}`, target: '_blank', rel: 'noopener' }, icone('chat'), h('span', null, 'WhatsApp')) : null,
          h('a', { class: 'action', href: '#/reparation/nouvelle?client=' + c.id }, icone('plus'), h('span', null, 'Réparation')))),
      h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('div', { class: 'stat-v' }, reparations.length), h('div', { class: 'stat-l' }, 'Réparations')),
        h('div', { class: 'stat' }, h('div', { class: 'stat-v' }, argent(depense)), h('div', { class: 'stat-l' }, 'Total payé')),
        credit ? h('div', { class: 'stat warn' }, h('div', { class: 'stat-v' }, argent(credit)), h('div', { class: 'stat-l' }, 'Crédit à recouvrer')) : null),
      section('Appareils',
        appareils.length ? h('div', { class: 'list flat' }, appareils.map((a) => h('a', { class: 'row-link', href: '#/appareil/' + a.id },
          icone('device', 20), h('div', null, h('b', null, nomAppareil(a)), h('div', { class: 'muted small' }, a.imei ? 'IMEI ' + a.imei : a.type)), icone('back', 18))))
          : h('p', { class: 'muted' }, 'Aucun appareil.')),
      section('Réparations',
        reparations.length ? h('div', { class: 'list' }, reparations.map((r) => carteReparation(r, c, ap.get(r.appareilId))))
          : h('p', { class: 'muted' }, 'Aucune réparation.')),
      h('button', { type: 'button', class: 'btn danger-ghost block', onclick: async () => {
        if (reparations.length) { toast('Ce client a des dossiers : supprimez-les d\'abord.', 'error'); return; }
        if (await confirmer('Supprimer ce client ?', `${c.nom} et ses appareils seront effacés.`, 'Supprimer', true)) {
          for (const a of appareils) await db.supprimer('appareils', a.id);
          await db.supprimer('clients', c.id);
          aller('clients');
        }
      } }, icone('trash', 16), 'Supprimer le client')),
  };
}

export async function appareil([id]) {
  const a = await db.lire('appareils', id);
  if (!a) return { titre: 'Appareil introuvable', retour: '#/clients', contenu: vide('Cet appareil n\'existe plus.') };
  const [c, reparations] = await Promise.all([db.lire('clients', a.clientId), db.parIndex('reparations', 'appareilId', id)]);
  reparations.sort((x, y) => (y.creeLe || '').localeCompare(x.creeLe || ''));
  const garantie = reparations.map((r) => ({ r, fin: finGarantie(r) })).find((g) => g.fin && g.fin > new Date());

  return {
    titre: 'Passeport appareil',
    retour: c ? '#/client/' + c.id : '#/clients',
    action: h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Modifier l\'appareil', onclick: async () => {
      if (await editerAppareil(a)) rafraichir();
    } }, icone('edit')),
    contenu: h('div', { class: 'stack' },
      h('section', { class: 'card head' },
        h('div', { class: 'muted small' }, a.type || 'Appareil'),
        h('div', { class: 'head-title' }, nomAppareil(a)),
        garantie ? h('span', { class: 'badge b-vert' }, `Sous garantie jusqu'au ${date(garantie.fin)} (${garantie.r.numero})`) : null,
        h('div', { class: 'kvs' },
          kv('IMEI / série', a.imei || '—'),
          kv('Couleur', a.couleur || '—'),
          kv('Propriétaire', c ? h('a', { href: '#/client/' + c.id }, c.nom) : '—'),
          kv('Enregistré le', date(a.creeLe)),
          a.notes ? kv('Notes', a.notes) : null)),
      section(`Historique (${reparations.length})`,
        reparations.length ? h('div', { class: 'list' }, reparations.map((r) => carteReparation(r, c, a)))
          : h('p', { class: 'muted' }, 'Aucune réparation.')),
      c ? h('a', { class: 'btn primary block', href: '#/reparation/nouvelle?client=' + c.id }, icone('plus', 18), 'Nouvelle réparation pour ce client') : null),
  };
}

function kv(k, v) {
  return h('div', { class: 'kv top' }, h('span', { class: 'muted' }, k), h('span', null, v));
}

function initiales(nom) {
  return String(nom || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0].toUpperCase()).join('');
}

export async function editerClient(c) {
  const res = await feuille(c.id ? 'Modifier le client' : 'Nouveau client', (fermer) => {
    const nom = h('input', { type: 'text', value: c.nom || '', required: true });
    const tel = h('input', { type: 'tel', inputmode: 'tel', value: c.tel || '' });
    const notes = h('textarea', { rows: 2 }, c.notes || '');
    const err = h('p', { class: 'err' });
    return h('form', { onsubmit: (e) => {
      e.preventDefault();
      if (!nom.value.trim()) { err.textContent = 'Indiquez le nom.'; return; }
      fermer({ nom: nom.value.trim(), tel: tel.value.trim(), notes: notes.value.trim() });
    } },
    champ('Nom', nom), champ('Téléphone (WhatsApp)', tel), champ('Notes', notes), err,
    h('button', { class: 'btn primary block', type: 'submit' }, 'Enregistrer'));
  });
  if (!res) return null;
  const client = { id: c.id || uid(), creeLe: c.creeLe || new Date().toISOString(), ...c, ...res };
  await db.ecrire('clients', client);
  toast('Client enregistré', 'ok');
  return client;
}

async function editerAppareil(a) {
  const res = await feuille('Modifier l\'appareil', (fermer) => {
    const type = h('select', null, TYPES_APPAREIL.map((t) => h('option', { value: t, selected: t === a.type }, t)));
    const marque = h('input', { type: 'text', value: a.marque || '' });
    const modele = h('input', { type: 'text', value: a.modele || '' });
    const imei = h('input', { type: 'text', inputmode: 'numeric', value: a.imei || '' });
    const couleur = h('input', { type: 'text', value: a.couleur || '' });
    const notes = h('textarea', { rows: 2 }, a.notes || '');
    return h('form', { onsubmit: (e) => {
      e.preventDefault();
      fermer({ type: type.value, marque: marque.value.trim(), modele: modele.value.trim(), imei: imei.value.trim(), couleur: couleur.value.trim(), notes: notes.value.trim() });
    } },
    champ('Type', type), h('div', { class: 'grid2' }, champ('Marque', marque), champ('Modèle', modele)),
    champ('IMEI ou n° de série', imei), champ('Couleur', couleur), champ('Notes', notes),
    h('button', { class: 'btn primary block', type: 'submit' }, 'Enregistrer'));
  });
  if (!res) return false;
  Object.assign(a, res);
  await db.ecrire('appareils', a);
  toast('Appareil enregistré', 'ok');
  return true;
}
