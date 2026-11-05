import { h, icone, champ, toast, confirmer, date, ilYa, lireCommeDataURL } from '../util.js';
import { db } from '../db.js';
import { boutique, REGLAGES_DEFAUT } from '../modele.js';
import { licenceActive } from '../licence.js';
import { exporter, lire, restaurer } from '../sauvegarde.js';
import { aller, rafraichir, installation } from '../nav.js';
import { section, nombre } from './composants.js';

export const VERSION = '1.0.0';
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const CONTACT = '2250172716458';

export async function vue() {
  const [b, lic, derniere] = await Promise.all([boutique(), licenceActive(), db.reglage('derniereSauvegarde', null)]);
  const autonome = matchMedia('(display-mode: standalone)').matches || navigator.standalone;

  // ----- Sauvegarde -----
  const avecPhotos = h('input', { type: 'checkbox' });
  const fichier = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  fichier.addEventListener('change', async () => {
    const f = fichier.files[0];
    fichier.value = '';
    if (!f) return;
    try {
      const { contenu, resume } = await lire(f);
      const ok = await confirmer('Restaurer cette sauvegarde ?',
        `Sauvegarde du ${date(resume.date)} : ${pluriel(resume.reparations, 'réparation')}, ${pluriel(resume.clients, 'client')}, ` +
        `${pluriel(resume.stock, 'pièce')}, ${pluriel(resume.photos, 'photo')}. ` +
        'Toutes les données actuelles de ce téléphone seront remplacées.', 'Restaurer', true);
      if (!ok) return;
      await restaurer(contenu);
      toast('Sauvegarde restaurée', 'ok');
      aller('');
    } catch (e) {
      toast(e.message, 'error');
    }
  });

  const sauvegarde = section('Sauvegarde',
    h('p', { class: 'muted' }, 'Vos données sont enregistrées uniquement sur ce téléphone. Sauvegardez-les régulièrement : envoyez le fichier sur votre WhatsApp, Google Drive ou un ordinateur.'),
    h('div', { class: 'kv' }, h('span', { class: 'muted' }, 'Dernière sauvegarde'), h('b', null, derniere ? `${date(derniere)} (${ilYa(derniere)})` : 'Jamais')),
    h('label', { class: 'check' }, avecPhotos, h('span', null, 'Inclure les photos (fichier plus lourd)')),
    h('div', { class: 'stack-s mt' },
      h('button', { type: 'button', class: 'btn primary block', onclick: async (e) => {
        e.currentTarget.disabled = true;
        try {
          const r = await exporter(avecPhotos.checked);
          toast(`Sauvegarde prête (${Math.max(1, Math.round(r.taille / 1024))} Ko)`, 'ok');
          rafraichir();
        } catch (err) { toast('Sauvegarde impossible : ' + err.message, 'error'); rafraichir(); }
      } }, icone('download', 18), 'Sauvegarder maintenant'),
      h('button', { type: 'button', class: 'btn ghost block', onclick: () => fichier.click() }, icone('upload', 18), 'Restaurer une sauvegarde'),
      fichier));

  // ----- Installation -----
  const blocInstall = autonome ? null : section('Installer l\'application',
    installation.invite
      ? h('button', { type: 'button', class: 'btn primary block', onclick: async () => {
        installation.invite.prompt();
        await installation.invite.userChoice;
        installation.invite = null;
        rafraichir();
      } }, icone('install', 18), 'Installer NEXORA sur ce téléphone')
      : h('div', null,
        h('p', null, h('b', null, 'Android (Chrome) : '), 'menu ⋮ en haut à droite, puis « Ajouter à l\'écran d\'accueil » ou « Installer l\'application ».'),
        h('p', null, h('b', null, 'iPhone (Safari) : '), 'bouton Partager, puis « Sur l\'écran d\'accueil ». Ouvrez ensuite NEXORA depuis l\'icône et collez votre lien d\'activation si on vous le demande.')),
    h('p', { class: 'hint' }, 'Une fois installée, NEXORA s\'ouvre comme une application et fonctionne sans internet.'));

  // ----- Licence -----
  const l = lic.licence || {};
  const licence = section('Licence',
    h('div', { class: 'kv' }, h('span', { class: 'muted' }, 'Atelier'), h('b', null, l.n || '—')),
    h('div', { class: 'kv' }, h('span', { class: 'muted' }, 'N° de licence'), h('span', null, l.id || '—')),
    h('div', { class: 'kv' }, h('span', { class: 'muted' }, 'Valable'), h('span', null, l.exp ? `jusqu'au ${date(l.exp)}` : 'Sans limite de durée')));

  return {
    titre: 'Plus',
    contenu: h('div', { class: 'stack' },
      h('section', { class: 'card' },
        h('a', { class: 'row-link', href: '#/plus/boutique' }, icone('store', 20),
          h('div', null, h('b', null, 'Mon atelier'), h('div', { class: 'muted small' }, 'Nom, logo, reçus, garantie')), icone('back', 18)),
        h('a', { class: 'row-link', href: '#/clients' }, icone('users', 20),
          h('div', null, h('b', null, 'Clients'), h('div', { class: 'muted small' }, 'Fiches et passeports des appareils')), icone('back', 18))),
      sauvegarde,
      blocInstall,
      licence,
      section('Aide',
        h('a', { class: 'btn whatsapp block', href: `https://wa.me/${CONTACT}?text=${encodeURIComponent('Bonjour, j\'ai besoin d\'aide sur NEXORA Mobile.')}`, target: '_blank', rel: 'noopener' },
          icone('chat', 18), 'Assistance NEXORA sur WhatsApp'),
        h('p', { class: 'hint center' }, `NEXORA Mobile ${VERSION}`))),
  };
}

