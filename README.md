# FrameCheck

Application d'entraînement Kizomba conçue pour rester simple :

**Ouvrir → Commencer → Choisir → Positionner le téléphone → Caméra → Résultat.**

## État de développement

### Étape 1 — socle V1
- accueil simplifié ;
- quatre entraînements : Cadre, Marche, Posture, Liberté de mouvement ;
- caméra visible + squelette MediaPipe ;
- compte à rebours ;
- résultat de session ;
- traitement vidéo local dans le navigateur.

### Étape 2 — moteur Cadre
Le module **Cadre** ne juge plus une position par rapport à une posture universelle.

Il fonctionne maintenant ainsi :
1. après le compte à rebours, environ 2 secondes de repères valides créent un **repère personnel de départ** ;
2. les variations des bras sont comparées à ce repère ;
3. les changements doivent persister plusieurs échantillons avant d'afficher un message, afin de réduire le clignotement ;
4. la rotation épaules-bassin reste descriptive et n'est pas classée comme « bonne » ou « mauvaise » ;
5. le résumé indique surtout la stabilité par rapport au repère de départ.

Le moteur utilise :
- landmarks 2D normalisés pour les positions dans l'image ;
- `visibility` et `presence` pour filtrer les repères peu fiables ;
- world landmarks 3D MediaPipe pour l'angle du coude lorsqu'ils sont disponibles ;
- médianes et lissage temporel ;
- seuils **provisoires**, centralisés dans `cadre-engine.mjs` pour faciliter la future calibration.

## Limites importantes

- FrameCheck ne remplace jamais un professeur.
- Une estimation MediaPipe n'est pas une mesure biomécanique de laboratoire.
- La perspective, la lumière, les vêtements, l'occlusion et le placement du téléphone peuvent modifier les résultats.
- Les seuils de variation du module Cadre sont encore provisoires et doivent être calibrés sur des sessions réelles avant toute revendication de fiabilité.
- Le module « Liberté de mouvement » décrit uniquement la variété visible de certains mouvements ; il ne mesure pas la créativité artistique.
- MediaPipe, son WASM et son modèle sont actuellement téléchargés depuis des services externes au démarrage. La vidéo elle-même n'est ni envoyée ni stockée par l'application.

## Source technique MediaPipe

Documentation officielle Google MediaPipe Pose Landmarker for Web :
https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js

La documentation officielle indique notamment que Pose Landmarker renvoie 33 landmarks par pose, des coordonnées normalisées, des world landmarks 3D, ainsi que des scores de visibilité. Elle précise également que `detectForVideo()` est synchrone et bloque le thread principal pendant l'inférence ; le passage à un Web Worker sera donc évalué lors de l'étape performance/mobile si nécessaire.

## Tests

Test du moteur Cadre :

```bash
node test-cadre.mjs
```

Le test vérifie :
- création du repère initial ;
- session stable ;
- variation persistante du bras gauche ;
- variation de rotation ;
- calcul d'un angle 3D connu.

## Déploiement de test

Servir le dossier en HTTPS. L'accès caméra sur mobile exige un contexte sécurisé (hors localhost).

La PWA n'est pas encore considérée comme finalisée : icônes, service worker, installation Android/iOS et tests hors ligne restent à réaliser.
