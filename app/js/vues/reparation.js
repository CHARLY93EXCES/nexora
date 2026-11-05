import {
  h, icone, argent, date, dateHeure, feuille, confirmer, toast, champ, choixPuces, lirePuces,
  compresserImage, uid, partagerFichier, numeroWhatsApp,
} from '../util.js';
import { db } from '../db.js';
import {
  STATUTS, statut, montants, nomAppareil, changerStatut, enregistrer, boutique, finGarantie,
  enRetard, supprimerReparation, ETATS_RECEPTION, ACCESSOIRES, MODES_PAIEMENT,
} from '../modele.js';
import { panne as trouverPanne } from '../pannes.js';
import { MODELES, contexte, modeleConseille, lienWhatsApp } from '../whatsapp.js';
import { DOCUMENTS, preparer, image, imprimer } from '../recu.js';
import { aller, rafraichir } from '../nav.js';
import { badge, section, editerLigne, saisirPaiement, nombre } from './composants.js';

export async function vue([id], requete) {
  const r = await db.lire('reparations', id);
  if (!r) return { titre: 'Dossier introuvable', retour: '#/reparations', contenu: h('p', { class: 'empty' }, 'Ce dossier n\'existe plus.') };
  const [client, appareil, b] = await Promise.all([db.lire('clients', r.clientId), db.lire('appareils', r.appareilId), boutique()]);
  const m = montants(r);
  const s = statut(r.statut);
  const fin = finGarantie(r);

  // Juste après la création : proposer le bon de dépôt et le message de réception.
  if (requete === 'nouveau') {
    history.replaceState(null, '', '#/reparation/' + r.id);
    setTimeout(() => premiersPas(r, client, appareil, b), 300);
  }

  // ---------- En-tête ----------
  const entete = h('section', { class: 'card head' },
    h('div', { class: 'head-top' },
      h('span', { class: 'num lg' }, r.numero),
      badge(r.statut),
      enRetard(r) ? h('span', { class: 'badge b-rouge' }, 'En retard') : null),
    h('div', { class: 'head-title' }, nomAppareil(appareil)),
    h('div', { class: 'muted small' },
      `Déposé le ${date(r.creeLe)}`,
      r.datePromise ? ` · prévu le ${date(r.datePromise)}` : '',
      fin ? ` · garantie jusqu'au ${date(fin)}` : ''),
    h('div', { class: 'actions' },
      action('wrench', 'Statut', () => choisirStatut(r, client, appareil, b)),
      action('chat', 'WhatsApp', () => envoyerWhatsApp(r, client, appareil, b)),
      action('receipt', 'Reçu', () => documents(r, client, appareil, b)),
      client && client.tel ? h('a', { class: 'action', href: 'tel:' + client.tel.replace(/\s/g, '') }, icone('phone'), h('span', null, 'Appeler')) : null));

  // ---------- Prochaine étape conseillée ----------
  const conseil = prochaineEtape(r, m);

  // ---------- Client et appareil ----------
  const quiQuoi = section(null,
    h('a', { class: 'row-link', href: client ? '#/client/' + client.id : '#/clients' },
      icone('users', 20), h('div', null, h('b', null, client ? client.nom : 'Client inconnu'), h('div', { class: 'muted small' }, client ? client.tel : '')), icone('back', 18)),
    h('a', { class: 'row-link', href: appareil ? '#/appareil/' + appareil.id : '#/clients' },
      icone('device', 20), h('div', null, h('b', null, nomAppareil(appareil)),
        h('div', { class: 'muted small' }, [appareil && appareil.imei ? 'IMEI ' + appareil.imei : '', appareil && appareil.couleur].filter(Boolean).join(' · ') || 'Passeport de l\'appareil')),
      icone('back', 18)));

  // ---------- Réception ----------
  const codeVisible = h('span', { class: 'code' }, '••••');
  const reception = section('Réception',
    info('Panne signalée', r.panne || '—'),
    (r.etat || []).length || r.etatNote ? info('État constaté', [...(r.etat || []), r.etatNote].filter(Boolean).join(', ')) : null,
    info('Accessoires', (r.accessoires || []).join(', ') || 'Aucun'),
    r.code ? h('div', { class: 'kv' }, h('span', { class: 'muted' }, 'Code'),
      h('button', { type: 'button', class: 'link', onclick: () => { codeVisible.textContent = codeVisible.textContent === '••••' ? r.code : '••••'; } }, codeVisible)) : null,
    r.codeEfface ? info('Code', 'Effacé à la livraison') : null,
    photosDuDossier(r),
    h('button', { type: 'button', class: 'btn ghost sm', onclick: () => modifierReception(r) }, icone('edit', 16), 'Modifier'));

  // ---------- Diagnostic ----------
  const p = r.diagnostic && trouverPanne(r.diagnostic.panneId);
  const diag = section('Diagnostic',
    p ? h('div', null,
      h('b', null, p.titre),
      h('div', { class: 'muted small' }, `${(r.diagnostic.faits || []).length} / ${p.etapes.length} tests faits`),
      r.diagnostic.notes ? h('p', { class: 'note-text' }, r.diagnostic.notes) : null) : h('p', { class: 'muted' }, 'Pas encore de diagnostic.'),
    h('a', { class: 'btn ' + (p ? 'ghost' : 'primary') + ' sm', href: `#/reparation/${r.id}/diagnostic` }, icone('stetho', 16), p ? 'Ouvrir le diagnostic' : 'Diagnostic guidé'));

  // ---------- Devis ----------
  const lignes = h('div', { class: 'lines' }, (r.lignes || []).length
    ? r.lignes.map((l) => h('button', { type: 'button', class: 'line', onclick: () => modifierLigne(r, l) },
      h('div', null, h('div', null, l.libelle, Number(l.qte) > 1 ? h('span', { class: 'muted' }, ` x${l.qte}`) : null),
        h('div', { class: 'muted small' }, l.type === 'mo' ? 'Main d\'œuvre' : (l.stockId ? 'Pièce du stock' : 'Pièce'))),
      h('b', null, argent(l.qte * l.prix))))
    : [h('p', { class: 'muted' }, 'Aucune ligne. Ajoutez les pièces et la main d\'œuvre, ou passez par le diagnostic guidé.')]);
  const remise = nombre(r.remise || '', { placeholder: '0', 'aria-label': 'Remise' });
  remise.addEventListener('change', async () => { r.remise = Number(remise.value) || 0; await enregistrer(r); rafraichir(); });
  const etatsDevis = [['brouillon', 'Brouillon'], ['envoye', 'Envoyé'], ['accepte', 'Accepté'], ['refuse', 'Refusé']];
  const devisStatut = h('div', { class: 'chips' }, etatsDevis.map(([v, lib]) => h('button', {
    type: 'button', class: 'chip' + ((r.devisStatut || 'brouillon') === v ? ' on' : ''),
    onclick: () => changerDevis(r, v),
  }, lib)));
  const devis = section('Devis',
    lignes,
    h('div', { class: 'row-btns' },
      h('button', { type: 'button', class: 'btn ghost sm', onclick: async () => {
        const l = await editerLigne({});
        if (l) { r.lignes = [...(r.lignes || []), l]; await enregistrer(r); rafraichir(); }
      } }, icone('plus', 16), 'Ajouter une ligne')),
    (r.lignes || []).length ? h('div', { class: 'totals' },
      h('div', { class: 'kv' }, h('span', { class: 'muted' }, 'Remise'), h('div', { class: 'inline-input' }, remise)),
      h('div', { class: 'kv total' }, h('span', null, 'Total'), h('b', null, argent(m.total))),
      h('div', { class: 'kv' }, h('span', { class: 'muted' }, 'Coût des pièces'), h('span', null, argent(m.cout))),
      h('div', { class: 'kv' }, h('span', { class: 'muted' }, 'Votre marge'), h('b', { class: m.marge < 0 ? 'neg' : 'pos' }, argent(m.marge)))) : null,
    h('div', { class: 'field mt' }, h('span', { class: 'lbl' }, 'Réponse du client'), devisStatut));

  // ---------- Paiements ----------
  const paiements = section('Paiements',
    (r.paiements || []).length
      ? h('div', { class: 'lines' }, r.paiements.map((pm, i) => h('div', { class: 'line static' },
        h('div', null, h('div', null, pm.acompte ? 'Acompte' : 'Paiement', ' · ', pm.mode), h('div', { class: 'muted small' }, dateHeure(pm.date))),
        h('div', { class: 'line-end' }, h('b', null, argent(pm.montant)),
          h('button', { type: 'button', class: 'icon-btn sm', 'aria-label': 'Supprimer ce paiement', onclick: async () => {
            if (await confirmer('Supprimer ce paiement ?', `${argent(pm.montant)} (${pm.mode}) sera retiré du dossier.`, 'Supprimer', true)) {
              r.paiements.splice(i, 1); await enregistrer(r); rafraichir();
            }
          } }, icone('trash', 16))))))
      : h('p', { class: 'muted' }, 'Aucun paiement reçu.'),
    h('div', { class: 'totals' },
      h('div', { class: 'kv' }, h('span', { class: 'muted' }, 'Payé'), h('b', null, argent(m.paye))),
      h('div', { class: 'kv total' }, h('span', null, 'Reste à payer'), h('b', { class: m.reste ? 'neg' : 'pos' }, argent(m.reste)))),
    h('button', { type: 'button', class: 'btn primary sm', onclick: async () => {
      const pm = await saisirPaiement(m.reste, MODES_PAIEMENT);
      if (pm) { r.paiements = [...(r.paiements || []), pm]; await enregistrer(r); toast('Paiement enregistré', 'ok'); rafraichir(); }
    } }, icone('plus', 16), 'Encaisser'));

  // ---------- Historique ----------
  const historique = section('Historique',
    h('ol', { class: 'timeline' }, [...(r.historique || [])].reverse().map((e) =>
      h('li', null, h('b', null, statut(e.statut).nom), h('span', { class: 'muted small' }, ' · ' + dateHeure(e.date)), e.note ? h('div', { class: 'small' }, e.note) : null))));

  const supprimer = h('button', { type: 'button', class: 'btn danger-ghost block', onclick: async () => {
    if (await confirmer('Supprimer ce dossier ?', `Le dossier ${r.numero} et ses photos seront effacés définitivement. Les pièces déjà déduites retournent en stock.`, 'Supprimer', true)) {
      await supprimerReparation(r);
      toast('Dossier supprimé');
      aller('reparations');
    }
  } }, icone('trash', 16), 'Supprimer le dossier');

  return {
    titre: r.numero,
    retour: '#/reparations',
    contenu: h('div', { class: 'stack' }, entete, conseil, quiQuoi, reception, diag, devis, paiements, historique, supprimer),
  };

  // ---------- Fonctions locales ----------
  function action(ic, lib, fn) {
    return h('button', { type: 'button', class: 'action', onclick: fn }, icone(ic), h('span', null, lib));
  }
  function info(k, v) {
    return h('div', { class: 'kv top' }, h('span', { class: 'muted' }, k), h('span', null, v));
  }
}

