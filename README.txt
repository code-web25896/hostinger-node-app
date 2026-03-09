# Hostinger Ready Package (MySQL + Stripe)

Ce package est concu pour Hostinger Node.js + base MySQL Hostinger + Stripe Checkout.

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
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=uXXXXXXXXX_beauty_center
MYSQL_USER=uXXXXXXXXX_beauty_user
MYSQL_PASSWORD=CHANGE_ME
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

## Stripe
- Le paiement formation passe par Stripe Checkout.
- URL webhook Stripe a configurer:
  `https://votre-domaine.tn/api/payments/stripe/webhook`
- Evenement Stripe minimal a ecouter:
  `checkout.session.completed`
- Optionnel:
  `checkout.session.async_payment_succeeded`
  `checkout.session.expired`

## Base de donnees
- Le schema MySQL se cree automatiquement au demarrage.
- Si la base est vide, des donnees de demo sont creees automatiquement.
- Les paiements valides confirment l'inscription et creent automatiquement le compte eleve.

## Seed manuel
```bash
npm run seed
```
