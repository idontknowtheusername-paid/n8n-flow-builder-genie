
# Benome Backend API

Backend API pour la marketplace Benome construite avec Node.js, Express, et PostgreSQL.

## Installation

1. Clonez le repository
2. Copiez `.env.example` vers `.env` et configurez vos variables d'environnement
3. Installez les dépendances : `npm install`
4. Exécutez les migrations : `npm run migrate`
5. (Optionnel) Exécutez les seeds : `npm run seed`
6. Démarrez le serveur : `npm run dev`

## Variables d'environnement requises

- `DATABASE_URL` : URL de connexion PostgreSQL
- `JWT_SECRET` : Secret pour les tokens JWT
- `CLOUDINARY_*` : Credentials Cloudinary pour l'upload d'images
- `STRIPE_SECRET_KEY` : Clé secrète Stripe
- `PAYPAL_*` : Credentials PayPal
- `SMTP_*` : Configuration email

## Déploiement

### Sur Render

1. Connectez votre repository GitHub
2. Configurez les variables d'environnement
3. Le build se fera automatiquement

### Sur Vercel

1. Installez la CLI Vercel : `npm i -g vercel`
2. Exécutez : `vercel`
3. Configurez les variables d'environnement dans le dashboard

## API Endpoints

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Profil utilisateur

### Annonces
- `GET /api/listings` - Liste des annonces avec filtres
- `GET /api/listings/:id` - Détails d'une annonce
- `POST /api/listings` - Créer une annonce
- `PUT /api/listings/:id` - Modifier une annonce
- `DELETE /api/listings/:id` - Supprimer une annonce

### Paiements
- `POST /api/payments/initiate` - Initier un paiement
- `GET /api/payments/status/:id` - Statut d'un paiement

### Messagerie
- `GET /api/messages/conversations` - Liste des conversations
- `GET /api/messages/conversations/:id/messages` - Messages d'une conversation
- `POST /api/messages/conversations/:id/messages` - Envoyer un message
- `POST /api/messages/conversations` - Démarrer une conversation

### Upload
- `POST /api/upload/image` - Upload d'une image
- `POST /api/upload/images` - Upload multiple d'images

### Administration
- `GET /api/admin/dashboard` - Statistiques admin
- `GET /api/admin/listings` - Gestion des annonces
- `PUT /api/admin/listings/:id/approve` - Approuver une annonce
- `PUT /api/admin/listings/:id/reject` - Rejeter une annonce

## WebSocket Events

### Messagerie en temps réel
- `join_conversation` - Rejoindre une conversation
- `send_message` - Envoyer un message
- `new_message` - Nouveau message reçu
- `typing_start/stop` - Indicateurs de frappe

## Base de données

La base de données PostgreSQL comprend les tables principales :
- `users` - Utilisateurs
- `listings` - Annonces génériques
- `real_estate_listings` - Spécifique immobilier
- `automobile_listings` - Spécifique automobile
- `service_listings` - Spécifique services
- `product_listings` - Spécifique produits
- `conversations` - Conversations
- `messages` - Messages
- `transactions` - Transactions
- `notifications` - Notifications

## Sécurité

- Authentification JWT
- Validation des entrées avec express-validator
- Rate limiting
- Hashing des mots de passe avec bcryptjs
- Protection CORS et headers de sécurité avec helmet
