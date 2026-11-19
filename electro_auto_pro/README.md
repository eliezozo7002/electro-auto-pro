# Électro Auto Pro — moteur Google Gemini

Assistant IA francophone de diagnostic électrique et électronique automobile. Le serveur Express transmet les demandes à Google Gemini. La clé API reste côté serveur et n'est jamais exposée au navigateur.

## Pré-requis
- Node.js 20 ou plus récent
- Une clé Gemini créée dans Google AI Studio : https://aistudio.google.com/app/apikey
- Connexion Internet

## Démarrage sous Windows
1. Décompressez le dossier.
2. Ouvrez un terminal dans le dossier `electro_auto_pro`.
3. Exécutez `npm install`.
4. Copiez `.env.example` vers un nouveau fichier nommé `.env`.
5. Ouvrez `.env` et remplacez `collez_votre_cle_gemini_ici` par votre clé secrète.
6. Exécutez `npm start`.
7. Ouvrez http://localhost:3000.

Le contrôle de santé est disponible sur http://localhost:3000/api/health.

## Configuration
- `GEMINI_API_KEY` : clé secrète générée dans Google AI Studio.
- `GEMINI_MODEL` : modèle utilisé. Valeur par défaut : `gemini-2.5-flash-lite`.
- `PORT` : port HTTP, 3000 par défaut.

## À propos du niveau gratuit et des données
Google propose un niveau gratuit avec quotas et modèles disponibles variables selon le pays et le compte. Les limites peuvent changer ou être atteintes. Consultez https://ai.google.dev/gemini-api/docs/pricing. Les requêtes du niveau gratuit peuvent être utilisées par Google pour améliorer ses produits : ne transmettez pas de données personnelles, confidentielles ou identifiantes de clients.

## Sécurité et limites
- La clé API ne doit jamais être ajoutée au HTML ou au JavaScript du navigateur.
- Le serveur limite les appels par adresse IP et la taille des requêtes.
- Les réponses IA sont des aides au diagnostic, pas une preuve de panne. Vérifiez les valeurs, brochages et procédures dans la documentation constructeur avant toute intervention.
- Avant un déploiement public : ajoutez une authentification, des quotas par utilisateur, une politique de confidentialité, des journaux protégés et une protection anti-abus. N'exposez pas le serveur publiquement sans ces mesures.

## Hébergement
Le serveur peut être déployé sur un hébergeur Node.js. Configurez `GEMINI_API_KEY` et `GEMINI_MODEL` dans les variables d'environnement/secrets de l'hébergeur. Ne téléversez jamais votre fichier `.env`.
