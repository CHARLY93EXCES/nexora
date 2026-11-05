import { h, icone, uid, champ, choixPuces, lirePuces, compresserImage, toast, date, correspond } from '../util.js';
import { db } from '../db.js';
import {
  nouvelleReparation, ETATS_RECEPTION, ACCESSOIRES, MODES_PAIEMENT, TYPES_APPAREIL,
  nomAppareil, finGarantie,
} from '../modele.js';
import { aller } from '../nav.js';
import { nombre } from './composants.js';

const MARQUES = ['Samsung', 'Apple', 'Tecno', 'Infinix', 'Itel', 'Xiaomi', 'Redmi', 'Oppo', 'Vivo', 'Huawei', 'Realme', 'Nokia', 'Google', 'Motorola', 'OnePlus', 'Honor'];
const PANNES_RAPIDES = ['Écran cassé', 'Ne charge pas', 'Batterie', 'Ne s\'allume pas', 'Pas de son', 'Micro', 'Tombé dans l\'eau', 'Caméra', 'Réseau', 'Logiciel / bloqué'];

export async function vue(params, requete) {
  const [clients, appareils, reparations] = await Promise.all([db.tous('clients'), db.tous('appareils'), db.tous('reparations')]);
  clients.sort((a, b) => a.nom.localeCompare(b.nom));

  // Client présélectionné depuis sa fiche (#/reparation/nouvelle?client=ID)
  const pre = new URLSearchParams(requete || '').get('client');
  let client = clients.find((c) => c.id === pre) || null;
  let appareil = null;
  const photos = [];

  // ----- Client -----
  const nom = h('input', { type: 'text', autocomplete: 'off', placeholder: 'Nom du client' });
  const tel = h('input', { type: 'tel', inputmode: 'tel', autocomplete: 'off', placeholder: '07 00 00 00 00' });
  const suggestions = h('div', { class: 'suggest' });
  const blocClient = h('div');

  const proposer = () => {
    const q = (nom.value + ' ' + tel.value.replace(/\s/g, '')).trim();
    if (q.length < 2) { suggestions.replaceChildren(); return; }
    const res = clients.filter((c) => correspond(`${c.nom} ${String(c.tel).replace(/\s/g, '')}`, q)).slice(0, 4);
    suggestions.replaceChildren(...res.map((c) => h('button', {
      type: 'button', class: 'suggest-item',
      onclick: () => { choisirClient(c); },
    }, h('b', null, c.nom), h('span', { class: 'muted' }, ' ' + (c.tel || '')), h('span', { class: 'tag' }, 'Client existant'))));
  };
  nom.addEventListener('input', proposer);
  tel.addEventListener('input', proposer);

  // Pour un client connu, on propose d'abord son appareil le plus récent.
  const choisirClient = (c) => {
    client = c;
    appareil = appareils.filter((a) => a.clientId === c.id).sort((a, b) => (b.creeLe || '').localeCompare(a.creeLe || ''))[0] || null;
    dessinerClient();
    dessinerAppareil();
  };

  const dessinerClient = () => {
    if (client) {
      blocClient.replaceChildren(h('div', { class: 'picked' },
        h('div', null, h('b', null, client.nom), h('div', { class: 'muted small' }, client.tel || 'Sans téléphone')),
        h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { client = null; appareil = null; dessinerClient(); dessinerAppareil(); } }, 'Changer')));
    } else {
      blocClient.replaceChildren(champ('Nom', nom), champ('Téléphone (WhatsApp)', tel), suggestions);
    }
  };

  // ----- Appareil -----
  const blocAppareil = h('div');
  const type = choixPuces('type', TYPES_APPAREIL, 'Téléphone');
  const marque = h('input', { type: 'text', list: 'marques', autocomplete: 'off', placeholder: 'Samsung, Tecno, Apple…' });
  const modele = h('input', { type: 'text', autocomplete: 'off', placeholder: 'Galaxy A14, Spark 10…' });
  const imei = h('input', { type: 'text', inputmode: 'numeric', autocomplete: 'off', placeholder: 'Tapez *#06# sur l\'appareil' });
  const couleur = h('input', { type: 'text', autocomplete: 'off' });
  const formAppareil = h('div', null,
    h('div', { class: 'field' }, h('span', { class: 'lbl' }, 'Type'), type),
    h('div', { class: 'grid2' }, champ('Marque', marque), champ('Modèle', modele)),
    champ('IMEI ou n° de série', imei),
    champ('Couleur', couleur),
    h('datalist', { id: 'marques' }, MARQUES.map((m) => h('option', { value: m }))));

  const dessinerAppareil = () => {
    const siens = client ? appareils.filter((a) => a.clientId === client.id) : [];
    if (!siens.length) { appareil = null; blocAppareil.replaceChildren(formAppareil); return; }
    const garantie = (a) => {
      const r = reparations.filter((x) => x.appareilId === a.id && x.statut === 'livre')
        .map((x) => ({ x, fin: finGarantie(x) })).find((g) => g.fin && g.fin > new Date());
      return r ? h('span', { class: 'badge b-vert' }, `Sous garantie (${r.x.numero}) jusqu'au ${date(r.fin)}`) : null;
    };
    blocAppareil.replaceChildren(
      h('div', { class: 'choices' },
        siens.map((a) => h('button', {
          type: 'button', class: 'choice-card' + (appareil === a ? ' on' : ''),
          onclick: () => { appareil = a; dessinerAppareil(); },
        }, h('b', null, nomAppareil(a)), a.imei ? h('span', { class: 'muted small' }, 'IMEI ' + a.imei) : null, garantie(a))),
        h('button', { type: 'button', class: 'choice-card' + (appareil === null ? ' on' : ''), onclick: () => { appareil = null; dessinerAppareil(); } },
          h('b', null, '+ Un autre appareil'))),
      appareil === null ? formAppareil : null);
  };

  // ----- Panne, état, accessoires -----
  const panne = h('textarea', { rows: 2, placeholder: 'Ce que dit le client' });
  const rapides = h('div', { class: 'chips' }, PANNES_RAPIDES.map((p) => h('button', {
    type: 'button', class: 'chip',
    onclick: () => { panne.value = panne.value ? panne.value.replace(/\s*$/, '') + ', ' + p.toLowerCase() : p; },
  }, p)));
  const etat = choixPuces('etat', ETATS_RECEPTION, [], true);
  const etatNote = h('input', { type: 'text', placeholder: 'Autre remarque (rayure coin haut, etc.)' });
  const accessoires = choixPuces('acc', ACCESSOIRES, [], true);
  const code = h('input', { type: 'text', autocomplete: 'off', placeholder: 'Code PIN ou schéma (facultatif)' });

  // ----- Photos -----
  const vignettes = h('div', { class: 'thumbs' });
  const fichierPhoto = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true });
  fichierPhoto.addEventListener('change', async () => {
    for (const f of fichierPhoto.files) {
      try { photos.push(await compresserImage(f)); } catch (e) { toast('Photo illisible', 'error'); }
    }
    fichierPhoto.value = '';
    dessinerPhotos();
  });
  const dessinerPhotos = () => {
    vignettes.replaceChildren(
      ...photos.map((b, i) => h('div', { class: 'thumb' },
        h('img', { src: URL.createObjectURL(b), alt: `Photo ${i + 1}` }),
        h('button', { type: 'button', class: 'thumb-x', 'aria-label': 'Retirer la photo', onclick: () => { photos.splice(i, 1); dessinerPhotos(); } }, icone('x', 14)))),
      h('button', { type: 'button', class: 'thumb add', onclick: () => fichierPhoto.click() }, icone('camera'), h('span', null, 'Photo')));
  };

  // ----- Acompte, date -----
  const acompte = nombre('', { placeholder: '0' });
  const mode = h('select', null, MODES_PAIEMENT.map((m) => h('option', { value: m }, m)));
  const datePromise = h('input', { type: 'date', min: new Date().toISOString().slice(0, 10) });

  const err = h('p', { class: 'err', role: 'alert' });
  const bouton = h('button', { class: 'btn primary block lg', type: 'submit' }, icone('check', 20), 'Enregistrer le dossier');

  const form = h('form', { class: 'stack', novalidate: true },
    h('section', { class: 'card' }, h('h2', { class: 'card-title' }, '1. Client'), blocClient),
    h('section', { class: 'card' }, h('h2', { class: 'card-title' }, '2. Appareil'), blocAppareil),
    h('section', { class: 'card' }, h('h2', { class: 'card-title' }, '3. Panne et état à la réception'),
      champ('Panne signalée', panne), rapides,
      h('div', { class: 'field mt' }, h('span', { class: 'lbl' }, 'État constaté'), etat),
      champ('Remarque sur l\'état', etatNote),
      h('div', { class: 'field' }, h('span', { class: 'lbl' }, 'Accessoires laissés'), accessoires),
      champ('Code de déverrouillage', code, 'Gardé uniquement sur ce téléphone et effacé automatiquement à la livraison.'),
      h('div', { class: 'field' }, h('span', { class: 'lbl' }, 'Photos de l\'appareil'), vignettes, fichierPhoto,
        h('span', { class: 'hint' }, 'Photographiez les rayures et la casse : c\'est votre preuve en cas de litige.'))),
    h('section', { class: 'card' }, h('h2', { class: 'card-title' }, '4. Acompte et délai'),
      h('div', { class: 'grid2' }, champ('Acompte reçu', acompte), champ('Moyen', mode)),
      champ('Date prévue', datePromise)),
    err,
    bouton);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    if (!client && !nom.value.trim()) { err.textContent = 'Indiquez le nom du client.'; nom.focus(); return; }
    if (!appareil && !marque.value.trim() && !modele.value.trim()) { err.textContent = 'Indiquez au moins la marque ou le modèle de l\'appareil.'; marque.focus(); return; }
    bouton.disabled = true;
    try {
      const maintenant = new Date().toISOString();
      if (!client) {
        client = { id: uid(), nom: nom.value.trim(), tel: tel.value.trim(), notes: '', creeLe: maintenant };
        await db.ecrire('clients', client);
      }
      if (!appareil) {
        appareil = {
          id: uid(), clientId: client.id, type: lirePuces(type, 'type')[0] || 'Téléphone',
          marque: marque.value.trim(), modele: modele.value.trim(), imei: imei.value.trim(),
          couleur: couleur.value.trim(), notes: '', creeLe: maintenant,
        };
        await db.ecrire('appareils', appareil);
      }
      const idPhotos = [];
      const r = await nouvelleReparation({
        clientId: client.id,
        appareilId: appareil.id,
        panne: panne.value.trim(),
        etat: lirePuces(etat, 'etat'),
        etatNote: etatNote.value.trim(),
        accessoires: lirePuces(accessoires, 'acc'),
        code: code.value.trim(),
        datePromise: datePromise.value || '',
        paiements: Number(acompte.value) > 0
          ? [{ montant: Number(acompte.value), mode: mode.value, date: maintenant, acompte: true }] : [],
        photos: idPhotos,
      });
      for (const blob of photos) {
        const id = uid();
        await db.ecrire('photos', { id, reparationId: r.id, blob, date: maintenant });
        idPhotos.push(id);
      }
      if (idPhotos.length) await db.ecrire('reparations', r);
      toast(`Dossier ${r.numero} créé`, 'ok');
      aller(`reparation/${r.id}?nouveau`);
    } catch (ex) {
      bouton.disabled = false;
      err.textContent = 'Enregistrement impossible : ' + ex.message;
    }
  });

  if (client) choisirClient(client);
  else { dessinerClient(); dessinerAppareil(); }
  dessinerPhotos();
  return { titre: 'Nouvelle réparation', retour: '#/reparations', contenu: form };
}
