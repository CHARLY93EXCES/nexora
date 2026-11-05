// Navigation entre écrans (évite les imports circulaires entre main.js et les vues).
let rendu = () => {};
export function enregistrerRendu(fn) { rendu = fn; }

/** Redessine l'écran courant en gardant la position de défilement. */
export function rafraichir() { return rendu(true); }

export function aller(chemin) {
  const cible = '#/' + chemin;
  if (location.hash === cible) rendu();
  else location.hash = cible;
}

// Invitation d'installation (Android / Chrome), conservée pour l'écran « Plus ».
export const installation = { invite: null };