// Bandeau « prochaine étape » selon l'état du dossier.
function prochaineEtape(r, m) {
  let texte = null;
  if (r.statut === 'recu') texte = 'Lancez le diagnostic guidé pour trouver la panne et préparer le devis.';
  else if (r.statut === 'diagnostic' && !(r.lignes || []).length) texte = 'Ajoutez les pièces et la main d\'œuvre au devis, puis envoyez-le au client sur WhatsApp.';
  else if (r.statut === 'devis' && r.devisStatut === 'accepte') texte = 'Devis accepté : passez le dossier « En réparation ».';
  else if (r.statut === 'devis') texte = 'En attente de la réponse du client. Marquez le devis « Accepté » dès qu\'il répond.';
  else if (r.statut === 'en_cours') texte = 'Une fois l\'appareil testé, passez le dossier à « Prêt » : le client sera prévenu sur WhatsApp.';
  else if (r.statut === 'pret') texte = m.reste ? `Prêt : il reste ${argent(m.reste)} à encaisser à la remise de l'appareil.` : 'Prêt et payé : remettez l\'appareil et passez le dossier à « Livré ».';
  return texte ? h('div', { class: 'tip' }, icone('info', 18), h('span', null, texte)) : null;
}

async function changerDevis(r, v) {
  r.devisStatut = v;
  if (v === 'accepte' && ['recu', 'diagnostic', 'devis'].includes(r.statut)) {
    await changerStatut(r, 'en_cours', 'Devis accepté par le client');
    toast('Devis accepté : dossier passé « En réparation »', 'ok');
  } else if (v === 'envoye' && ['recu', 'diagnostic'].includes(r.statut)) {
    await changerStatut(r, 'devis');
  } else {
    await enregistrer(r);
  }
  rafraichir();
}