export async function reglagesBoutique() {
  const b = await boutique();
  let logo = b.logo;
  const apercuLogo = h('div', { class: 'logo-preview' });
  const dessinerLogo = () => apercuLogo.replaceChildren(logo
    ? h('img', { src: logo, alt: 'Logo de l\'atelier' })
    : h('span', { class: 'muted small' }, 'Aucun logo'));
  dessinerLogo();
  const fichierLogo = h('input', { type: 'file', accept: 'image/*', hidden: true });
  fichierLogo.addEventListener('change', async () => {
    const f = fichierLogo.files[0];
    if (!f) return;
    try { logo = await reduireLogo(f); dessinerLogo(); } catch (e) { toast('Image illisible', 'error'); }
  });

  const nom = h('input', { type: 'text', value: b.nom === REGLAGES_DEFAUT.nom ? '' : b.nom, placeholder: 'Nom de votre atelier' });
  const adresse = h('input', { type: 'text', value: b.adresse, placeholder: 'Quartier, ville' });
  const telephone = h('input', { type: 'tel', value: b.telephone, placeholder: '07 00 00 00 00' });
  const formats = [['58', 'Ticket 58 mm'], ['80', 'Ticket 80 mm'], ['A4', 'A4']];
  const format = h('select', null, formats.map(([v, l]) => h('option', { value: v, selected: v === b.format }, l)));
  const garantie = nombre(b.garantieJours, { placeholder: '30' });
  const prefixe = h('input', { type: 'text', value: b.prefixe, maxlength: '4' });
  const devise = h('input', { type: 'text', value: b.devise, maxlength: '6' });
  const indicatif = h('input', { type: 'text', inputmode: 'numeric', value: b.indicatif, maxlength: '4' });
  const pied = h('input', { type: 'text', value: b.pied });
  const conditions = h('textarea', { rows: 4 }, b.conditions);

  const form = h('form', { class: 'stack' },
    h('section', { class: 'card' }, h('h2', { class: 'card-title' }, 'Identité'),
      h('div', { class: 'field' }, h('span', { class: 'lbl' }, 'Logo'),
        h('div', { class: 'logo-row' }, apercuLogo,
          h('div', { class: 'stack-s' },
            h('button', { type: 'button', class: 'btn ghost sm', onclick: () => fichierLogo.click() }, 'Choisir une image'),
            h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { logo = ''; dessinerLogo(); } }, 'Retirer'))),
        fichierLogo),
      champ('Nom de l\'atelier', nom),
      champ('Adresse', adresse),
      champ('Téléphone de l\'atelier', telephone)),
    h('section', { class: 'card' }, h('h2', { class: 'card-title' }, 'Reçus et réparations'),
      h('div', { class: 'grid2' }, champ('Format par défaut', format), champ('Garantie (jours)', garantie)),
      h('div', { class: 'grid2' }, champ('Préfixe des dossiers', prefixe, 'Ex. R → R-0001'), champ('Monnaie', devise)),
      champ('Indicatif pays (WhatsApp)', indicatif, 'Côte d\'Ivoire : 225. Ajouté aux numéros des clients.'),
      champ('Message en bas des reçus', pied),
      champ('Conditions (bon de dépôt et reçu)', conditions)),
    h('button', { class: 'btn primary block lg', type: 'submit' }, icone('check', 20), 'Enregistrer'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await db.definir('boutique', {
      nom: nom.value.trim() || REGLAGES_DEFAUT.nom,
      adresse: adresse.value.trim(),
      telephone: telephone.value.trim(),
      logo,
      format: format.value,
      garantieJours: Math.max(0, Number(garantie.value) || 0),
      prefixe: prefixe.value.trim() || 'R',
      devise: devise.value.trim() || 'FCFA',
      indicatif: indicatif.value.replace(/\D/g, '') || '225',
      pied: pied.value.trim(),
      conditions: conditions.value.trim(),
    });
    toast('Atelier enregistré', 'ok');
    aller('plus');
  });

  return { titre: 'Mon atelier', retour: '#/plus', contenu: form };
}

/** Réduit le logo (PNG, 400 px max) pour garder des reçus légers. */
async function reduireLogo(f) {
  const bmp = await createImageBitmap(f);
  const r = Math.min(1, 400 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * r);
  c.height = Math.round(bmp.height * r);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return lireCommeDataURL(await new Promise((res) => c.toBlob(res, 'image/png')));
}

