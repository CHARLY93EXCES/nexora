// Base de données locale (IndexedDB) : tout reste sur le téléphone.

const NOM = 'nexora-mobile';
const VERSION = 1;
export const MAGASINS = ['clients', 'appareils', 'reparations', 'stock', 'photos', 'reglages'];

let ouverture;
function ouvrir() {
  if (!ouverture) {
    ouverture = new Promise((res, rej) => {
      const r = indexedDB.open(NOM, VERSION);
      r.onupgradeneeded = () => {
        const d = r.result;
        d.createObjectStore('clients', { keyPath: 'id' });
        d.createObjectStore('appareils', { keyPath: 'id' }).createIndex('clientId', 'clientId');
        const rep = d.createObjectStore('reparations', { keyPath: 'id' });
        rep.createIndex('clientId', 'clientId');
        rep.createIndex('appareilId', 'appareilId');
        d.createObjectStore('stock', { keyPath: 'id' });
        d.createObjectStore('photos', { keyPath: 'id' }).createIndex('reparationId', 'reparationId');
        d.createObjectStore('reglages', { keyPath: 'cle' });
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
      r.onblocked = () => rej(new Error('Base de données bloquée : fermez les autres onglets NEXORA.'));
    });
  }
  return ouverture;
}

function transaction(magasins, mode, travail) {
  return ouvrir().then((d) => new Promise((res, rej) => {
    const t = d.transaction(magasins, mode);
    let resultat;
    const r = travail(t);
    if (r && 'onsuccess' in r) r.onsuccess = () => { resultat = r.result; };
    else Promise.resolve(r).then((v) => { resultat = v; });
    t.oncomplete = () => res(resultat);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error || new Error('Opération annulée'));
  }));
}

export const db = {
  tous: (m) => transaction(m, 'readonly', (t) => t.objectStore(m).getAll()),
  lire: (m, id) => transaction(m, 'readonly', (t) => t.objectStore(m).get(id)),
  ecrire: (m, v) => transaction(m, 'readwrite', (t) => t.objectStore(m).put(v)),
  supprimer: (m, id) => transaction(m, 'readwrite', (t) => t.objectStore(m).delete(id)),
  parIndex: (m, index, v) => transaction(m, 'readonly', (t) => t.objectStore(m).index(index).getAll(v)),

  async reglage(cle, defaut) {
    const r = await this.lire('reglages', cle);
    return r ? r.valeur : defaut;
  },
  definir: (cle, valeur) => transaction('reglages', 'readwrite', (t) => t.objectStore('reglages').put({ cle, valeur })),

  /** Numéro de dossier suivant, attribué dans une seule transaction. */
  numeroSuivant() {
    return transaction('reglages', 'readwrite', (t) => new Promise((res) => {
      const s = t.objectStore('reglages');
      const g = s.get('compteur');
      g.onsuccess = () => {
        const n = (g.result ? g.result.valeur : 0) + 1;
        s.put({ cle: 'compteur', valeur: n });
        res(n);
      };
    }));
  },

  /** Remplace tout le contenu (restauration d'une sauvegarde). */
  remplacerTout(donnees) {
    return transaction(MAGASINS, 'readwrite', (t) => {
      for (const m of MAGASINS) {
        const s = t.objectStore(m);
        s.clear();
        for (const v of donnees[m] || []) s.put(v);
      }
    });
  },

  async exporterTout() {
    const out = {};
    for (const m of MAGASINS) out[m] = await this.tous(m);
    return out;
  },
};

/** Demande au navigateur de ne pas effacer les données en cas de manque de place. */
export async function demanderStockagePersistant() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch (e) { /* non pris en charge */ }
  return false;
}
