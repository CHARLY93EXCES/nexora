// Point d'entrée : licence, navigation entre écrans, installation et mises à jour.
import { h, icone, toast, feuille, definirDevise } from './util.js';
import { db, demanderStockagePersistant } from './db.js';
import { boutique, REGLAGES_DEFAUT } from './modele.js';
import { licenceActive, activer, extraireJeton } from './licence.js';
import { enregistrerRendu, aller, installation } from './nav.js';
import * as accueil from './vues/accueil.js';
import * as reparations from './vues/reparations.js';
import * as nouvelle from './vues/nouvelle.js';
import * as reparation from './vues/reparation.js';
import * as diagnostic from './vues/diagnostic.js';
import * as clients from './vues/clients.js';
import * as stock from './vues/stock.js';
import * as plus from './vues/plus.js';

const ROUTES = [
  [/^$/, accueil.vue, 'accueil'],
  [/^reparations$/, reparations.liste, 'reparations'],
  [/^reparation\/nouvelle$/, nouvelle.vue, 'reparations'],
  [/^reparation\/([\w-]+)\/diagnostic$/, diagnostic.vue, 'reparations'],
  [/^reparation\/([\w-]+)$/, reparation.vue, 'reparations'],
  [/^clients$/, clients.liste, 'plus'],
  [/^client\/([\w-]+)$/, clients.fiche, 'plus'],
  [/^appareil\/([\w-]+)$/, clients.appareil, 'plus'],
  [/^stock$/, stock.vue, 'stock'],
  [/^plus$/, plus.vue, 'plus'],
  [/^plus\/boutique$/, plus.reglagesBoutique, 'plus'],
];

const $ = (id) => document.getElementById(id);
let rendus = 0;

async function afficher(garderPosition = false) {
  const numero = ++rendus;
  const brut = location.hash.replace(/^#\/?/, '');

  // Lien d'activation reçu sur WhatsApp : …/app/#activer=JETON
  if (brut.startsWith('activer=')) {
    await traiterActivation(extraireJeton(brut));
    return;
  }

  const lic = await licenceActive();
  if (!lic.ok) { ecranActivation(lic.erreur); return; }
  document.body.classList.remove('locked');

  const [chemin, requete = ''] = brut.split('?');
  let trouve = null;
  for (const [motif, fn, onglet] of ROUTES) {
    const m = chemin.match(motif);
    if (m) { trouve = { fn, onglet, params: m.slice(1) }; break; }
  }
  if (!trouve) { aller(''); return; }

  definirDevise((await boutique()).devise);
  const y = window.scrollY;
  let res;
  try {
    res = await trouve.fn(trouve.params, requete);
  } catch (e) {
    console.error(e);
    res = { titre: 'Erreur', contenu: h('div', { class: 'empty' }, h('p', null, 'Un problème est survenu : ' + e.message), h('a', { class: 'btn ghost', href: '#/' }, 'Retour à l\'accueil')) };
  }
  if (numero !== rendus) return; // un autre écran a été demandé entre-temps

  $('back').replaceChildren(res.retour
    ? h('a', { class: 'icon-btn', href: res.retour, 'aria-label': 'Retour' }, icone('back'))
    : h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, 'N'));
  $('titre').textContent = res.titre;
  document.title = `${res.titre} · NEXORA`;
  $('action').replaceChildren(res.action || '');
  $('vue').replaceChildren(res.contenu);
  $('fab').replaceChildren(res.fab
    ? h('a', { class: 'fab', href: res.fab.href, 'aria-label': res.fab.libelle }, icone('plus', 26), h('span', null, res.fab.libelle))
    : '');
  for (const a of document.querySelectorAll('.tabbar a')) {
    const actif = a.dataset.onglet === trouve.onglet;
    a.classList.toggle('on', actif);
    if (actif) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
  window.scrollTo(0, garderPosition ? y : 0);
}

// ---------- Activation ----------

async function traiterActivation(jeton) {
  const r = jeton ? await activer(jeton) : { ok: false, erreur: 'Lien d\'activation incomplet.' };
  if (!r.ok) {
    history.replaceState(null, '', location.pathname);
    ecranActivation(r.erreur);
    return;
  }
  // Le nom de l'atelier de la licence sert de nom par défaut sur les reçus.
  const b = await db.reglage('boutique', {});
  if (!b.nom || b.nom === REGLAGES_DEFAUT.nom) await db.definir('boutique', { ...b, nom: r.licence.n });
  history.replaceState(null, '', location.pathname + '#/');
  await afficher();
  bienvenue(r.licence);
}

function ecranActivation(erreur) {
  document.body.classList.add('locked');
  const champ = h('textarea', { rows: 3, placeholder: 'Collez ici le lien d\'activation reçu sur WhatsApp', 'aria-label': 'Lien d\'activation' });
  const msg = h('p', { class: 'err', role: 'alert' }, erreur || '');
  const bouton = h('button', { class: 'btn primary block lg', type: 'submit' }, 'Activer');
  const form = h('form', { class: 'stack-s' }, champ, msg, bouton);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const jeton = extraireJeton(champ.value);
    if (!jeton) { msg.textContent = 'Ce texte ne contient pas de lien d\'activation NEXORA.'; return; }
    bouton.disabled = true;
    await traiterActivation(jeton);
    bouton.disabled = false;
  });
  const demande = new URL('../mobile/', location.href).href;
  $('vue').replaceChildren(h('div', { class: 'activation' },
    h('div', { class: 'act-logo', 'aria-hidden': 'true' }, 'N'),
    h('h1', null, 'NEXORA Mobile'),
    h('p', { class: 'muted' }, 'La gestion de votre atelier de réparation, dans votre poche : dossiers, diagnostic guidé, devis, reçus et WhatsApp, même sans internet.'),
    h('section', { class: 'card' },
      h('h2', { class: 'card-title' }, 'Activer l\'application'),
      h('p', { class: 'muted small' }, 'Après votre achat, NEXORA vous envoie un lien d\'activation sur WhatsApp. Ouvrez-le sur ce téléphone, ou copiez-le et collez-le ci-dessous.'),
      form),
    h('section', { class: 'card' },
      h('h2', { class: 'card-title' }, 'Pas encore de licence ?'),
      h('p', { class: 'muted small' }, 'NEXORA Mobile est réservé aux ateliers qui en font la demande.'),
      h('a', { class: 'btn whatsapp block', href: demande }, icone('chat', 18), 'Demander la version mobile'))));
  $('titre').textContent = '';
  $('back').replaceChildren();
  $('action').replaceChildren();
  $('fab').replaceChildren();
}

