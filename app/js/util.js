// Outils d'interface partagés par tous les écrans.

/** Crée un élément : h('div', {class: 'x', onclick: fn}, enfant1, 'texte', ...) */
export function h(tag, props, ...enfants) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else if (k === 'html') el.innerHTML = v; // réservé à du contenu statique de l'application
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  ajouter(el, enfants);
  return el;
}

function ajouter(el, enfants) {
  for (const e of enfants) {
    if (e === undefined || e === null || e === false) continue;
    if (Array.isArray(e)) ajouter(el, e);
    else el.append(e instanceof Node ? e : String(e));
  }
}

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

let devise = 'FCFA';
export function definirDevise(d) { devise = d || 'FCFA'; }
export function argent(n) {
  const v = Math.round(Number(n) || 0);
  return new Intl.NumberFormat('fr-FR').format(v).replace(/ | /g, ' ') + ' ' + devise;
}

export function date(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
export function dateHeure(d) {
  if (!d) return '';
  const x = new Date(d);
  return x.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' ' +
    x.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
export function ilYa(d) {
  const j = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (j <= 0) return "aujourd'hui";
  if (j === 1) return 'hier';
  return `il y a ${j} j`;
}
export const aujourdhui = () => new Date().toISOString().slice(0, 10);

export function sansAccents(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
export function correspond(texte, requete) {
  const t = sansAccents(texte);
  return sansAccents(requete).split(/\s+/).filter(Boolean).every((m) => t.includes(m));
}

/** Numéro au format WhatsApp (chiffres, avec indicatif pays). */
export function numeroWhatsApp(tel, indicatif = '225') {
  let d = String(tel || '').trim();
  const international = d.startsWith('+') || d.startsWith('00');
  d = d.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (international) return d;
  if (indicatif && d.startsWith(indicatif) && d.length > 10) return d;
  return indicatif + d;
}

export function debounce(fn, ms = 200) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// ---------- Messages et fenêtres ----------

export function toast(msg, type = '') {
  const zone = document.getElementById('toasts');
  const el = h('div', { class: 'toast ' + type, role: 'status' }, msg);
  zone.append(el);
  setTimeout(() => el.classList.add('out'), 2600);
  setTimeout(() => el.remove(), 3000);
}

/**
 * Feuille qui monte du bas de l'écran.
 * contenu : élément ou fonction (fermer) => élément
 * Retourne une promesse résolue avec la valeur passée à fermer().
 */
export function feuille(titre, contenu) {
  return new Promise((resoudre) => {
    const precedent = document.activeElement;
    const fond = h('div', { class: 'sheet-bg' });
    let fini = false;
    const fermer = (valeur) => {
      if (fini) return;
      fini = true;
      fond.classList.add('out');
      setTimeout(() => fond.remove(), 180);
      document.removeEventListener('keydown', echap);
      if (precedent && precedent.focus) precedent.focus();
      resoudre(valeur);
    };
    const echap = (e) => { if (e.key === 'Escape') fermer(); };
    const corps = typeof contenu === 'function' ? contenu(fermer) : contenu;
    const panneau = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': titre },
      h('div', { class: 'sheet-head' },
        h('h2', null, titre),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Fermer', onclick: () => fermer() }, icone('x'))),
      h('div', { class: 'sheet-body' }, corps));
    fond.addEventListener('click', (e) => { if (e.target === fond) fermer(); });
    fond.append(panneau);
    document.body.append(fond);
    document.addEventListener('keydown', echap);
    requestAnimationFrame(() => {
      fond.classList.add('in');
      const premier = panneau.querySelector('input:not([type=hidden]),select,textarea');
      if (premier && !('ontouchstart' in window)) premier.focus();
    });
  });
}

export function confirmer(titre, texte, libelleOk = 'Confirmer', danger = false) {
  return feuille(titre, (fermer) => h('div', null,
    h('p', { class: 'muted' }, texte),
    h('div', { class: 'row-btns' },
      h('button', { class: 'btn ghost', type: 'button', onclick: () => fermer(false) }, 'Annuler'),
      h('button', { class: 'btn ' + (danger ? 'danger' : 'primary'), type: 'button', onclick: () => fermer(true) }, libelleOk))));
}

// ---------- Champs de formulaire ----------

export function champ(libelle, input, aide) {
  return h('label', { class: 'field' },
    h('span', { class: 'lbl' }, libelle),
    input,
    aide ? h('span', { class: 'hint' }, aide) : null);
}

export function choixPuces(nom, options, valeur, multiple = false) {
  return h('div', { class: 'chips', role: multiple ? 'group' : 'radiogroup' },
    options.map((o) => {
      const [val, lib] = Array.isArray(o) ? o : [o, o];
      const coche = multiple ? (valeur || []).includes(val) : valeur === val;
      return h('label', { class: 'chip-choice' },
        h('input', { type: multiple ? 'checkbox' : 'radio', name: nom, value: val, checked: coche }),
        h('span', null, lib));
    }));
}
export function lirePuces(racine, nom) {
  return [...racine.querySelectorAll(`input[name="${nom}"]:checked`)].map((i) => i.value);
}

// ---------- Images ----------

export async function compresserImage(fichier, max = 1280, qualite = 0.72) {
  const bmp = await createImageBitmap(fichier);
  const r = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * r);
  c.height = Math.round(bmp.height * r);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close && bmp.close();
  return new Promise((res) => c.toBlob(res, 'image/jpeg', qualite));
}

export function lireCommeDataURL(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}

// ---------- Partage ----------

export async function partagerFichier(blob, nom, texte) {
  const fichier = new File([blob], nom, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], text: texte });
      return true;
    } catch (e) {
      if (e.name === 'AbortError') return true;
    }
  }
  telecharger(blob, nom);
  return false;
}