async function modifierLigne(r, l) {
  const choix = await feuille(l.libelle, (fermer) => h('div', { class: 'stack-s' },
    h('button', { type: 'button', class: 'btn ghost block', onclick: () => fermer('modifier') }, icone('edit', 18), 'Modifier'),
    h('button', { type: 'button', class: 'btn danger-ghost block', onclick: () => fermer('supprimer') }, icone('trash', 18), 'Retirer du devis')));
  if (choix === 'modifier') {
    const n = await editerLigne(l);
    if (n) {
      if (r.stockDeduit) { toast('Pièces déjà déduites du stock : ajustez le stock à la main si besoin.'); }
      r.lignes = r.lignes.map((x) => (x.id === l.id ? n : x));
      await enregistrer(r);
      rafraichir();
    }
  } else if (choix === 'supprimer') {
    r.lignes = r.lignes.filter((x) => x.id !== l.id);
    await enregistrer(r);
    rafraichir();
  }
}

async function choisirStatut(r, client, appareil, b) {
  const nouveau = await feuille('Changer le statut', (fermer) => h('div', { class: 'status-list' },
    STATUTS.map((s) => h('button', {
      type: 'button', class: 'status-opt' + (s.id === r.statut ? ' on' : ''), onclick: () => fermer(s.id),
    }, h('span', { class: 'dot d-' + s.couleur }), s.nom, s.id === r.statut ? h('span', { class: 'muted small' }, ' (actuel)') : null))));
  if (!nouveau || nouveau === r.statut) return;

  if (nouveau === 'livre') {
    const m = montants(r);
    if (m.reste > 0) {
      const choix = await feuille('Reste à payer', (fermer) => h('div', { class: 'stack-s' },
        h('p', null, `Le client doit encore `, h('b', null, argent(m.reste)), '.'),
        h('button', { type: 'button', class: 'btn primary block', onclick: () => fermer('encaisser') }, 'Encaisser puis livrer'),
        h('button', { type: 'button', class: 'btn ghost block', onclick: () => fermer('livrer') }, 'Livrer sans encaisser (crédit)')));
      if (!choix) return;
      if (choix === 'encaisser') {
        const pm = await saisirPaiement(m.reste, MODES_PAIEMENT);
        if (!pm) return;
        r.paiements = [...(r.paiements || []), pm];
      }
    }
  }
  if (nouveau === 'annule') {
    const note = await feuille('Annuler la réparation', (fermer) => {
      const raison = h('input', { type: 'text', placeholder: 'Ex. : client refuse le devis, pièce introuvable' });
      return h('form', { onsubmit: (e) => { e.preventDefault(); fermer(raison.value.trim() || 'Annulé'); } },
        champ('Raison', raison), h('button', { class: 'btn danger block', type: 'submit' }, 'Annuler la réparation'));
    });
    if (!note) return;
    await changerStatut(r, 'annule', note);
  } else {
    await changerStatut(r, nouveau);
  }
  toast(`Statut : ${statut(nouveau).nom}`, 'ok');

  // Après « Prêt » ou « Livré », proposer le bon message ou le reçu.
  if (nouveau === 'pret' || nouveau === 'attente_piece' || nouveau === 'devis') {
    await envoyerWhatsApp(r, client, appareil, b);
  } else if (nouveau === 'livre') {
    await documents(r, client, appareil, b, 'recu');
  }
  rafraichir();
}