function bienvenue(lic) {
  feuille('Bienvenue !', (fermer) => h('div', null,
    h('p', null, 'NEXORA Mobile est activé pour ', h('b', null, lic.n), '.'),
    h('ol', { class: 'welcome' },
      h('li', null, h('b', null, 'Installez l\'application'), ' sur l\'écran d\'accueil (menu ⋮ › Installer, ou Partager › Sur l\'écran d\'accueil sur iPhone).'),
      h('li', null, h('b', null, 'Configurez votre atelier'), ' : logo, adresse, téléphone pour vos reçus.'),
      h('li', null, h('b', null, 'Créez votre premier dossier'), ' quand un client dépose un appareil.')),
    h('div', { class: 'stack-s' },
      h('button', { class: 'btn primary block', type: 'button', onclick: () => { fermer(); aller('plus/boutique'); } }, 'Configurer mon atelier'),
      h('button', { class: 'btn ghost block', type: 'button', onclick: () => fermer() }, 'Plus tard'))));
}

// ---------- Installation et mises à jour ----------

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installation.invite = e;
});

let miseAJourDemandee = false;

function surveillerMisesAJour() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    const proposer = (sw) => {
      const zone = $('toasts');
      const bandeau = h('div', { class: 'toast update', role: 'status' },
        h('span', null, 'Nouvelle version de NEXORA disponible.'),
        h('button', { type: 'button', class: 'btn sm primary', onclick: () => { miseAJourDemandee = true; sw.postMessage('activer'); } }, 'Mettre à jour'));
      zone.append(bandeau);
    };
    if (reg.waiting && navigator.serviceWorker.controller) proposer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing;
      sw.addEventListener('statechange', () => {
        if (sw.state === 'installed' && navigator.serviceWorker.controller) proposer(sw);
      });
    });
    setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
  }).catch(() => {});
  // Recharger seulement quand l'utilisateur a demandé la mise à jour
  // (pas lors de la toute première installation du mode hors ligne).
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!miseAJourDemandee) return;
    miseAJourDemandee = false;
    location.reload();
  });
}

// ---------- Démarrage ----------

enregistrerRendu(afficher);
window.addEventListener('hashchange', () => afficher());
window.addEventListener('unhandledrejection', (e) => {
  console.error(e.reason);
  toast('Erreur : ' + ((e.reason && e.reason.message) || e.reason), 'error');
});
afficher();
demanderStockagePersistant();
surveillerMisesAJour();
