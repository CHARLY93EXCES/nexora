// Documents client : bon de dépôt, devis, reçu.
// Deux sorties : image (partage WhatsApp, applications d'impression thermique) et impression (A4 / PDF ou ticket).
import { h, argent, date, dateHeure } from './util.js';
import { montants, nomAppareil, finGarantie } from './modele.js';

export const DOCUMENTS = {
  depot: 'Bon de dépôt',
  devis: 'Devis',
  recu: 'Reçu de paiement',
};

/** Données communes à tous les rendus. */
export function preparer(type, r, client, appareil, b) {
  const m = montants(r);
  const fin = finGarantie(r);
  const d = {
    type,
    titre: DOCUMENTS[type].toUpperCase(),
    boutique: b,
    numero: r.numero,
    date: dateHeure(new Date()),
    infos: [
      ['Dossier', r.numero],
      ['Déposé le', date(r.creeLe)],
      ['Client', client ? client.nom : ''],
      ['Téléphone', client ? client.tel : ''],
      ['Appareil', nomAppareil(appareil)],
      ['IMEI / série', appareil ? appareil.imei : ''],
    ].filter(([, v]) => v),
    sections: [],
    lignes: [],
    totaux: [],
    notes: [],
    signature: false,
  };

  if (type === 'depot') {
    if (r.panne) d.sections.push(['Panne signalée', r.panne]);
    if ((r.etat || []).length) d.sections.push(['État à la réception', r.etat.join(', ')]);
    if (r.etatNote) d.sections.push(['Remarques', r.etatNote]);
    d.sections.push(['Accessoires laissés', (r.accessoires || []).length ? r.accessoires.join(', ') : 'Aucun']);
    if (r.datePromise) d.sections.push(['Date prévue', date(r.datePromise)]);
    if (m.paye) d.totaux.push(['Acompte versé', argent(m.paye)]);
    if (b.conditions) d.notes.push(b.conditions);
    d.signature = true;
  } else {
    d.lignes = (r.lignes || []).map((l) => ({
      libelle: l.libelle + (Number(l.qte) > 1 ? ` x${l.qte}` : ''),
      montant: argent((Number(l.qte) || 0) * (Number(l.prix) || 0)),
    }));
    if (m.remise) d.totaux.push(['Sous-total', argent(m.brut)], ['Remise', '-' + argent(m.remise)]);
    d.totaux.push(['TOTAL', argent(m.total), true]);
    if (type === 'recu') {
      for (const p of r.paiements || []) d.totaux.push([`Payé ${date(p.date)} (${p.mode})`, argent(p.montant)]);
      d.totaux.push(['Reste à payer', argent(m.reste), true]);
      if (fin) d.sections.push(['Garantie', `${r.garantieJours} jours, jusqu'au ${date(fin)}`]);
      if (b.conditions) d.notes.push(b.conditions);
    } else {
      d.notes.push('Devis valable 15 jours. Les pièces sont commandées après votre accord.');
    }
  }
  if (b.pied) d.notes.push(b.pied);
  return d;
}

// ---------- Image (canvas) ----------

const LARGEURS = { 58: 384, 80: 576, A4: 800 };

function chargerImage(src) {
  return new Promise((res) => {
    if (!src) return res(null);
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = src;
  });
}

function couper(ctx, texte, largeur) {
  const lignes = [];
  for (const para of String(texte).split('\n')) {
    let ligne = '';
    for (const mot of para.split(' ')) {
      const essai = ligne ? ligne + ' ' + mot : mot;
      if (ctx.measureText(essai).width <= largeur || !ligne) ligne = essai;
      else { lignes.push(ligne); ligne = mot; }
    }
    lignes.push(ligne);
  }
  return lignes;
}

