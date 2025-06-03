
# Benome Backend API

Backend API complet pour la marketplace Benome - Une plateforme moderne pour l'Afrique de l'Ouest permettant l'achat, la vente et la location de biens immobiliers, véhicules, services et produits divers.

## 🏗️ Architecture

### Technologies Utilisées
- **Node.js 18+** - Runtime JavaScript
- **Express.js 4.18** - Framework web
- **PostgreSQL** - Base de données relationnelle
- **Socket.IO** - Communication temps réel
- **JWT** - Authentification
- **Cloudinary** - Stockage d'images
- **Stripe & PayPal** - Paiements
- **Nodemailer** - Envoi d'emails

### Structure du Projet
```
backend/
├── config/
│   └── database.js          # Configuration PostgreSQL
├── middleware/
│   ├── auth.js              # Authentification JWT
│   ├── errorHandler.js      # Gestion globale des erreurs
│   ├── security.js          # Sécurité et rate limiting
│   └── validation.js        # Validation des données
├── routes/
│   ├── auth.js              # Authentification
│   ├── users.js             # Gestion utilisateurs
│   ├── listings.js          # Annonces (CRUD complet)
│   ├── categories.js        # Catégories et sous-catégories
│   ├── reviews.js           # Avis et évaluations
│   ├── messages.js          # Messagerie interne
│   ├── notifications.js     # Notifications
│   ├── payments.js          # Paiements Stripe/PayPal
│   ├── upload.js            # Upload fichiers/images
│   └── admin.js             # Administration
├── services/
│   ├── emailService.js      # Service d'envoi d'emails
│   └── notificationService.js # Service de notifications
├── sockets/
│   └── socketHandler.js     # Gestion WebSocket
├── utils/
│   └── helpers.js           # Fonctions utilitaires
├── migrations/
│   └── migrate.js           # Migrations base de données
├── seeds/
│   └── seed.js              # Données initiales
├── scripts/
│   └── deploy.js            # Script de déploiement
├── .env.example             # Variables d'environnement
├── server.js                # Point d'entrée
├── package.json             # Dépendances
└── vercel.json              # Configuration Vercel
```

## 🚀 Installation et Configuration

### Prérequis
- Node.js 18+ et npm
- PostgreSQL 12+
- Compte Cloudinary (pour les images)
- Compte Stripe (pour les paiements)
- Compte PayPal Developer (optionnel)

### 1. Installation des Dépendances
```bash
npm install
```

### 2. Configuration des Variables d'Environnement
Copiez `.env.example` vers `.env` et configurez :

```env
# Base de données PostgreSQL
DATABASE_URL=postgresql://db_agent_ventes_user:ZSPMn6b02IEfWpESffxCYJpUUTan7pES@dpg-d0jt5hje5dus73b97v10-a.oregon-postgres.render.com:5432/db_agent_ventes

# Serveur
PORT=3000
NODE_ENV=production

# JWT
JWT_SECRET=votre_secret_jwt_super_secure_ici
JWT_EXPIRES_IN=7d

# Cloudinary (pour upload images)
CLOUDINARY_CLOUD_NAME=votre_cloud_name
CLOUDINARY_API_KEY=votre_api_key
CLOUDINARY_API_SECRET=votre_api_secret

# Email SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre_email@gmail.com
SMTP_PASS=votre_mot_de_passe_app

# Paiements
STRIPE_SECRET_KEY=sk_test_votre_cle_stripe
STRIPE_WEBHOOK_SECRET=whsec_votre_webhook_secret

PAYPAL_CLIENT_ID=votre_paypal_client_id
PAYPAL_CLIENT_SECRET=votre_paypal_client_secret
PAYPAL_MODE=sandbox

# PayDunya (optionnel)
PAYDUNYA_MASTER_KEY=votre_paydunya_master_key
PAYDUNYA_PRIVATE_KEY=votre_paydunya_private_key
PAYDUNYA_TOKEN=votre_paydunya_token

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### 3. Initialisation de la Base de Données
```bash
# Exécuter les migrations
npm run migrate

