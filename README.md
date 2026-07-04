# FrameCheck

Miroir IA de posture pour la danse partenaire (kizomba / urban kiz).
- **Entraînement Solo** : caméra + MediaPipe Pose Landmarker (chargé via CDN, aucune clé API, tout tourne dans le navigateur) → détecte hauteur des bras, alignement du dos, rotation épaules/bassin.
- **Le Bal** : module pédagogique sur la ligne de danse (LOD).

## Déploiement (GitHub mobile → Vercel)
1. Crée un nouveau repo (ou un dossier dans un repo existant), upload `index.html` + `manifest.json`.
2. Connecte le repo à Vercel (root = dossier du projet, pas de build command, output = racine).
3. Ouvre l'URL Vercel sur ton téléphone en HTTPS (obligatoire pour l'accès caméra), autorise la caméra.

## Notes techniques
- Aucune donnée vidéo n'est envoyée à un serveur : tout le traitement (MediaPipe + calculs d'angles) se fait en local dans le navigateur.
- Les seuils de posture (hauteur des bras, angle du dos, torsion épaules/bassin) sont des valeurs indicatives pour un cadre kizomba standard — à ajuster dans `index.html` (section `draw()`) selon les retours des utilisateurs.
- Icônes PWA à ajouter dans `manifest.json` si tu veux une icône d'app personnalisée (logo lion doré par ex.).
