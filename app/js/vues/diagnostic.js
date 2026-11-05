import { h, icone, toast, correspond } from '../util.js';
import { db } from '../db.js';
import { enregistrer, changerStatut, nomAppareil } from '../modele.js';
import { PANNES, CATEGORIES, panne as trouverPanne } from '../pannes.js';
import { rafraichir } from '../nav.js';
import { recherche, editerLigne } from './composants.js';

export async function vue([id]) {
  const r = await db.lire('reparations', id);
  if (!r) return { titre: 'Dossier introuvable', retour: '#/reparations', contenu: h('p', { class: 'empty' }, 'Ce dossier n\'existe plus.') };
  const appareil = await db.lire('appareils', r.appareilId);
  const retour = '#/reparation/' + r.id;
  const p = r.diagnostic && trouverPanne(r.diagnostic.panneId);
  const contenu = p ? fiche(r, p, appareil) : choix(r, appareil);
  return { titre: 'Diagnostic ' + r.numero, retour, contenu };
}

function choix(r, appareil) {
  const zone = h('div', { class: 'stack' });
  const dessiner = (q) => {
    const blocs = CATEGORIES.map((cat, i) => {
      const items = PANNES.filter((p) => p.cat === i && (!q || correspond(p.titre + ' ' + p.causes.join(' '), q)));
      if (!items.length) return null;
      return h('section', { class: 'card' },
        h('h2', { class: 'card-title' }, cat),
        h('div', { class: 'list flat' }, items.map((p) => h('button', {
          type: 'button', class: 'row-link',
          onclick: async () => {
            r.diagnostic = { panneId: p.id, faits: [], notes: (r.diagnostic && r.diagnostic.notes) || '', debut: new Date().toISOString() };
            if (r.statut === 'recu') await changerStatut(r, 'diagnostic');
            else await enregistrer(r);
            rafraichir();
          },
        }, h('div', null, h('b', null, p.titre), h('div', { class: 'muted small' }, `${p.etapes.length} tests`)), icone('back', 18)))));
    }).filter(Boolean);
    zone.replaceChildren(...(blocs.length ? blocs : [h('p', { class: 'empty' }, 'Aucune panne ne correspond.')]));
  };
  dessiner('');
  return h('div', { class: 'stack' },
    h('div', { class: 'tip' }, icone('info', 18), h('span', null,
      h('b', null, nomAppareil(appareil)), r.panne ? ` — le client signale : « ${r.panne} »` : '', '. Choisissez la panne à diagnostiquer.')),
    recherche('Chercher une panne (charge, écran, eau…)', dessiner),
    zone);
}

function fiche(r, p, appareil) {
  const faits = new Set(r.diagnostic.faits || []);
  const progression = h('div', { class: 'progress' }, h('div', { class: 'progress-bar' }));
  const majProgression = () => {
    progression.firstChild.style.width = `${Math.round((faits.size / p.etapes.length) * 100)}%`;
    progression.setAttribute('aria-label', `${faits.size} tests sur ${p.etapes.length}`);
  };
  majProgression();

  const etapes = h('ol', { class: 'steps-check' }, p.etapes.map((e, i) => {
    const cb = h('input', { type: 'checkbox', checked: faits.has(i) });
    cb.addEventListener('change', async () => {
      if (cb.checked) faits.add(i); else faits.delete(i);
      r.diagnostic.faits = [...faits].sort((a, b) => a - b);
      majProgression();
      await enregistrer(r);
    });
    return h('li', null, h('label', null, cb, h('span', { class: 'n' }, i + 1), h('span', null, e)));
  }));

  const notes = h('textarea', { rows: 3, placeholder: 'Ce que vous avez constaté, mesures, pièces à commander…' }, r.diagnostic.notes || '');
  notes.addEventListener('change', async () => { r.diagnostic.notes = notes.value.trim(); await enregistrer(r); toast('Notes enregistrées'); });

  // « source » garde la proposition d'origine, même si le libellé a changé (pièce du stock choisie).
  const dejaAuDevis = (lib) => (r.lignes || []).some((l) => l.source === lib || l.libelle.startsWith(lib));
  const propositions = h('div', { class: 'lines' }, p.reparations.map(([lib, type]) => h('div', { class: 'line static' },
    h('div', null, h('div', null, lib), h('div', { class: 'muted small' }, type === 'mo' ? 'Main d\'œuvre' : 'Pièce + pose')),
    dejaAuDevis(lib)
      ? h('span', { class: 'badge b-vert' }, 'Au devis')
      : h('button', { type: 'button', class: 'btn ghost sm', onclick: async () => {
        const l = await editerLigne({ libelle: lib, type, source: lib });
        if (l) {
          r.lignes = [...(r.lignes || []), l];
          await enregistrer(r);
          toast('Ajouté au devis', 'ok');
          rafraichir();
        }
      } }, icone('plus', 16), 'Devis'))));

  return h('div', { class: 'stack' },
    h('section', { class: 'card' },
      h('div', { class: 'muted small' }, CATEGORIES[p.cat]),
      h('h2', { class: 'diag-title' }, p.titre),
      h('div', { class: 'muted small' }, nomAppareil(appareil), r.panne ? ` · « ${r.panne} »` : ''),
      progression),
    h('section', { class: 'card' }, h('h2', { class: 'card-title' }, 'Tests à faire, dans l\'ordre'), etapes),
    h('section', { class: 'card' }, h('h2', { class: 'card-title' }, 'Causes probables'),
      h('ul', { class: 'bullets' }, p.causes.map((c) => h('li', null, c)))),
    h('section', { class: 'card' }, h('h2', { class: 'card-title' }, 'Réparations à proposer'), propositions),
    h('section', { class: 'card' }, h('h2', { class: 'card-title' }, 'Notes du technicien'), notes),
    h('div', { class: 'row-btns' },
      h('button', { type: 'button', class: 'btn ghost', onclick: async () => {
        r.diagnostic = { ...r.diagnostic, panneId: null };
        await enregistrer(r);
        rafraichir();
      } }, 'Autre panne'),
      h('a', { class: 'btn primary', href: '#/reparation/' + r.id }, icone('check', 18), 'Voir le devis')));
}
