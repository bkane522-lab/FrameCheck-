# FrameCheck — suivi corps entier

Application d'entraînement Kizomba / Urban Kiz volontairement simple :

**Ouvrir → Commencer → Choisir → Positionner le téléphone → Caméra → Résultat.**

## Correction principale de cette version

Cette version corrige deux problèmes observés sur téléphone :

1. le cadrage caméra pouvait donner l'impression que FrameCheck ne suivait que le haut du corps ;
2. le squelette disparaissait facilement pendant un pivot ou une rotation.

### Changements du suivi

- modèle MediaPipe **Pose Landmarker Full** utilisé en priorité ;
- repli automatique vers le modèle Lite si le modèle Full ne peut pas être chargé ;
- cadrage caméra vertical **9:16** ;
- `object-fit: contain` pour ne plus rogner visuellement la tête ou les pieds ;
- squelette étendu à la tête, aux bras, au bassin, aux jambes, aux talons et aux pointes de pieds ;
- seuils de détection / présence / tracking assouplis pour mieux tolérer les vues de profil ;
- une articulation momentanément masquée ne coupe plus tout le suivi ;
- le squelette reste affiché brièvement (700 ms maximum, en transparence) lorsqu'un pivot provoque une perte momentanée de détection ;
- l'analyse se met en pause quand les repères nécessaires sont trop incertains, au lieu d'enregistrer une mesure douteuse ;
- calcul du dessin corrigé pour respecter le vrai ratio de la vidéo quand des bandes noires apparaissent avec `contain` ;
- calculs corporels basés sur les dimensions intrinsèques de la vidéo plutôt que sur le rectangle CSS affiché.

## Modules actifs

### Cadre
- repère personnel d'environ 2 secondes ;
- variations des bras et relation épaules-bassin ;
- filtrage, lissage temporel et messages prudents.

### Posture
- moteur `posture-engine.mjs` ;
- repère personnel ;
- variations visibles de l'axe projeté du buste, des épaules et du bassin ;
- aucune posture universelle imposée.

### Marche
- moteur `marche-engine.mjs` ;
- observation du déplacement du bassin ;
- continuité visible ;
- alternance descriptive de mouvement entre les pieds ;
- aucun jugement de qualité technique, de guidage ou de musicalité.

### Liberté de mouvement
- moteur `liberte-engine.mjs` ;
- variété observable des amplitudes ;
- déplacements horizontaux et verticaux visibles ;
- changements de hauteur ;
- rotation épaules-bassin projetée ;
- répétitivité approximative de motifs visibles.

**Ce module ne mesure pas scientifiquement la créativité artistique.**

## Confidentialité

Le flux caméra est analysé localement dans le navigateur. FrameCheck ne contient aucun code d'upload ou de stockage vidéo serveur. MediaPipe, son WASM et son modèle sont encore téléchargés depuis des services externes au démarrage.

## Limites importantes

- FrameCheck ne remplace jamais un professeur.
- Un pivot complet dos caméra peut masquer plusieurs articulations ; la V7 cherche à maintenir l'affichage et reprend l'analyse dès que les repères sont suffisamment fiables.
- Une estimation MediaPipe n'est pas une mesure biomécanique de laboratoire.
- Perspective, lumière, vêtements, occlusions et placement du téléphone peuvent modifier les résultats.
- Les seuils restent heuristiques et doivent être calibrés sur des sessions réelles de Kizomba / Urban Kiz.

## Source technique

Google MediaPipe Pose Landmarker for Web :
https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js

La documentation officielle décrit les 33 landmarks de la pose et les paramètres `minPoseDetectionConfidence`, `minPosePresenceConfidence` et `minTrackingConfidence`. Les modèles Lite, Full et Heavy sont proposés officiellement.

## Tests

```bash
node test-cadre.mjs
node test-posture.mjs
node test-marche.mjs
node test-liberte.mjs
```

## PWA

Le manifeste existe mais la PWA n'est pas encore finalisée : icônes, service worker, tests d'installation Android/iOS et fonctionnement hors ligne restent à réaliser.
