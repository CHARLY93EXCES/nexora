// Catalogue du diagnostic guidé : 45 pannes courantes.
// Chaque panne : tests à faire dans l'ordre, causes probables, réparations à proposer au devis.
// type 'piece' = pièce à fournir, 'mo' = main d'œuvre / service.

export const CATEGORIES = [
  'Alimentation et charge', 'Écran et affichage', 'Son et appels', 'Réseau et connexions',
  'Caméras et capteurs', 'Boutons et connecteurs', 'Logiciel', 'Chocs et liquides',
];

export const PANNES = [
  // ---------- Alimentation et charge ----------
  { id: 'ne-sallume-pas', cat: 0, titre: 'Ne s\'allume pas',
    etapes: [
      'Brancher sur un chargeur et un câble testés : l\'appareil réagit-il (vibration, logo de charge) ?',
      'Forcer le redémarrage (Power + Volume bas 15 s, ou combinaison du modèle).',
      'Brancher sur l\'écran d\'un autre appareil identique si disponible pour écarter l\'écran.',
      'Mesurer la consommation au testeur USB ou à l\'alimentation de laboratoire (0 A, faible, ou court-circuit).',
      'Tester avec une batterie connue bonne.',
    ],
    causes: ['Batterie à plat ou morte', 'Écran défectueux (l\'appareil tourne mais rien ne s\'affiche)', 'Bouton power bloqué', 'Court-circuit ou défaut de carte mère'],
    reparations: [['Remplacement batterie', 'piece'], ['Remplacement bouton power (nappe)', 'piece'], ['Réparation carte mère', 'mo']] },

  { id: 'ne-charge-pas', cat: 0, titre: 'Ne charge pas',
    etapes: [
      'Tester avec un chargeur et un câble connus bons.',
      'Inspecter et nettoyer le connecteur (poussière, peluches) avec une pointe non métallique.',
      'Vérifier au testeur USB si un courant passe (0 A, ou quelques mA).',
      'Tester la charge sans fil si l\'appareil le permet.',
      'Tester avec une batterie connue bonne.',
    ],
    causes: ['Connecteur de charge encrassé ou abîmé', 'Câble ou chargeur du client défectueux', 'Batterie morte', 'Circuit de charge (IC) en panne'],
    reparations: [['Nettoyage connecteur de charge', 'mo'], ['Remplacement connecteur de charge', 'piece'], ['Remplacement batterie', 'piece'], ['Réparation IC de charge', 'mo']] },

  { id: 'charge-lente', cat: 0, titre: 'Charge lente ou intermittente',
    etapes: [
      'Tester avec un chargeur rapide d\'origine et un câble de bonne qualité.',
      'Vérifier si la charge se coupe quand on bouge le câble.',
      'Nettoyer le connecteur et observer les broches à la loupe.',
      'Mesurer le courant de charge au testeur USB.',
    ],
    causes: ['Connecteur usé ou encrassé', 'Câble abîmé', 'Batterie usée', 'Charge rapide non prise en charge par le chargeur'],
    reparations: [['Nettoyage connecteur de charge', 'mo'], ['Remplacement connecteur de charge', 'piece'], ['Remplacement batterie', 'piece']] },

  { id: 'batterie-vide-vite', cat: 0, titre: 'Batterie se vide vite',
    etapes: [
      'Lire la santé de la batterie (iPhone : Réglages › Batterie ; Android : code ou application de diagnostic).',
      'Regarder dans Réglages › Batterie quelle application consomme le plus.',
      'Vérifier si l\'appareil chauffe à l\'arrêt (consommation anormale).',
      'Mesurer la consommation appareil éteint, branché à l\'alimentation de laboratoire.',
    ],
    causes: ['Batterie usée (santé faible)', 'Application qui tourne en arrière-plan', 'Fuite de courant sur la carte mère'],
    reparations: [['Remplacement batterie', 'piece'], ['Optimisation logicielle', 'mo'], ['Réparation carte mère', 'mo']] },

  { id: 'batterie-gonflee', cat: 0, titre: 'Batterie gonflée',
    etapes: [
      'Observer : écran qui se soulève, coque arrière déformée ?',
      'Ne pas charger et ne pas percer la batterie. Prévenir le client du danger.',
      'Démonter avec précaution et vérifier si l\'écran ou le châssis ont été déformés.',
    ],
    causes: ['Batterie vieillie ou de mauvaise qualité', 'Surchauffe ou chargeur inadapté'],
    reparations: [['Remplacement batterie', 'piece'], ['Remplacement écran (si abîmé par la pression)', 'piece']] },

  { id: 'seteint-seul', cat: 0, titre: 'S\'éteint ou redémarre tout seul',
    etapes: [
      'Noter quand cela arrive : à un pourcentage précis, au froid, en appel, en jeu ?',
      'Vérifier la santé de la batterie.',
      'Lire les journaux de panne (iPhone : Données d\'analyse ; panic-full pour les redémarrages).',
      'Tester avec une batterie connue bonne.',
      'Démarrer en mode sans échec (Android) pour écarter une application.',
    ],
    causes: ['Batterie usée', 'Nappe ou capteur défectueux (redémarrage toutes les 3 minutes sur iPhone)', 'Application ou système instable', 'Défaut de carte mère'],
    reparations: [['Remplacement batterie', 'piece'], ['Remplacement nappe défectueuse', 'piece'], ['Réinstallation du système', 'mo'], ['Réparation carte mère', 'mo']] },

  { id: 'chauffe', cat: 0, titre: 'Chauffe anormalement',
    etapes: [
      'Situer la chaleur : près de la batterie, de la caméra, du processeur ?',
      'Vérifier si l\'appareil chauffe aussi éteint et débranché (court-circuit).',
      'Observer l\'usage du processeur et de la batterie par application.',
      'Mesurer la consommation à l\'alimentation de laboratoire, puis chercher le composant chaud (caméra thermique ou colophane).',
    ],
    causes: ['Application ou mise à jour en cours', 'Batterie défectueuse', 'Composant en court-circuit sur la carte mère'],
    reparations: [['Optimisation logicielle', 'mo'], ['Remplacement batterie', 'piece'], ['Réparation carte mère', 'mo']] },

  // ---------- Écran et affichage ----------
  { id: 'vitre-cassee', cat: 1, titre: 'Écran cassé (l\'image fonctionne)',
    etapes: [
      'Vérifier l\'affichage : taches, lignes, zones noires sous la casse ?',
      'Tester le tactile sur toute la surface (glisser une icône dans tous les coins).',
      'Vérifier la luminosité automatique et le capteur de proximité.',
      'Proposer au client le choix de qualité de pièce (origine, compatible OLED, compatible LCD).',
    ],
    causes: ['Vitre ou bloc écran fissuré suite à une chute'],
    reparations: [['Remplacement écran complet', 'piece'], ['Remplacement vitre seule (séparation)', 'mo'], ['Pose verre trempé', 'piece']] },

  { id: 'pas-dimage', cat: 1, titre: 'Pas d\'image (son ou vibration présents)',
    etapes: [
      'Appeler l\'appareil : sonne-t-il, vibre-t-il ?',
      'Éclairer l\'écran avec une lampe pour voir une image très sombre (rétroéclairage).',
      'Tester avec un écran connu bon.',
      'Vérifier la nappe et le connecteur écran sur la carte mère.',
    ],
    causes: ['Écran défectueux', 'Nappe écran déconnectée ou abîmée', 'Circuit d\'affichage ou de rétroéclairage de la carte mère'],
    reparations: [['Remplacement écran complet', 'piece'], ['Reconnexion / nettoyage connecteur écran', 'mo'], ['Réparation carte mère (affichage)', 'mo']] },

  { id: 'tactile-hs', cat: 1, titre: 'Tactile ne répond pas ou zones mortes',
    etapes: [
      'Retirer protection d\'écran et coque, nettoyer l\'écran.',
      'Redémarrer l\'appareil.',
      'Tester avec l\'outil de test tactile ou en glissant une icône partout.',
      'Tester avec un écran connu bon.',
    ],
    causes: ['Protection d\'écran mal posée', 'Écran défectueux', 'Défaut du contrôleur tactile sur la carte mère'],
    reparations: [['Remplacement écran complet', 'piece'], ['Réparation contrôleur tactile', 'mo']] },

  { id: 'tactile-fantome', cat: 1, titre: 'Tactile fantôme (touches toutes seules)',
    etapes: [
      'Vérifier si cela arrive surtout en charge (chargeur de mauvaise qualité).',
      'Retirer protection et coque, nettoyer l\'écran.',
      'Observer si l\'écran est fissuré ou s\'il a été remplacé récemment par une pièce de basse qualité.',
      'Tester avec un écran connu bon.',
    ],
    causes: ['Écran de mauvaise qualité ou abîmé', 'Chargeur parasite', 'Humidité sous la vitre'],
    reparations: [['Remplacement écran complet', 'piece']] },

  { id: 'lignes-taches', cat: 1, titre: 'Lignes, taches ou écran vert / rose',
    etapes: [
      'Faire une capture d\'écran : si les lignes n\'apparaissent pas sur la capture, c\'est l\'écran.',
      'Appuyer légèrement autour de la zone : l\'image change-t-elle ?',
      'Vérifier la trace de choc ou de pression.',
      'Tester avec un écran connu bon.',
    ],
    causes: ['Dalle OLED/LCD abîmée par un choc ou une pression', 'Nappe écran abîmée', 'Défaut graphique carte mère (rare : visible aussi sur la capture)'],
    reparations: [['Remplacement écran complet', 'piece'], ['Réparation carte mère (affichage)', 'mo']] },

  { id: 'retroeclairage', cat: 1, titre: 'Écran très sombre (rétroéclairage absent)',
    etapes: [
      'Éclairer l\'écran avec une lampe : l\'image est-elle visible mais sombre ?',
      'Monter la luminosité et désactiver la luminosité automatique.',
      'Tester avec un écran connu bon.',
      'Contrôler le circuit de rétroéclairage (bobine, filtre, diode) sur la carte mère.',
    ],
    causes: ['Rétroéclairage de l\'écran LCD défectueux', 'Circuit de rétroéclairage de la carte mère'],
    reparations: [['Remplacement écran complet', 'piece'], ['Réparation circuit de rétroéclairage', 'mo']] },

  { id: 'ecran-clignote', cat: 1, titre: 'Écran qui clignote',
    etapes: [
      'Désactiver luminosité automatique et mode économie d\'énergie.',
      'Vérifier si le clignotement disparaît en luminosité maximale (PWM sur OLED).',
      'Appuyer légèrement sur l\'écran et le cadre : le défaut change-t-il ?',
      'Tester avec un écran connu bon.',
    ],
    causes: ['Écran ou nappe abîmé', 'Écran compatible de basse qualité', 'Réglage logiciel'],
    reparations: [['Remplacement écran complet', 'piece'], ['Réglages et mise à jour', 'mo']] },

  // ---------- Son et appels ----------
  { id: 'haut-parleur', cat: 2, titre: 'Pas de son ou son qui grésille (haut-parleur)',
    etapes: [
      'Vérifier volume, mode silencieux et Bluetooth (désactiver).',
      'Lancer une musique et un appel en haut-parleur.',
      'Nettoyer la grille du haut-parleur (poussière, saleté).',
      'Tester avec un haut-parleur connu bon.',
    ],
    causes: ['Grille encrassée', 'Haut-parleur abîmé ou oxydé', 'Circuit audio de la carte mère'],
    reparations: [['Nettoyage grilles audio', 'mo'], ['Remplacement haut-parleur', 'piece'], ['Réparation circuit audio', 'mo']] },

  { id: 'micro', cat: 2, titre: 'Le correspondant ne m\'entend pas (micro)',
    etapes: [
      'Faire un mémo vocal, puis une vidéo avec la caméra avant et arrière (chaque test utilise un micro différent).',
      'Nettoyer les trous de micro.',
      'Retirer la coque (elle peut boucher le micro).',
      'Tester avec la nappe micro / connecteur de charge connus bons.',
    ],
    causes: ['Trou de micro bouché', 'Micro défectueux (souvent sur la nappe du connecteur de charge)', 'Circuit audio de la carte mère'],
    reparations: [['Nettoyage grilles audio', 'mo'], ['Remplacement nappe connecteur + micro', 'piece'], ['Réparation circuit audio', 'mo']] },

  { id: 'ecouteur', cat: 2, titre: 'Je n\'entends pas le correspondant (écouteur interne)',
    etapes: [
      'Monter le volume en appel.',
      'Tester en haut-parleur : si le son passe, c\'est l\'écouteur interne.',
      'Nettoyer la grille de l\'écouteur.',
      'Tester avec un écouteur connu bon.',
    ],
    causes: ['Grille encrassée', 'Écouteur interne défectueux', 'Nappe de l\'écouteur (capteurs avant)'],
    reparations: [['Nettoyage grilles audio', 'mo'], ['Remplacement écouteur interne', 'piece']] },

  { id: 'audio-casque', cat: 2, titre: 'Prise casque ou audio Bluetooth',
    etapes: [
      'Tester avec un autre casque filaire et un autre appareil Bluetooth.',
      'Nettoyer la prise jack.',
      'Vérifier si le téléphone reste bloqué en « mode casque ».',
    ],
    causes: ['Prise jack encrassée ou oxydée', 'Prise jack défectueuse', 'Appairage Bluetooth à refaire'],
    reparations: [['Nettoyage prise jack', 'mo'], ['Remplacement prise jack', 'piece']] },

  { id: 'vibreur', cat: 2, titre: 'Ne vibre plus',
    etapes: [
      'Vérifier le réglage de vibration et le mode silencieux.',
      'Tester avec le menu de test du fabricant.',
      'Tester avec un vibreur connu bon.',
    ],
    causes: ['Réglage désactivé', 'Vibreur (moteur) défectueux ou déconnecté'],
    reparations: [['Remplacement vibreur', 'piece']] },

  // ---------- Réseau et connexions ----------
  { id: 'pas-de-reseau', cat: 3, titre: 'Pas de réseau / Aucun service',
    etapes: [
      'Tester avec une autre carte SIM qui fonctionne.',
      'Vérifier le mode avion et réinitialiser les réglages réseau.',
      'Taper *#06# : l\'IMEI s\'affiche-t-il ?',
      'Vérifier les nappes et câbles d\'antenne.',
    ],
    causes: ['Carte SIM ou opérateur', 'Réglages réseau', 'Antenne ou câble coaxial', 'Défaut de baseband sur la carte mère'],
    reparations: [['Réinitialisation réseau', 'mo'], ['Remplacement nappe / câble d\'antenne', 'piece'], ['Réparation carte mère (baseband)', 'mo']] },

  { id: 'sim-non-detectee', cat: 3, titre: 'Carte SIM non détectée',
    etapes: [
      'Tester avec une autre carte SIM qui fonctionne.',
      'Tester la SIM du client dans un autre téléphone.',
      'Inspecter le tiroir et le lecteur SIM (broches tordues).',
      'Vérifier que l\'appareil n\'est pas verrouillé opérateur.',
    ],
    causes: ['SIM du client défectueuse', 'Lecteur SIM abîmé', 'Tiroir SIM déformé', 'Verrouillage opérateur'],
    reparations: [['Remplacement tiroir SIM', 'piece'], ['Remplacement lecteur SIM', 'piece']] },

  { id: 'imei-absent', cat: 3, titre: 'IMEI absent ou « inconnu »',
    etapes: [
      'Taper *#06# et comparer avec l\'IMEI de la boîte ou du tiroir SIM.',
      'Si l\'IMEI est absent : panne de baseband ou de mémoire, réparation de carte mère.',
      'Vérifier que l\'appareil n\'est pas déclaré volé (et refuser l\'intervention s\'il l\'est).',
      'Ne jamais modifier un IMEI : c\'est interdit.',
    ],
    causes: ['Défaut du baseband ou de la mémoire de la carte mère', 'Système corrompu après un flash raté'],
    reparations: [['Réinstallation du système (firmware d\'origine)', 'mo'], ['Réparation carte mère (baseband)', 'mo']] },

  { id: 'wifi', cat: 3, titre: 'Wi-Fi ne marche pas ou bouton grisé',
    etapes: [
      'Redémarrer et réinitialiser les réglages réseau.',
      'Tester sur un autre réseau Wi-Fi.',
      'Vérifier si le Bluetooth fonctionne (même puce sur beaucoup de modèles).',
      'Vérifier l\'antenne Wi-Fi.',
    ],
    causes: ['Réglages réseau', 'Antenne Wi-Fi', 'Puce Wi-Fi / Bluetooth de la carte mère'],
    reparations: [['Réinitialisation réseau', 'mo'], ['Remplacement antenne Wi-Fi', 'piece'], ['Réparation carte mère (Wi-Fi)', 'mo']] },

  { id: 'bluetooth', cat: 3, titre: 'Bluetooth ne se connecte pas',
    etapes: [
      'Oublier l\'appareil et refaire l\'appairage.',
      'Tester avec un autre appareil Bluetooth.',
      'Réinitialiser les réglages réseau.',
    ],
    causes: ['Appairage corrompu', 'Antenne', 'Puce Wi-Fi / Bluetooth'],
    reparations: [['Réinitialisation réseau', 'mo'], ['Réparation carte mère (Wi-Fi / Bluetooth)', 'mo']] },

  { id: 'donnees-mobiles', cat: 3, titre: 'Internet mobile (4G) ne marche pas',
    etapes: [
      'Vérifier le forfait et le solde du client auprès de l\'opérateur.',
      'Contrôler les données mobiles activées et le réglage APN de l\'opérateur.',
      'Tester avec une autre SIM.',
      'Réinitialiser les réglages réseau.',
    ],
    causes: ['Forfait épuisé', 'APN incorrect', 'Réglages réseau', 'Antenne'],
    reparations: [['Configuration APN / réseau', 'mo']] },

  { id: 'gps', cat: 3, titre: 'GPS imprécis ou introuvable',
    etapes: [
      'Activer la localisation précise et tester à l\'extérieur.',
      'Calibrer la boussole dans l\'application de cartes.',
      'Tester avec une application de test GPS (nombre de satellites).',
    ],
    causes: ['Réglages de localisation', 'Antenne GPS', 'Coque métallique ou aimantée'],
    reparations: [['Réglages et calibrage', 'mo'], ['Remplacement antenne', 'piece']] },

  // ---------- Caméras et capteurs ----------
  { id: 'camera-arriere', cat: 4, titre: 'Caméra arrière floue, noire ou qui tremble',
    etapes: [
      'Nettoyer la lentille et vérifier si la vitre de caméra est fissurée.',
      'Tester chaque objectif (grand angle, ultra grand angle, zoom).',
      'Écouter un bruit de cliquetis (stabilisateur abîmé).',
      'Tester avec une caméra connue bonne.',
    ],
    causes: ['Vitre de caméra fissurée ou sale', 'Module caméra défectueux (autofocus, stabilisateur)', 'Nappe caméra'],
    reparations: [['Remplacement lentille / vitre caméra', 'piece'], ['Remplacement caméra arrière', 'piece']] },

  { id: 'camera-avant', cat: 4, titre: 'Caméra avant ne marche pas',
    etapes: [
      'Ouvrir l\'appareil photo et basculer en caméra avant.',
      'Nettoyer la zone de la caméra.',
      'Vérifier la nappe des capteurs avant après un changement d\'écran.',
      'Tester avec une caméra connue bonne.',
    ],
    causes: ['Module caméra avant défectueux', 'Nappe déconnectée après réparation'],
    reparations: [['Remplacement caméra avant', 'piece']] },

  { id: 'flash', cat: 4, titre: 'Flash ou lampe torche ne marche pas',
    etapes: [
      'Tester la lampe torche dans le centre de contrôle.',
      'Si l\'appareil photo est aussi noir, commencer par la caméra.',
      'Vérifier la nappe du flash.',
    ],
    causes: ['Nappe flash abîmée', 'Circuit du flash sur la carte mère', 'Caméra défectueuse qui bloque le flash'],
    reparations: [['Remplacement nappe flash', 'piece'], ['Réparation carte mère (flash)', 'mo']] },

  { id: 'face-id', cat: 4, titre: 'Reconnaissance faciale (Face ID) indisponible',
    etapes: [
      'Vérifier le message exact (« Face ID est indisponible »).',
      'Tester le mode portrait de la caméra avant (même module).',
      'Demander si l\'appareil est tombé ou a pris l\'eau.',
      'Prévenir le client : sur iPhone, le module est appairé à la carte mère, réparation délicate.',
    ],
    causes: ['Projecteur de points ou caméra infrarouge abîmés', 'Nappe capteurs avant', 'Choc ou oxydation'],
    reparations: [['Réparation Face ID (micro-soudure)', 'mo'], ['Remplacement nappe capteurs avant', 'piece']] },

  { id: 'empreinte', cat: 4, titre: 'Empreinte digitale ne marche pas',
    etapes: [
      'Supprimer et réenregistrer les empreintes.',
      'Retirer la protection d\'écran (capteurs sous l\'écran).',
      'Vérifier si le capteur est rayé ou si l\'écran a été remplacé par un compatible.',
    ],
    causes: ['Protection d\'écran incompatible', 'Capteur abîmé', 'Écran compatible sans capteur fonctionnel', 'Capteur appairé à la carte mère'],
    reparations: [['Remplacement capteur d\'empreinte', 'piece'], ['Remplacement écran d\'origine', 'piece']] },

  { id: 'proximite', cat: 4, titre: 'L\'écran reste allumé pendant les appels',
    etapes: [
      'Retirer la protection d\'écran qui couvre le capteur de proximité.',
      'Nettoyer la zone en haut de l\'écran.',
      'Tester avec un code de test du fabricant.',
      'Vérifier la nappe des capteurs avant après un changement d\'écran.',
    ],
    causes: ['Protection d\'écran qui couvre le capteur', 'Capteur de proximité défectueux', 'Nappe capteurs mal remontée'],
    reparations: [['Remplacement nappe capteurs avant', 'piece']] },

  // ---------- Boutons et connecteurs ----------
  { id: 'bouton-power', cat: 5, titre: 'Bouton marche / arrêt',
    etapes: [
      'Vérifier si le bouton est enfoncé, mou ou sans clic.',
      'Retirer la coque (pression permanente).',
      'Tester avec une nappe connue bonne.',
    ],
    causes: ['Nappe du bouton usée ou déchirée', 'Bouton déformé par un choc', 'Coque trop serrée'],
    reparations: [['Remplacement nappe bouton power', 'piece']] },

  { id: 'boutons-volume', cat: 5, titre: 'Boutons de volume',
    etapes: [
      'Tester chaque bouton (curseur de volume à l\'écran).',
      'Retirer la coque.',
      'Tester avec une nappe connue bonne.',
    ],
    causes: ['Nappe volume abîmée', 'Bouton bloqué par la saleté ou un choc'],
    reparations: [['Remplacement nappe volume', 'piece']] },

  { id: 'connecteur-abime', cat: 5, titre: 'Connecteur de charge abîmé ou câble qui ne tient pas',
    etapes: [
      'Regarder à la loupe : broches tordues, cassées, brûlées ?',
      'Nettoyer le connecteur.',
      'Tester le transfert de données avec un ordinateur.',
    ],
    causes: ['Connecteur usé ou cassé', 'Saleté tassée au fond du connecteur', 'Oxydation'],
    reparations: [['Nettoyage connecteur de charge', 'mo'], ['Remplacement connecteur de charge', 'piece']] },

  // ---------- Logiciel ----------
  { id: 'bootloop', cat: 6, titre: 'Bloqué sur le logo (redémarre en boucle)',
    etapes: [
      'Demander ce qui s\'est passé juste avant : mise à jour, chute, eau, mémoire pleine ?',
      'Brancher à l\'ordinateur en mode récupération / téléchargement.',
      'Tenter une mise à jour sans effacer les données.',
      'Si échec, prévenir le client avant une réinstallation complète (perte des données).',
      'Si le problème persiste après réinstallation : panne matérielle (mémoire, batterie, nappe).',
    ],
    causes: ['Mise à jour ratée ou système corrompu', 'Mémoire pleine', 'Batterie trop faible', 'Panne matérielle (mémoire, carte mère)'],
    reparations: [['Mise à jour / réparation du système', 'mo'], ['Réinstallation complète du système', 'mo'], ['Réparation carte mère', 'mo']] },

  { id: 'lent', cat: 6, titre: 'Lent ou applications qui se ferment',
    etapes: [
      'Vérifier l\'espace de stockage libre (garder au moins 10 %).',
      'Mettre à jour le système et les applications.',
      'Vider le cache des applications lourdes, désinstaller les inutiles.',
      'Vérifier la santé de la batterie (un iPhone bride les performances si elle est usée).',
    ],
    causes: ['Mémoire saturée', 'Système ou applications pas à jour', 'Batterie usée', 'Logiciels malveillants'],
    reparations: [['Optimisation logicielle', 'mo'], ['Remplacement batterie', 'piece']] },

  { id: 'code-oublie', cat: 6, titre: 'Code de déverrouillage oublié',
    etapes: [
      'Vérifier l\'identité et la preuve d\'achat du client (facture, boîte avec IMEI).',
      'Prévenir que la réinitialisation efface toutes les données non sauvegardées.',
      'Vérifier que le client connaît son compte Google / Apple : il sera demandé après la réinitialisation.',
      'Réinitialiser par le mode récupération ou l\'outil officiel du fabricant.',
    ],
    causes: ['Code oublié par le propriétaire'],
    reparations: [['Réinitialisation (propriétaire vérifié)', 'mo']] },

  { id: 'systeme-corrompu', cat: 6, titre: 'Mise à jour ratée ou système corrompu',
    etapes: [
      'Sauvegarder les données si l\'appareil démarre encore.',
      'Réinstaller le firmware officiel du fabricant correspondant au modèle et à la région.',
      'Vérifier ensuite réseau, IMEI et capteurs.',
    ],
    causes: ['Coupure pendant la mise à jour', 'Firmware non officiel installé'],
    reparations: [['Réinstallation du système (firmware d\'origine)', 'mo'], ['Sauvegarde des données', 'mo']] },

  { id: 'memoire-pleine', cat: 6, titre: 'Mémoire pleine',
    etapes: [
      'Voir dans Réglages › Stockage ce qui prend de la place (WhatsApp, photos, vidéos).',
      'Proposer une sauvegarde des photos et vidéos (ordinateur, clé, cloud).',
      'Nettoyer les médias WhatsApp et le cache des applications.',
    ],
    causes: ['Photos, vidéos et médias WhatsApp accumulés'],
    reparations: [['Sauvegarde des données', 'mo'], ['Nettoyage et optimisation', 'mo'], ['Carte mémoire', 'piece']] },

  { id: 'virus-pubs', cat: 6, titre: 'Publicités intempestives / virus',
    etapes: [
      'Démarrer en mode sans échec : les pubs disparaissent-elles ?',
      'Lister les applications installées récemment ou inconnues, et celles avec droits d\'administrateur.',
      'Désinstaller les applications suspectes, vérifier avec Play Protect.',
      'En dernier recours : sauvegarde puis réinitialisation.',
    ],
    causes: ['Application malveillante installée hors Play Store', 'Notifications de sites web autorisées par erreur'],
    reparations: [['Nettoyage logiciel', 'mo'], ['Réinitialisation avec sauvegarde', 'mo']] },

  { id: 'recuperation-donnees', cat: 6, titre: 'Récupération ou transfert de données',
    etapes: [
      'Vérifier si l\'appareil s\'allume et si le client connaît son code.',
      'Lister ce qui est important : contacts, photos, WhatsApp, documents.',
      'Transférer vers le nouvel appareil ou vers un support remis au client.',
      'Faire vérifier par le client avant d\'effacer quoi que ce soit.',
    ],
    causes: ['Changement de téléphone', 'Appareil endommagé'],
    reparations: [['Transfert de données', 'mo'], ['Récupération de données (appareil endommagé)', 'mo']] },

  // ---------- Chocs et liquides ----------
  { id: 'eau', cat: 7, titre: 'Tombé dans l\'eau / oxydation',
    etapes: [
      'Ne pas allumer ni charger. Demander quand et dans quel liquide (eau douce, salée, boisson sucrée).',
      'Démonter, débrancher la batterie, inspecter les traces d\'oxydation et les indicateurs d\'humidité.',
      'Nettoyer la carte mère à l\'alcool isopropylique (bain à ultrasons si disponible) et sécher.',
      'Remonter et tester chaque fonction ; prévenir le client que des pannes peuvent apparaître plus tard.',
    ],
    causes: ['Oxydation des composants et connecteurs', 'Court-circuit provoqué par le liquide'],
    reparations: [['Désoxydation / nettoyage carte mère', 'mo'], ['Remplacement batterie', 'piece'], ['Remplacement des pièces oxydées', 'piece']] },

  { id: 'vitre-arriere', cat: 7, titre: 'Vitre arrière ou châssis cassé',
    etapes: [
      'Vérifier les arêtes coupantes et les morceaux qui manquent.',
      'Contrôler la charge sans fil et les caméras (souvent touchées).',
      'Vérifier si le châssis est tordu (l\'écran risque de casser).',
    ],
    causes: ['Chute ou choc'],
    reparations: [['Remplacement vitre arrière', 'piece'], ['Remplacement châssis complet', 'piece'], ['Main d\'œuvre (découpe laser / transfert)', 'mo']] },

  { id: 'court-circuit', cat: 7, titre: 'Consommation anormale / court-circuit',
    etapes: [
      'Mesurer la consommation à l\'alimentation de laboratoire dès le branchement.',
      'Chercher le composant qui chauffe (colophane, caméra thermique).',
      'Mesurer les lignes principales au multimètre (mode diode).',
      'Remplacer ou retirer le condensateur ou le composant en court-circuit.',
    ],
    causes: ['Condensateur en court-circuit', 'Composant abîmé par un liquide ou une surtension'],
    reparations: [['Réparation carte mère (micro-soudure)', 'mo']] },
];

export const panne = (id) => PANNES.find((p) => p.id === id);