# Insérer les données initiales (optionnel)
npm run seed
```

### 4. Lancement du Serveur
```bash
# Développement (avec nodemon)
npm run dev

# Production
npm start
```

Le serveur sera accessible sur `http://localhost:3000`

## 📊 Base de Données

### Modèle de Données Principal

#### Utilisateurs
- **users** - Informations utilisateur, KYC, rôles
- **notifications** - Notifications utilisateur
- **reviews** - Avis et évaluations

#### Annonces
- **listings** - Annonces génériques
- **categories** - Catégories et sous-catégories
- **real_estate_listings** - Spécifique immobilier
- **automobile_listings** - Spécifique automobile  
- **service_listings** - Spécifique services
- **product_listings** - Spécifique produits

#### Transactions
- **transactions** - Paiements et commandes
- **conversations** - Conversations entre utilisateurs
- **messages** - Messages individuels

### Relations Principales
```sql
users (1) ──→ (n) listings
users (1) ──→ (n) messages
listings (1) ──→ (n) reviews
listings (1) ──→ (1) real_estate_listings|automobile_listings|...
conversations (1) ──→ (n) messages
```

## 🔌 API Endpoints

### Base URL
```
https://votre-backend.com/api
```

### 🔐 Authentification
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/auth/register` | Inscription utilisateur |
| POST | `/auth/login` | Connexion |
| POST | `/auth/logout` | Déconnexion |
| GET | `/auth/me` | Profil utilisateur actuel |

**Exemple d'inscription :**
```javascript
POST /api/auth/register
{
  "firstName": "Jean",
  "lastName": "Dupont", 
  "email": "jean@example.com",
  "password": "motdepasse123",
  "phoneNumber": "+33123456789"
}
```

### 👤 Utilisateurs
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/users/:id` | Profil public utilisateur |
| PUT | `/users/me` | Modifier profil |
| PUT | `/users/me/password` | Changer mot de passe |
| POST | `/users/me/kyc` | Soumettre documents KYC |
| GET | `/users/:id/listings` | Annonces d'un utilisateur |
| GET | `/users/:id/reviews` | Avis reçus |

### 📝 Annonces
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/listings` | Liste avec filtres |
| GET | `/listings/:id` | Détail annonce |
| POST | `/listings` | Créer annonce |
| PUT | `/listings/:id` | Modifier annonce |
| DELETE | `/listings/:id` | Supprimer annonce |
| GET | `/listings/featured` | Annonces vedettes |
| GET | `/listings/user/:userId` | Annonces utilisateur |

**Filtres disponibles :**
- `category` - Catégorie (REAL_ESTATE, AUTOMOBILE, SERVICE, PRODUCT)
- `subCategory` - Sous-catégorie
- `minPrice`, `maxPrice` - Fourchette de prix
- `location` - Ville/région
- `q` - Recherche textuelle
- `sortBy` - Tri (price, created_at, view_count)
- `page`, `limit` - Pagination

**Exemple de création d'annonce immobilière :**
```javascript
POST /api/listings
{
  "title": "Appartement 3 pièces Cocody",
  "description": "Bel appartement rénové...",
  "price": 180000,
  "currency": "XOF",
  "category": "REAL_ESTATE",
  "subCategory": "Appartement",
  "location": {
    "city": "Abidjan",
    "country": "Côte d'Ivoire",
    "coordinates": [5.3364, -4.0267]
  },
  "images": ["https://cloudinary.com/image1.jpg"],
  "specificData": {
    "propertyType": "APPARTMENT",
    "transactionType": "SALE", 
    "bedrooms": 3,
    "bathrooms": 2,
    "areaSqMeters": 85
  }
}
```

### 📱 Messagerie
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/messages/conversations` | Liste conversations |
| GET | `/messages/conversations/:id/messages` | Messages conversation |
| POST | `/messages/conversations/:id/messages` | Envoyer message |
| POST | `/messages/conversations` | Nouvelle conversation |

