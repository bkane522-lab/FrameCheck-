# FrameCheck — V5

Application d'entraînement Kizomba volontairement simple :

**Ouvrir → Commencer → Choisir → Positionner le téléphone → Caméra → Résultat.**

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
- nouveau moteur `liberte-engine.mjs` ;
- session minimale d'environ 10 secondes pour le résumé ;
- variété observable des amplitudes de bras ;
- déplacements horizontaux et verticaux visibles ;
- changements de hauteur via la trajectoire projetée du bassin ;
- plage de rotation épaules-bassin projetée ;
- répétitivité approximative basée sur le retour d'états de mouvement similaires.

**Important : ce module ne mesure pas scientifiquement la créativité artistique.** Il décrit seulement des caractéristiques visibles et mesurables dans l'image. L'indicateur de répétitivité est heuristique et n'est pas un score artistique.

## Confidentialité

Le flux caméra est analysé localement dans le navigateur. FrameCheck ne contient aucun code d'upload ou de stockage vidéo serveur. MediaPipe, son WASM et son modèle sont encore téléchargés depuis des services externes au démarrage.

## Limites

- FrameCheck ne remplace jamais un professeur.
- Une estimation MediaPipe n'est pas une mesure biomécanique de laboratoire.
- Perspective, lumière, vêtements, occlusions et placement du téléphone peuvent modifier les résultats.
- Les seuils des quatre moteurs restent heuristiques et provisoires jusqu'à calibration sur des sessions réelles.

## Source technique

Google MediaPipe Pose Landmarker for Web :
https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js

La documentation officielle décrit 33 landmarks par pose, les coordonnées normalisées, les world landmarks 3D et la visibilité. Elle indique aussi que `detectForVideo()` est synchrone sur le Web.

## Tests

```bash
node test-cadre.mjs
node test-posture.mjs
node test-marche.mjs
node test-liberte.mjs
```

## PWA

Le manifeste existe mais la PWA n'est pas encore finalisée : icônes, service worker, tests d'installation Android/iOS et fonctionnement hors ligne restent à réaliser.