async function envoyerWhatsApp(r, client, appareil, b, idModele) {
  const ctx = contexte(r, client, appareil, b);
  let choisi = idModele || modeleConseille(r);
  const texte = h('textarea', { rows: 8 });
  const remplir = () => { texte.value = MODELES.find((x) => x.id === choisi).texte(ctx); };
  remplir();
  const sansTel = !client || !client.tel;
  await feuille('Message WhatsApp', (fermer) => {
    const puces = h('div', { class: 'chips' }, MODELES.map((mo) => {
      const bt = h('button', { type: 'button', class: 'chip' + (mo.id === choisi ? ' on' : '') }, mo.titre);
      bt.addEventListener('click', () => {
        choisi = mo.id;
        puces.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x === bt));
        remplir();
      });
      return bt;
    }));
    const ouvrir = h('a', { class: 'btn whatsapp block', href: '#', target: '_blank', rel: 'noopener' }, icone('chat', 18),
      sansTel ? 'Choisir le contact dans WhatsApp' : `Envoyer à ${client.nom}`);
    ouvrir.addEventListener('click', () => {
      ouvrir.href = lienWhatsApp(sansTel ? '' : client.tel, texte.value, b.indicatif);
      setTimeout(() => fermer(), 300);
    });
    return h('div', null,
      puces,
      h('label', { class: 'field mt' }, h('span', { class: 'lbl' }, 'Message (modifiable)'), texte),
      sansTel ? h('p', { class: 'hint' }, 'Ce client n\'a pas de numéro : WhatsApp vous demandera de choisir le contact.') : null,
      ouvrir);
  });
}

