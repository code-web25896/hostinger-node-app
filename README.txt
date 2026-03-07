# Hostinger Ready Package (MySQL)

Ce package est concu pour Hostinger Node.js + base MySQL Hostinger.

## Commandes Hostinger
Install command: npm install
Build command: laisser vide
Start command: npm start

## Variables d'environnement
Copiez `.env.hostinger` dans les variables Hostinger puis remplacez les placeholders.

```txt
NODE_ENV=production
PORT=3000
JWT_SECRET=CHANGE_ME_TO_A_LONG_RANDOM_SECRET_KEY
CLIENT_URL=https://votre-domaine.tn
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=uXXXXXXXXX_beauty_center
MYSQL_USER=uXXXXXXXXX_beauty_user
MYSQL_PASSWORD=CHANGE_ME
```

## Base de donnees
- Le schema MySQL se cree automatiquement au demarrage.
- Si la base est vide, des donnees de demo sont creees automatiquement.
- Comptes demo: `admin@academie.tn / Admin@123` et `yasmine@academie.tn / Yasmine@123`.

## Seed manuel
```bash
npm run seed
```