### 💳 Paiements
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/payments/initiate` | Initier paiement |
| GET | `/payments/status/:id` | Statut paiement |
| POST | `/payments/stripe/webhook` | Webhook Stripe |
| GET | `/payments/paypal/success` | Callback PayPal |

### 📂 Catégories
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/categories` | Toutes les catégories |
| GET | `/categories/:slug` | Catégorie par slug |
| GET | `/categories/stats/counts` | Statistiques |

### ⭐ Avis
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/reviews` | Créer avis |
| GET | `/reviews/user/:userId` | Avis utilisateur |
| GET | `/reviews/listing/:listingId` | Avis annonce |
| PUT | `/reviews/:id` | Modifier avis |
| DELETE | `/reviews/:id` | Supprimer avis |

### 📁 Upload
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/upload/image` | Upload image unique |
| POST | `/upload/images` | Upload multiple |
| DELETE | `/upload/image/:publicId` | Supprimer image |

### 🔔 Notifications
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/notifications` | Notifications utilisateur |
| PUT | `/notifications/:id/read` | Marquer comme lu |
| PUT | `/notifications/read-all` | Tout marquer lu |
| GET | `/notifications/unread-count` | Nombre non lus |

### 👨‍💼 Administration
| Méthode | Endpoint | Description | Rôle requis |
|---------|----------|-------------|-------------|
| GET | `/admin/dashboard` | Statistiques | ADMIN |
| GET | `/admin/listings` | Modération annonces | ADMIN |
| PUT | `/admin/listings/:id/approve` | Approuver | ADMIN |
| PUT | `/admin/listings/:id/reject` | Rejeter | ADMIN |
| GET | `/admin/users` | Gestion utilisateurs | ADMIN |
| PUT | `/admin/users/:id/status` | Modifier statut | ADMIN |

## 🔌 WebSocket (Socket.IO)

### Événements Côté Client
```javascript
// Connexion
const socket = io('http://localhost:3000', {
  auth: { token: 'votre_jwt_token' }
});

// Rejoindre une conversation
socket.emit('join_conversation', conversationId);

// Envoyer un message
socket.emit('send_message', {
  conversationId: 'uuid',
  content: 'Message text',
  attachmentUrl: 'optional'
});

// Indicateurs de frappe
socket.emit('typing_start', { conversationId });
socket.emit('typing_stop', { conversationId });
```

### Événements Côté Serveur
```javascript
// Nouveau message reçu
socket.on('new_message', (message) => {
  console.log('Nouveau message:', message);
});

// Notification
socket.on('new_notification', (notification) => {
  console.log('Notification:', notification);
});

// Utilisateur en train de taper
socket.on('user_typing', (data) => {
  console.log(`${data.firstName} tape...`);
});

// Statut utilisateur
socket.on('user_online', ({ userId }) => {
  console.log(`Utilisateur ${userId} en ligne`);
});
```

## 🔒 Sécurité

### Authentification
- **JWT** avec expiration configurable
- **Refresh tokens** pour sessions longues
- **Rate limiting** sur les endpoints d'auth

### Autorisation
- **RBAC** (Role-Based Access Control)
- **Rôles** : USER, SELLER, ADMIN
- **Middleware** de vérification de permissions

### Protection des Données
- **Validation** stricte avec express-validator
- **Sanitisation** des entrées utilisateur
- **Protection XSS/CSRF**
- **Headers de sécurité** avec Helmet

### Rate Limiting
```javascript
// Basique : 100 req/15min
// Auth : 5 req/15min  
// Upload : 50 req/heure
```

## 🚀 Déploiement

### Render.com
1. Connectez votre repo GitHub
2. Configurez les variables d'environnement
3. Le build se fait automatiquement

### Vercel
```bash
npm i -g vercel
vercel
```

### Variables d'Environnement Requises
- `DATABASE_URL` - Connexion PostgreSQL
- `JWT_SECRET` - Secret JWT
- `CLOUDINARY_*` - Credentials Cloudinary
- `STRIPE_SECRET_KEY` - Clé Stripe
- `SMTP_*` - Configuration email

### Script de Déploiement
```bash
npm run deploy
# ou avec seeds
npm run deploy -- --seed
```

## 🔗 Connexion Frontend

### Installation côté frontend
```bash
npm install axios socket.io-client
```

### Configuration API Client
```javascript
// api/client.js
import axios from 'axios';

