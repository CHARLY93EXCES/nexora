// Messages WhatsApp envoyés aux clients.
import { argent, date, numeroWhatsApp } from './util.js';
import { montants, nomAppareil, finGarantie } from './modele.js';

export const MODELES = [
  { id: 'depot', titre: 'Appareil reçu',
    texte: (c) => `Bonjour ${c.client}, ${c.boutique} a bien reçu votre ${c.appareil}.\n` +
      `Dossier n° ${c.numero}${c.panne ? `\nPanne signalée : ${c.panne}` : ''}${c.datePromise ? `\nDate prévue : ${c.datePromise}` : ''}\n` +
      `Nous vous tenons informé.` },
  { id: 'devis', titre: 'Devis à valider',
    texte: (c) => `Bonjour ${c.client}, voici le devis pour votre ${c.appareil} (dossier ${c.numero}) :\n` +
      `${c.lignes}\n${c.remise}*Total : ${c.total}*\n\n` +
      `Répondez *OUI* pour lancer la réparation.` },
  { id: 'attente_piece', titre: 'Pièce commandée',
    texte: (c) => `Bonjour ${c.client}, la pièce pour votre ${c.appareil} (dossier ${c.numero}) est commandée. ` +
      `Nous vous prévenons dès qu'elle arrive.` },
  { id: 'pret', titre: 'Appareil prêt',
    texte: (c) => `Bonjour ${c.client}, bonne nouvelle : votre ${c.appareil} est *prêt* !\n` +
      `Dossier n° ${c.numero}\n${c.reste ? `Reste à payer : *${c.reste}*\n` : ''}` +
      `Vous pouvez passer le récupérer${c.adresse ? ` : ${c.adresse}` : ''}.` },
  { id: 'relance', titre: 'Relance : appareil non récupéré',
    texte: (c) => `Bonjour ${c.client}, votre ${c.appareil} (dossier ${c.numero}) vous attend chez ${c.boutique} depuis le ${c.datePret}. ` +
      `Merci de passer le récupérer.` },
  { id: 'merci', titre: 'Merci + garantie',
    texte: (c) => `Merci ${c.client} pour votre confiance !\n` +
      `${c.garantie ? `Votre réparation est garantie jusqu'au ${c.garantie}. ` : ''}Gardez ce numéro : dossier ${c.numero}.\n${c.boutique}` },
];

/** Prépare les valeurs utilisées dans les messages. */
export function contexte(r, client, appareil, b) {
  const m = montants(r);
  const datePret = [...(r.historique || [])].reverse().find((x) => x.statut === 'pret');
  const fin = finGarantie(r);
  return {
    client: (client && client.nom) || '',
    boutique: b.nom,
    adresse: b.adresse,
    appareil: nomAppareil(appareil),
    numero: r.numero,
    panne: r.panne,
    datePromise: r.datePromise ? date(r.datePromise) : '',
    lignes: (r.lignes || []).map((l) => `• ${l.libelle}${Number(l.qte) > 1 ? ` x${l.qte}` : ''} : ${argent(l.qte * l.prix)}`).join('\n') || '• (à compléter)',
    remise: m.remise ? `Remise : -${argent(m.remise)}\n` : '',
    total: argent(m.total),
    reste: m.reste ? argent(m.reste) : '',
    datePret: datePret ? date(datePret.date) : date(r.majLe),
    garantie: fin ? date(fin) : '',
  };
}

/** Modèle conseillé selon le statut du dossier. */
export function modeleConseille(r) {
  switch (r.statut) {
    case 'recu': case 'diagnostic': return 'depot';
    case 'devis': return 'devis';
    case 'attente_piece': return 'attente_piece';
    case 'pret': return 'pret';
    case 'livre': return 'merci';
    default: return 'depot';
  }
}

export function lienWhatsApp(tel, texte, indicatif) {
  const n = tel ? numeroWhatsApp(tel, indicatif) : '';
  return `https://wa.me/${n}?text=${encodeURIComponent(texte)}`;
}
