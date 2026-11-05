import { h, icone, champ, toast, confirmer, feuille, date, ilYa, lireCommeDataURL } from '../util.js';
import { db } from '../db.js';
import { boutique, REGLAGES_DEFAUT } from '../modele.js';
import { licenceActive, codeAppareil, formaterCode } from '../licence.js';
import { exporter, ouvrir, lire, restaurer } from '../sauvegarde.js';
import { codeAccesActif, definirCodeAcces, retirerCodeAcces, verifierCodeAcces } from '../securite.js';
import { aller, rafraichir, installation } from '../nav.js';
import { section, nombre } from './composants.js';

export const VERSION = '1.1.0';
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const CONTACT = '2250172716458';

export async function vue() {
  const [b, lic, derniere, verrou, code] = await Promise.all([
    boutique(), licenceActive(), db.reglage('derniereSauvegarde', null), codeAccesActif(), codeAppareil(),
  ]);
  const autonome = matchMedia('(display-mode: standalone)').matches || navigator.standalone;

  // ----- Sauvegarde -----
  const avecPhotos = h('input', { type: 'checkbox' });
  const motDePasse = h('input', { type: 'password', autocomplete: 'new-password', placeholder: 'Mot de passe (conseillé)' });
  const fichier = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  fichier.addEventListener('change', async () => {
    const f = fichier.files[0];
    fichier.value = '';
    if (!f) return;
    try {
      const { contenu, protegee } = await ouvrir(f);
      let mdp = '';
      if (protegee) {
        mdp = await demanderMotDePasse();
        if (!mdp) return;
      }
      const { donnees, resume } = await lire(contenu, mdp);
      const ok = await confirmer('Restaurer cette sauvegarde ?',
        `Sauvegarde du ${date(resume.date)} : ${pluriel(resume.reparations, 'réparation')}, ${pluriel(resume.clients, 'client')}, ` +
        `${pluriel(resume.stock, 'pièce')}, ${pluriel(resume.photos, 'photo')}. ` +
        'Toutes les données actuelles de ce téléphone seront remplacées.', 'Restaurer', true);
      if (!ok) return;
      await restaurer(donnees);
      toast('Sauvegarde restaurée', 'ok');
      aller('');
    } catch (e) {
      toast(e.message, 'error');
    }
  });

  const sauvegarde = section('Sauvegarde',
    h('p', { class: 'muted' }, 'Vos données sont enregistrées uniquement sur ce téléphone. Sauvegardez-les régulièrement : envoyez le fichier sur votre WhatsApp, Google Drive ou un ordinateur.'),
    h('div', { class: 'kv' }, h('span', { class: 'muted' }, 'Dernière sauvegarde'), h('b', null, derniere ? `${date(derniere)} (${ilYa(derniere)})` : 'Jamais')),
    champ('Protéger le fichier', motDePasse,
      'Avec un mot de passe, le fichier est chiffré : personne ne peut lire vos clients sans lui. Notez-le bien : sans lui, la sauvegarde ne peut pas être restaurée.'),
    h('label', { class: 'check' }, avecPhotos, h('span', null, 'Inclure les photos (fichier plus lourd)')),
    h('div', { class: 'stack-s mt' },
      h('button', { type: 'button', class: 'btn primary block', onclick: async (e) => {
        if (motDePasse.value && motDePasse.value.length < 6) { toast('Mot de passe trop court : 6 caractères minimum.', 'error'); return; }
        e.currentTarget.disabled = true;
        try {
          const r = await exporter(avecPhotos.checked, motDePasse.value);
          toast(`Sauvegarde ${motDePasse.value ? 'protégée ' : ''}prête (${Math.max(1, Math.round(r.taille / 1024))} Ko)`, 'ok');
          rafraichir();
        } catch (err) { toast('Sauvegarde impossible : ' + err.message, 'error'); rafraichir(); }
      } }, icone('download', 18), 'Sauvegarder maintenant'),
      h('button', { type: 'button', class: 'btn ghost block', onclick: () => fichier.click() }, icone('upload', 18), 'Restaurer une sauvegarde'),
      fichier),
    h('p', { class: 'hint' }, 'Les codes de déverrouillage des clients ne sont jamais copiés dans les sauvegardes.'));

  // ----- Sécurité -----
  const securite = section('Sécurité',
    h('div', { class: 'kv' }, h('span', { class: 'muted' }, 'Code d\'accès'), h('b', { class: verrou ? 'pos' : '' }, verrou ? 'Activé' : 'Désactivé')),
    h('p', { class: 'muted small' }, 'Le code est demandé à l\'ouverture et après 2 minutes en arrière-plan. Il protège vos clients si le téléphone est perdu ou prêté.'),
    h('div', { class: 'stack-s' },
      h('button', { type: 'button', class: 'btn ' + (verrou ? 'ghost' : 'primary') + ' block', onclick: async () => {
        if (verrou && !(await confirmerCodeActuel())) return;
        if (await choisirCode()) rafraichir();
      } }, icone('shield', 18), verrou ? 'Changer le code' : 'Définir un code d\'accès'),
      verrou ? h('button', { type: 'button', class: 'btn danger-ghost block', onclick: async () => {
        if (!(await confirmerCodeActuel())) return;
        await retirerCodeAcces();
        toast('Code d\'accès retiré');
        rafraichir();
      } }, 'Retirer le code') : null));

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
    h('div', { class: 'kv' }, h('span', { class: 'muted' }, 'Code du téléphone'), h('span', { class: 'code' }, formaterCode(code))),
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
      securite,
      blocInstall,
      licence,
      section('Aide',
        h('a', { class: 'btn whatsapp block', href: `https://wa.me/${CONTACT}?text=${encodeURIComponent('Bonjour, j\'ai besoin d\'aide sur NEXORA Mobile.')}`, target: '_blank', rel: 'noopener' },
          icone('chat', 18), 'Assistance NEXORA sur WhatsApp'),
        h('p', { class: 'hint center' }, `NEXORA Mobile ${VERSION}`))),
  };
}

