# Suivi du projet NEXORA Mobile

Dernière mise à jour : 5 novembre 2026. Ce document permet de reprendre le travail exactement où il s'est arrêté.

## Le propriétaire

- Parle français : toujours répondre en français, simplement, étape par étape (il n'est pas développeur).
- Il veut des décisions d'expert : proposer une solution et la réaliser, plutôt que donner des options.
- Téléphone : Xiaomi Redmi (Android, Chrome). Son GitHub est affiché en français.
- Contact NEXORA : WhatsApp +225 01 72 71 64 58, San-Pedro, Côte d'Ivoire.

## Où on en est

| Élément | Emplacement | État |
|---|---|---|
| Application NEXORA Mobile (v1.1.0) | `app/` | Terminée, testée dans Chrome (écran de téléphone simulé) |
| Outil de licences du propriétaire | `outils/licence.html` + `outils/licence.js` | Terminé, installable (« Licences », icône verte) |
| Page de demande pour les clients | `mobile/index.html` | Terminée (prix de lancement à compléter si souhaité) |
| Tests automatiques | `tests/` | Parcours complet + 28 tests d'attaque : tout passe |

**Publication.** GitHub Pages, branche `claude/determined-einstein-u9wg7k`, dossier racine. Le propriétaire a choisi cette branche parce que `main` n'apparaissait pas dans sa liste. On n'a pas encore confirmé que le site est en ligne : le serveur de travail de Claude ne peut pas ouvrir les adresses github.io.

- Application : https://charly93exces.github.io/nexora/app/
- Outil de licences : https://charly93exces.github.io/nexora/outils/licence.html
- Page de demande : https://charly93exces.github.io/nexora/mobile/

**Branches.** `main` contient la version 1.0 (demande de fusion n° 1, fusionnée). Les corrections de sécurité (1.1) sont seulement sur la branche `claude/determined-einstein-u9wg7k`. Il faudra les fusionner dans `main`, mais seulement avec l'accord du propriétaire.

## À faire à la prochaine séance

1. **Clé privée.** Vérifier que le propriétaire a enregistré `nexora-cle-privee.json` en deux endroits sûrs (téléphone et ordinateur ou clé USB). Elle n'est pas dans le dépôt, et la copie du serveur de travail disparaît en fin de session.
2. **Mise en ligne.** Vérifier que les adresses ci-dessus s'ouvrent. Sinon : Paramètres → Pages → « Déployer à partir d'une branche » → `claude/determined-einstein-u9wg7k` → `/ (racine)` → Enregistrer.
3. **Installation sur le Redmi** (dans Chrome, pas le navigateur Xiaomi) :
   - autoriser « Raccourcis sur l'écran d'accueil » pour Chrome (spécificité Xiaomi) ;
   - ouvrir l'application et noter le **code du téléphone** ;
   - installer l'outil **Licences**, y charger la clé et la mémoriser avec un mot de passe solide ;
   - créer sa propre licence avec le code du Redmi, ouvrir le lien, puis installer l'application ;
   - définir un code d'accès (Plus → Sécurité).

   L'ancien lien de démonstration n'est plus valable : il datait d'avant la liaison des licences au téléphone.
4. **Tests sur de vrais téléphones** (Redmi, puis un iPhone si possible) : installation, activation, photos, reçu en image partagé sur WhatsApp, impression sur imprimante thermique Bluetooth (application RawBT), sauvegarde et restauration.
5. **Fusionner dans `main`**, avec l'accord du propriétaire.
6. **Si souhaité :** afficher le prix de lancement dans `mobile/index.html` (`CONFIG.prixLancement`).
7. **Pistes proposées, à décider par le propriétaire :**
   - un nom de domaine propre (par exemple nexora.ci), pour isoler NEXORA des autres pages `charly93exces.github.io` ;
   - une nouvelle clé de licence créée directement sur son téléphone, pour une sécurité maximale ;
   - plus tard, un serveur pour la sauvegarde en ligne et la synchronisation avec la version PC (il faut le code source du logiciel PC).

## Décisions techniques

- **Application.** Application web installable (PWA) en JavaScript, sans aucune dépendance. Elle fonctionne sans internet grâce au service worker.
- **Données.** Stockées dans IndexedDB, uniquement sur le téléphone. Pas de synchronisation avec la version PC : son code source n'est pas disponible, et l'installateur (Inno Setup 6.7) n'a pas pu être ouvert.
- **Mise à jour.** À chaque publication, changer `VERSION` dans `app/sw.js` (et dans `outils/sw.js` si l'outil change). Sinon, les téléphones gardent l'ancienne version en cache.
- **Licence** (`app/js/licence.js`) :
  - le jeton est `base64url(JSON) + "." + base64url(signature ECDSA P-256)` ;
  - champs, version 2 : `v` (2), `id`, `n` (atelier), `a` (code du téléphone), `d` (date), `ts` (horodatage), et facultatifs `exp` (expiration) et `t` (téléphone du client) ;
  - la clé publique est dans `app/js/licence.js` ; la clé privée est seulement chez le propriétaire.
- **Code du téléphone.** 8 caractères tirés de `23456789ABCDEFGHJKLMNPQRSTUVWXYZ`, stockés dans le réglage `appareil`.
- **Expiration.** Le réglage `dernierJour` ne recule jamais, ce qui bloque le recul de l'horloge du téléphone.
- **Code d'accès** (`app/js/securite.js`) :
  - seule l'empreinte PBKDF2 (150 000 itérations, avec sel) est stockée ;
  - attente imposée après 5 erreurs ;
  - verrouillage automatique après 2 minutes en arrière-plan ;
  - un lien de licence créé après le code (`ts` plus récent que la création du code) retire un code oublié.
- **Sauvegardes** (`app/js/sauvegarde.js`) :
  - chiffrement AES-GCM 256 facultatif, clé dérivée du mot de passe par PBKDF2 (250 000 itérations) ;
  - les codes de déverrouillage des clients ne sont jamais exportés ;
  - les réglages propres au téléphone (`licence`, `appareil`, `verrou`, `dernierJour`) ne sont jamais exportés ni remplacés par une restauration ;
  - une restauration n'accepte que des images intégrées au fichier (`data:image/`).
- **Outil de licences :**
  - la clé privée mémorisée est chiffrée (AES-GCM, PBKDF2 310 000 itérations) ;
  - en mémoire, elle n'est pas exportable et elle est oubliée après 5 minutes en arrière-plan ;
  - l'ancienne mémorisation en clair (`nexora-cle`) est effacée automatiquement.
- **CSP** (politique de sécurité du contenu) dans `app/index.html` et `outils/licence.html` : aucun script extérieur ni intégré à la page.

## Limites connues (expliquées au propriétaire)

- Le code d'une application web est visible. Un développeur pourrait copier l'application et retirer la vérification de licence. Seuls des services sur serveur empêcheraient cela.
- Les données ne sont pas chiffrées sur le téléphone : le code d'accès protège l'écran, pas la mémoire du navigateur.
- Les autres pages publiées sous `charly93exces.github.io` partagent le même espace de stockage du navigateur.
- La clé privée a été créée pendant la session de travail en ligne. Le risque est faible ; il disparaît si le propriétaire crée une nouvelle clé lui-même.
- Rien n'a encore été testé sur un vrai téléphone.

## Lancer les tests

Depuis la racine du dépôt (Playwright et Chromium requis) :

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Puis, dans un autre terminal :

```bash
node tests/parcours.test.js
```

```bash
node tests/securite.test.js
```

Les tests créent une clé de licence temporaire et la substituent à la clé publique de l'application : la vraie clé privée n'est jamais nécessaire. Le mode hors ligne n'est pas couvert par ces tests (service worker désactivé pendant le test) ; il a été vérifié à part.