export function telecharger(blob, nom) {
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: nom });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ---------- Icônes (traits SVG) ----------

const CHEMINS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  wrench: 'M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-3-3 6.3-6.3a4 4 0 0 1-5-5L9 3l3-1z M4 20l6-6',
  users: 'M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 20v-1a4 4 0 0 0-3-3.9 M16 3.1a4 4 0 0 1 0 7.8',
  box: 'M21 8 12 3 3 8v8l9 5 9-5z M3 8l9 5 9-5 M12 13v8',
  more: 'M5 12h.01 M12 12h.01 M19 12h.01',
  plus: 'M12 5v14 M5 12h14',
  back: 'M15 18l-6-6 6-6',
  x: 'M18 6 6 18 M6 6l12 12',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.3-4.3',
  phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z',
  chat: 'M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z',
  receipt: 'M5 2h14v20l-3-2-2 2-2-2-2 2-2-2-3 2z M9 7h6 M9 11h6 M9 15h4',
  camera: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  stetho: 'M4 3v6a5 5 0 0 0 10 0V3 M9 14v2a5 5 0 0 0 10 0v-3 M19 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4',
  check: 'M20 6 9 17l-5-5',
  edit: 'M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  trash: 'M3 6h18 M8 6V4h8v2 M19 6l-1 14H6L5 6',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  printer: 'M6 9V2h12v7 M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2 M6 14h12v8H6z',
  share: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8 M16 6l-4-4-4 4 M12 2v13',
  alert: 'M12 9v4 M12 17h.01 M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  store: 'M3 9l1-5h16l1 5 M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z M5 13v8h14v-8',
  install: 'M12 3v12 M7 10l5 5 5-5 M5 21h14',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 16v-4 M12 8h.01',
  device: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z M11 18h2',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2',
  minus: 'M5 12h14',
};

export function icone(nom, taille = 22) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', taille);
  svg.setAttribute('height', taille);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', CHEMINS[nom] || '');
  svg.append(p);
  return svg;
}