function demanderMotDePasse() {
  return feuille('Sauvegarde protégée', (fermer) => {
    const mdp = h('input', { type: 'password', autocomplete: 'current-password' });
    return h('form', { onsubmit: (e) => { e.preventDefault(); fermer(mdp.value); } },
      champ('Mot de passe de la sauvegarde', mdp),
      h('button', { class: 'btn primary block', type: 'submit' }, 'Ouvrir'));
  });
}

function confirmerCodeActuel() {
  return feuille('Code actuel', (fermer) => {
    const code = h('input', { type: 'password', inputmode: 'numeric', autocomplete: 'off', class: 'pin' });
    const err = h('p', { class: 'err' });
    return h('form', { onsubmit: async (e) => {
      e.preventDefault();
      const r = await verifierCodeAcces(code.value);
      if (r.ok) fermer(true); else { err.textContent = r.erreur; code.value = ''; }
    } },
    champ('Entrez votre code d\'accès actuel', code), err,
    h('button', { class: 'btn primary block', type: 'submit' }, 'Valider'));
  });
}

function choisirCode() {
  return feuille('Code d\'accès', (fermer) => {
    const code = h('input', { type: 'password', inputmode: 'numeric', autocomplete: 'new-password', maxlength: '12', class: 'pin' });
    const confirmation = h('input', { type: 'password', inputmode: 'numeric', autocomplete: 'new-password', maxlength: '12', class: 'pin' });
    const err = h('p', { class: 'err' });
    return h('form', { onsubmit: async (e) => {
      e.preventDefault();
      if (!/^\d{4,12}$/.test(code.value)) { err.textContent = 'Le code doit contenir de 4 à 12 chiffres (6 conseillés).'; return; }
      if (/^(\d)\1+$/.test(code.value) || '0123456789'.includes(code.value) || '9876543210'.includes(code.value)) {
        err.textContent = 'Code trop facile à deviner. Évitez 1234 ou 0000.'; return;
      }
      if (code.value !== confirmation.value) { err.textContent = 'Les deux codes ne sont pas identiques.'; return; }
      await definirCodeAcces(code.value);
      toast('Code d\'accès enregistré', 'ok');
      fermer(true);
    } },
    champ('Nouveau code (chiffres)', code, '6 chiffres conseillés. Ne le donnez pas à vos employés si vous voulez garder le contrôle.'),
    champ('Confirmez le code', confirmation),
    err,
    h('button', { class: 'btn primary block', type: 'submit' }, 'Enregistrer le code'));
  });
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

