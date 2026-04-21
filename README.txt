

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
UPLOADS_DIR=/home/uXXXXXXXXX/academy-storage/uploads
```

- Le compte eleve est cree automatiquement apres paiement valide.
- Pour Hostinger, utilisez un `UPLOADS_DIR` situe hors du dossier de l'application afin que les images des formations et les recus restent apres chaque redeploiement.
- Exemple conseille: `/home/uXXXXXXXXX/academy-storage/uploads`
- Les URL restent servies par `/uploads/...`, seul l'emplacement disque change.

## Base de donnees
- Le schema MySQL se cree automatiquement au demarrage.
- Les colonnes de paiement sont ajoutees automatiquement si elles n'existent pas.

## Seed manuel
```bash
npm run seed
```

