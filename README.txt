# Hostinger Ready Package (MySQL + Konnect)

Ce package est concu pour Hostinger Node.js + base MySQL Hostinger + paiement Konnect.

## Commandes Hostinger
Install command: npm install
Build command: laisser vide
Start command: npm start

## Variables d'environnement
```txt
NODE_ENV=production
PORT=3000
JWT_SECRET=CHANGE_ME_TO_A_LONG_RANDOM_SECRET_KEY
CLIENT_URL=https://votre-domaine.tn
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=uXXXXXXXXX_beauty_center
MYSQL_USER=uXXXXXXXXX_beauty_user
MYSQL_PASSWORD=CHANGE_ME
KONNECT_API_KEY=CHANGE_ME
KONNECT_WALLET_ID=CHANGE_ME
KONNECT_API_BASE_URL=https://api.konnect.network/api/v2
```

## Konnect
- URL webhook Konnect a configurer:
  `https://votre-domaine.tn/api/payments/konnect/webhook`
- Le paiement initie une redirection Konnect.
- Le compte eleve est cree automatiquement apres paiement valide.

## Base de donnees
- Le schema MySQL se cree automatiquement au demarrage.
- Les colonnes de paiement sont ajoutees automatiquement si elles n'existent pas.

## Seed manuel
```bash
npm run seed
```