export async function image(d, format = '80') {
  const W = LARGEURS[format] || 576;
  const base = format === '58' ? 19 : 24;
  const P = Math.round(W * 0.05);
  const L = W - 2 * P;
  const logo = await chargerImage(d.boutique.logo);
  const police = (taille, gras) => `${gras ? '700 ' : ''}${taille}px system-ui, -apple-system, Roboto, Arial, sans-serif`;

  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');

  // Première passe : mesure de la hauteur. Deuxième passe : dessin.
  const dessiner = (dessin) => {
    let y = P;
    const texte = (t, taille, { gras = false, align = 'left', x = P, largeur = L, interligne = 1.3 } = {}) => {
      ctx.font = police(taille, gras);
      for (const l of couper(ctx, t, largeur)) {
        if (dessin) {
          ctx.textAlign = align;
          ctx.fillText(l, align === 'center' ? W / 2 : align === 'right' ? x + largeur : x, y + taille);
        }
        y += taille * interligne;
      }
    };
    const separateur = () => {
      y += base * 0.4;
      if (dessin) {
        ctx.save();
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.moveTo(P, y);
        ctx.lineTo(W - P, y);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
      y += base * 0.8;
    };
    const cleValeur = (k, v, gras = false, taille = base) => {
      ctx.font = police(taille, true);
      const lv = Math.min(ctx.measureText(v).width, L * 0.55);
      const y0 = y;
      texte(k, taille, { gras, largeur: L - lv - base });
      const yFin = y;
      y = y0;
      texte(v, taille, { gras: true, align: 'right', x: P + L - lv, largeur: lv });
      y = Math.max(y, yFin);
    };

    if (logo) {
      const hMax = base * 4;
      const r = Math.min(hMax / logo.height, (L * 0.6) / logo.width);
      const lw = logo.width * r;
      const lh = logo.height * r;
      if (dessin) ctx.drawImage(logo, (W - lw) / 2, y, lw, lh);
      y += lh + base * 0.6;
    }
    texte(d.boutique.nom, base * 1.35, { gras: true, align: 'center' });
    if (d.boutique.adresse) texte(d.boutique.adresse, base * 0.85, { align: 'center' });
    if (d.boutique.telephone) texte('Tél. ' + d.boutique.telephone, base * 0.85, { align: 'center' });
    separateur();
    texte(d.titre, base * 1.15, { gras: true, align: 'center' });
    texte(d.date, base * 0.8, { align: 'center' });
    y += base * 0.4;
    for (const [k, v] of d.infos) cleValeur(k, v, false, base * 0.9);
    for (const [k, v] of d.sections) {
      y += base * 0.5;
      texte(k, base * 0.9, { gras: true });
      texte(v, base * 0.9);
    }
    if (d.lignes.length) {
      separateur();
      for (const l of d.lignes) cleValeur(l.libelle, l.montant, false, base * 0.95);
    }
    if (d.totaux.length) {
      separateur();
      for (const [k, v, gras] of d.totaux) cleValeur(k, v, gras, gras ? base * 1.05 : base * 0.9);
    }
    if (d.signature) {
      y += base * 1.5;
      texte('Signature du client :', base * 0.9);
      y += base * 2.2;
      if (dessin) { ctx.beginPath(); ctx.moveTo(P, y); ctx.lineTo(P + L * 0.6, y); ctx.lineWidth = 1.5; ctx.stroke(); }
      y += base * 0.4;
    }
    if (d.notes.length) {
      separateur();
      for (const n of d.notes) { texte(n, base * 0.75, { align: 'center', interligne: 1.35 }); y += base * 0.3; }
    }
    y += base * 0.3;
    texte('NEXORA', base * 0.65, { align: 'center' });
    return y + P;
  };

  c.width = W;
  c.height = Math.ceil(dessiner(false));
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#000000';
  ctx.strokeStyle = '#000000';
  dessiner(true);
  return new Promise((res) => c.toBlob(res, 'image/png'));
}

// ---------- Impression ----------

export function imprimer(d, format) {
  const racine = document.getElementById('print-root');
  const page = document.getElementById('print-page');
  page.textContent = format === 'A4'
    ? '@page { size: A4; margin: 14mm; }'
    : `@page { size: ${format}mm auto; margin: 3mm; }`;
  racine.replaceChildren(format === 'A4' ? feuilleA4(d) : ticket(d, format));
  document.body.classList.add('impression');
  const fin = () => {
    document.body.classList.remove('impression');
    racine.replaceChildren();
    window.removeEventListener('afterprint', fin);
  };
  window.addEventListener('afterprint', fin);
  setTimeout(() => window.print(), 50);
}

function ticket(d, format) {
  return h('div', { class: 'ticket', style: { width: format === '58' ? '48mm' : '72mm' } },
    d.boutique.logo ? h('img', { src: d.boutique.logo, alt: '', class: 'ticket-logo' }) : null,
    h('div', { class: 't-nom' }, d.boutique.nom),
    d.boutique.adresse ? h('div', { class: 't-c' }, d.boutique.adresse) : null,
    d.boutique.telephone ? h('div', { class: 't-c' }, 'Tél. ' + d.boutique.telephone) : null,
    h('hr'),
    h('div', { class: 't-titre' }, d.titre),
    h('div', { class: 't-c' }, d.date),
    d.infos.map(([k, v]) => h('div', { class: 't-kv' }, h('span', null, k), h('b', null, v))),
    d.sections.map(([k, v]) => h('div', { class: 't-sec' }, h('b', null, k), h('div', null, v))),
    d.lignes.length ? [h('hr'), d.lignes.map((l) => h('div', { class: 't-kv' }, h('span', null, l.libelle), h('b', null, l.montant)))] : null,
    d.totaux.length ? [h('hr'), d.totaux.map(([k, v, g]) => h('div', { class: 't-kv' + (g ? ' t-g' : '') }, h('span', null, k), h('b', null, v)))] : null,
    d.signature ? h('div', { class: 't-sign' }, 'Signature du client :') : null,
    d.notes.length ? [h('hr'), d.notes.map((n) => h('p', { class: 't-note' }, n))] : null);
}

function feuilleA4(d) {
  const b = d.boutique;
  return h('div', { class: 'a4' },
    h('header', { class: 'a4-head' },
      h('div', { class: 'a4-shop' },
        b.logo ? h('img', { src: b.logo, alt: '', class: 'a4-logo' }) : null,
        h('div', null,
          h('div', { class: 'a4-nom' }, b.nom),
          b.adresse ? h('div', null, b.adresse) : null,
          b.telephone ? h('div', null, 'Tél. ' + b.telephone) : null)),
      h('div', { class: 'a4-doc' },
        h('div', { class: 'a4-titre' }, d.titre),
        h('div', null, 'N° ' + d.numero),
        h('div', null, d.date))),
    h('table', { class: 'a4-infos' },
      h('tbody', null, d.infos.map(([k, v]) => h('tr', null, h('th', null, k), h('td', null, v))))),
    d.sections.map(([k, v]) => h('div', { class: 'a4-sec' }, h('h3', null, k), h('p', null, v))),
    d.lignes.length ? h('table', { class: 'a4-lignes' },
      h('thead', null, h('tr', null, h('th', null, 'Désignation'), h('th', null, 'Montant'))),
      h('tbody', null, d.lignes.map((l) => h('tr', null, h('td', null, l.libelle), h('td', null, l.montant))))) : null,
    d.totaux.length ? h('table', { class: 'a4-totaux' },
      h('tbody', null, d.totaux.map(([k, v, g]) => h('tr', { class: g ? 'g' : '' }, h('th', null, k), h('td', null, v))))) : null,
    d.signature ? h('div', { class: 'a4-sign' }, h('div', null, 'Signature du client'), h('div', null, 'Cachet de l\'atelier')) : null,
    d.notes.map((n) => h('p', { class: 'a4-note' }, n)));
}