async function documents(r, client, appareil, b, typeInitial) {
  let type = typeInitial || (r.statut === 'livre' || r.statut === 'pret' ? 'recu' : (r.lignes || []).length ? 'devis' : 'depot');
  let format = b.format || '80';
  const apercu = h('div', { class: 'preview' });
  let blob = null;
  const generer = async () => {
    apercu.replaceChildren(h('p', { class: 'muted small' }, 'Préparation…'));
    blob = await image(preparer(type, r, client, appareil, b), format);
    apercu.replaceChildren(h('img', { src: URL.createObjectURL(blob), alt: 'Aperçu du document' }));
  };
  await feuille('Reçus et documents', (fermer) => {
    const puces = (options, actuel, surChoix) => {
      const zone = h('div', { class: 'chips' });
      for (const [v, lib] of options) {
        const bt = h('button', { type: 'button', class: 'chip' + (v === actuel ? ' on' : '') }, lib);
        bt.addEventListener('click', () => {
          zone.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x === bt));
          surChoix(v);
          generer();
        });
        zone.append(bt);
      }
      return zone;
    };
    generer();
    const nomFichier = () => `${r.numero}-${type}.png`;
    return h('div', null,
      puces(Object.entries(DOCUMENTS), type, (v) => { type = v; }),
      h('div', { class: 'field mt' }, h('span', { class: 'lbl' }, 'Format'),
        puces([['58', 'Ticket 58 mm'], ['80', 'Ticket 80 mm'], ['A4', 'A4']], format, (v) => { format = v; })),
      apercu,
      h('div', { class: 'stack-s' },
        h('button', { type: 'button', class: 'btn primary block', onclick: async () => {
          if (!blob) return;
          await partagerFichier(blob, nomFichier(), `${DOCUMENTS[type]} ${r.numero} — ${b.nom}`);
        } }, icone('share', 18), 'Partager (WhatsApp, imprimante…)'),
        client && client.tel ? h('a', {
          class: 'btn whatsapp block', target: '_blank', rel: 'noopener',
          href: `https://wa.me/${numeroWhatsApp(client.tel, b.indicatif)}`,
        }, icone('chat', 18), 'Ouvrir la conversation du client') : null,
        h('button', { type: 'button', class: 'btn ghost block', onclick: () => {
          fermer();
          imprimer(preparer(type, r, client, appareil, b), format);
        } }, icone('printer', 18), 'Imprimer ou enregistrer en PDF')),
      h('p', { class: 'hint' }, 'Imprimante thermique Bluetooth : touchez « Partager » puis choisissez votre application d\'impression (par exemple RawBT).'));
  });
}

