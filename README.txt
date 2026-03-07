# Hostinger Ready Package

Ce dossier est la version la plus simple pour Hostinger Node.js.

## Structure
- `server.js` : serveur Node principal
- `src/` : logique backend
- `public/` : frontend deja buildé
- `uploads/` : images et documents
- `package.json` : dependances et commande de demarrage

## Commandes Hostinger
```txt
Install command: npm install
Build command: laisser vide
Start command: npm start
```

## Variables d'environnement
Vous pouvez copier le contenu de `.env.production.example` dans Hostinger.

```txt
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/beauty_center?retryWrites=true&w=majority
JWT_SECRET=mettez_une_cle_tres_longue_et_secrete
CLIENT_URL=https://votre-domaine.tn
```

## Seed de demo
```bash
npm run seed
```