const API_BASE_URL = 'https://votre-backend.com/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour JWT
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

### Service d'Authentification
```javascript
// services/authService.js
import apiClient from '../api/client';

export const authService = {
  async login(email, password) {
    const response = await apiClient.post('/auth/login', { email, password });
    localStorage.setItem('token', response.data.token);
    return response.data;
  },

  async register(userData) {
    const response = await apiClient.post('/auth/register', userData);
    localStorage.setItem('token', response.data.token);
    return response.data;
  },

  async getCurrentUser() {
    return await apiClient.get('/auth/me');
  },

  logout() {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
};
```

### Service de Listings
```javascript
// services/listingService.js
import apiClient from '../api/client';

export const listingService = {
  async getListings(filters = {}) {
    const params = new URLSearchParams(filters);
    return await apiClient.get(`/listings?${params}`);
  },

  async createListing(listingData) {
    return await apiClient.post('/listings', listingData);
  },

  async getListing(id) {
    return await apiClient.get(`/listings/${id}`);
  },

  async updateListing(id, data) {
    return await apiClient.put(`/listings/${id}`, data);
  }
};
```

### Contexte Authentification React
```javascript
// contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authService.getCurrentUser()
        .then(response => setUser(response.data.user))
        .catch(() => authService.logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const response = await authService.login(email, password);
    setUser(response.user);
    return response;
  };

  const register = async (userData) => {
    const response = await authService.register(userData);
    setUser(response.user);
    return response;
  };

  const logout = () => {
    setUser(null);
    authService.logout();
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Hook de Socket.IO
```javascript
// hooks/useSocket.js
import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

export const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token');
      const newSocket = io('https://votre-backend.com', {
        auth: { token }
      });

      setSocket(newSocket);

      return () => newSocket.close();
    }
  }, [user]);

  return socket;
};
```

## 📈 Monitoring et Logs

### Logs Structure
```javascript
// Chaque log contient :
{
  timestamp: '2024-01-15T10:30:00Z',
  level: 'info|warn|error',
  message: 'Description',
  userId: 'uuid',
  ip: '192.168.1.1',
  userAgent: 'Browser info',
  endpoint: '/api/listings',
  method: 'POST',
  responseTime: 150
}
```

### Métriques Importantes
- Temps de réponse API
- Taux d'erreur par endpoint
- Nombre d'utilisateurs actifs
- Volumes de transactions
- Performance base de données

## 🧪 Tests

### Tests Unitaires
```bash
npm test
```

### Tests d'Intégration
```javascript
// tests/auth.test.js
const request = require('supertest');
const app = require('../server');

describe('Auth Endpoints', () => {
  test('POST /api/auth/register', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'password123'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.token).toBeDefined();
  });
});
```

## 🐛 Debugging

### Logs de Debug
```javascript
// Variables d'environnement pour debugging
DEBUG=benome:*
LOG_LEVEL=debug
```

### Common Issues
1. **Erreur de connexion DB** - Vérifiez DATABASE_URL
2. **JWT Invalid** - Vérifiez JWT_SECRET
3. **CORS Errors** - Configurez FRONTEND_URL
4. **Upload Fails** - Vérifiez credentials Cloudinary

## 📚 Documentation API Complète

Une documentation Swagger/OpenAPI est disponible à :
```
GET /api
```

## 🤝 Contribution

1. Fork le projet
2. Créez une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push sur la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📞 Support

- **Email** : support@benome.com
- **Documentation** : https://docs.benome.com
- **Issues** : GitHub Issues

## 📜 Licence

Ce projet est sous licence MIT. Voir `LICENSE` pour plus de détails.

---

**Backend Version** : 1.0.0  
**Last Updated** : Janvier 2024  
**Maintainer** : Équipe Benome