async function premiersPas(r, client, appareil, b) {
  const choix = await feuille(`Dossier ${r.numero} créé`, (fermer) => h('div', { class: 'stack-s' },
    h('p', { class: 'muted' }, 'Donnez une trace au client tout de suite :'),
    h('button', { type: 'button', class: 'btn primary block', onclick: () => fermer('bon') }, icone('receipt', 18), 'Bon de dépôt'),
    h('button', { type: 'button', class: 'btn whatsapp block', onclick: () => fermer('wa') }, icone('chat', 18), 'Message « appareil reçu »'),
    h('button', { type: 'button', class: 'btn ghost block', onclick: () => fermer() }, 'Plus tard')));
  if (choix === 'bon') await documents(r, client, appareil, b, 'depot');
  if (choix === 'wa') await envoyerWhatsApp(r, client, appareil, b, 'depot');
}

async function modifierReception(r) {
  const res = await feuille('Modifier le dossier', (fermer) => {
    const panne = h('textarea', { rows: 2 }, r.panne || '');
    const etat = choixPuces('etat', ETATS_RECEPTION, r.etat || [], true);
    const etatNote = h('input', { type: 'text', value: r.etatNote || '' });
    const acc = choixPuces('acc', ACCESSOIRES, r.accessoires || [], true);
    const code = h('input', { type: 'text', value: r.code || '', autocomplete: 'off' });
    const datePromise = h('input', { type: 'date', value: r.datePromise || '' });
    const garantie = nombre(r.garantieJours ?? '', { placeholder: '0' });
    return h('form', { onsubmit: (e) => {
      e.preventDefault();
      fermer({
        panne: panne.value.trim(), etat: lirePuces(etat, 'etat'), etatNote: etatNote.value.trim(),
        accessoires: lirePuces(acc, 'acc'), code: code.value.trim(), datePromise: datePromise.value,
        garantieJours: Number(garantie.value) || 0,
      });
    } },
    champ('Panne signalée', panne),
    h('div', { class: 'field' }, h('span', { class: 'lbl' }, 'État constaté'), etat),
    champ('Remarque sur l\'état', etatNote),
    h('div', { class: 'field' }, h('span', { class: 'lbl' }, 'Accessoires'), acc),
    champ('Code de déverrouillage', code),
    h('div', { class: 'grid2' }, champ('Date prévue', datePromise), champ('Garantie (jours)', garantie)),
    h('button', { class: 'btn primary block', type: 'submit' }, 'Enregistrer'));
  });
  if (res) { Object.assign(r, res); await enregistrer(r); rafraichir(); }
}

function photosDuDossier(r) {
  const zone = h('div', { class: 'thumbs' });
  const fichier = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true });
  fichier.addEventListener('change', async () => {
    for (const f of fichier.files) {
      try {
        const blob = await compresserImage(f);
        const id = uid();
        await db.ecrire('photos', { id, reparationId: r.id, blob, date: new Date().toISOString() });
        r.photos = [...(r.photos || []), id];
      } catch (e) { toast('Photo illisible', 'error'); }
    }
    await enregistrer(r);
    rafraichir();
  });
  (async () => {
    const items = [];
    for (const pid of r.photos || []) {
      const p = await db.lire('photos', pid);
      if (!p) continue;
      const url = URL.createObjectURL(p.blob);
      items.push(h('button', { type: 'button', class: 'thumb', 'aria-label': 'Voir la photo', onclick: () => voirPhoto(r, pid, url) },
        h('img', { src: url, alt: '' })));
    }
    zone.replaceChildren(...items,
      h('button', { type: 'button', class: 'thumb add', onclick: () => fichier.click() }, icone('camera'), h('span', null, 'Photo')));
  })();
  return h('div', { class: 'field mt' }, h('span', { class: 'lbl' }, 'Photos'), zone, fichier);
}

async function voirPhoto(r, pid, url) {
  const choix = await feuille('Photo', (fermer) => h('div', null,
    h('img', { src: url, alt: 'Photo de l\'appareil', class: 'photo-full' }),
    h('button', { type: 'button', class: 'btn danger-ghost block mt', onclick: () => fermer('suppr') }, icone('trash', 16), 'Supprimer la photo')));
  if (choix === 'suppr') {
    await db.supprimer('photos', pid);
    r.photos = (r.photos || []).filter((x) => x !== pid);
    await enregistrer(r);
    rafraichir();
  }
}
