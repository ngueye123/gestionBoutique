# 📦 Gestion Boutique

Application complète de gestion de boutique développée avec Laravel (Backend) et React + TypeScript (Frontend). Cette solution permet de gérer les produits, les ventes, les employés, les clients et le suivi des dettes.

[![Laravel](https://img.shields.io/badge/Laravel-11.x-red.svg)](https://laravel.com)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 🌟 Fonctionnalités

### 👤 Gestion des utilisateurs
- **Inscription et connexion sécurisées** avec vérification par email
- **Système multi-rôles** : Patron, Admin, Vendeur, Caissier
- **Authentification JWT** avec refresh token automatique
- Réinitialisation du mot de passe par email

### 📦 Gestion des produits
- CRUD complet des produits (référence, nom, prix, stock, catégorie)
- **Alertes de stock minimum**
- Gestion des catégories
- Permissions par rôle pour la modification

### 🛒 Point de vente (POS)
- Interface intuitive pour les ventes rapides
- Support de plusieurs moyens de paiement : Espèces, Wave, Orange Money, Carte
- **Ventes à crédit** avec gestion des clients
- Calcul automatique de la monnaie à rendre
- Gestion du panier en temps réel

### 👥 Gestion des clients
- Création et modification de fiches clients
- **Suivi des dettes** en temps réel
- Historique complet des ventes à crédit
- **Enregistrement des remboursements**
- Recherche rapide par nom ou téléphone

### 💰 Gestion des remboursements
- Enregistrement des paiements partiels ou totaux
- Support de plusieurs moyens de paiement
- Notes et commentaires sur les remboursements
- Mise à jour automatique du solde client

### 📊 Tableau de bord
- Statistiques en temps réel
- Ventes par période (7 jours, mois, personnalisé)
- Top 5 des produits les plus vendus
- Alertes de stock faible
- Graphiques de ventes mensuelles

### 👨‍💼 Gestion des employés
- Création de comptes employés par le patron
- Attribution de rôles et permissions
- Modification des rôles en temps réel
- Suppression d'employés

## 🏗️ Architecture

### Backend (Laravel)
```
gestionBoutique-back/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── AuthController.php
│   │   │   ├── ClientController.php
│   │   │   ├── DashboardController.php
│   │   │   ├── EmployeController.php
│   │   │   ├── ProductController.php
│   │   │   ├── RemboursementController.php
│   │   │   ├── VenteController.php
│   │   │   └── RoleHelper.php (trait)
│   │   └── Middleware/
│   │       ├── JWTMiddleware.php
│   │       └── DashboardAccess.php
│   └── Models/
│       ├── Client.php
│       ├── Employe.php
│       ├── Product.php
│       ├── Remboursement.php
│       ├── Utilisateur.php
│       ├── Vente.php
│       └── VenteDetail.php
├── database/migrations/
└── routes/api.php
```

### Frontend (React + TypeScript)
```
gestionBoutique-front/
├── src/
│   ├── components/
│   │   ├── Layout.tsx
│   │   ├── RoleGuard.tsx
│   │   ├── PasswordInput.tsx
│   │   └── ResendVerification.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Products.tsx
│   │   ├── POS.tsx
│   │   ├── Clients.tsx
│   │   ├── ClientDetails.tsx
│   │   └── Employes.tsx
│   ├── store/
│   │   ├── authStore.ts
│   │   └── cartStore.ts
│   ├── lib/
│   │   └── fetchWithAuth.ts
│   └── types/
│       └── index.ts
```

## 🚀 Installation

### Prérequis
- PHP >= 8.2
- Composer
- Node.js >= 18.x
- MySQL ou MariaDB
- Un serveur SMTP pour l'envoi d'emails

### Backend (Laravel)

1. **Cloner le repository**
```bash
git clone https://github.com/votre-username/gestion-boutique.git
cd gestion-boutique/gestionBoutique-back
```

2. **Installer les dépendances**
```bash
composer install
```

3. **Configuration de l'environnement**
```bash
cp .env.example .env
php artisan key:generate
```

4. **Configurer la base de données** dans `.env`
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=database_name
DB_USERNAME=username
DB_PASSWORD=
```

5. **Configurer JWT** dans `.env`
```env
JWT_SECRET=votre_secret_jwt
JWT_TTL=43200  # 30 jours en minutes
```

6. **Configurer le SMTP** dans `.env`
```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=votre-email@gmail.com
MAIL_PASSWORD=votre-mot-de-passe
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=votre-email@gmail.com
MAIL_FROM_NAME="${APP_NAME}"
```

7. **Exécuter les migrations**
```bash
php artisan migrate
```

8. **Lancer le serveur**
```bash
php artisan serve
```

Le backend sera accessible sur `http://localhost:8000`

### Frontend (React)

1. **Naviguer vers le dossier frontend**
```bash
cd ../gestionBoutique-front
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer l'URL de l'API**
Créer un fichier `.env` :
```env
VITE_API_URL=http://localhost:8000/api
```

4. **Lancer le serveur de développement**
```bash
npm run dev
```

Le frontend sera accessible sur `http://localhost:5173`

## 🔑 Système de permissions

### Rôles et accès

| Fonctionnalité | Patron | Admin | Vendeur | Caissier |
|----------------|--------|-------|---------|----------|
| Dashboard | ✅ | ✅ | ❌ | ❌ |
| Voir produits | ✅ | ✅ | ✅ | ✅ |
| Gérer produits | ✅ | ✅ | ❌ | ❌ |
| Point de vente | ✅ | ✅ | ✅ | ✅ |
| Gérer clients | ✅ | ✅ | ✅ | ✅ |
| Gérer employés | ✅ | ❌ | ❌ | ❌ |
| Voir statistiques | ✅ | ✅ | ❌ | ❌ |

## 🔐 Sécurité

- **Authentification JWT** avec tokens de 30 jours
- **Refresh automatique** des tokens expirés
- **Vérification email** obligatoire pour les patrons
- **Hash bcrypt** pour les mots de passe
- **Protection CSRF** activée
- **Validation** stricte des données côté serveur
- **Guards séparés** pour patrons et employés

## 🛠️ Technologies utilisées

### Backend
- **Laravel 11.x** - Framework PHP
- **JWT-Auth** - Authentification par tokens
- **MySQL** - Base de données
- **Laravel Notifications** - Envoi d'emails

### Frontend
- **React 18** - Bibliothèque UI
- **TypeScript** - Typage statique
- **Vite** - Build tool
- **Zustand** - State management
- **React Router** - Navigation
- **React Hook Form** - Gestion des formulaires
- **Zod** - Validation
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Sonner** - Notifications toast

## 📝 Scripts disponibles

### Backend
```bash
php artisan serve          # Démarrer le serveur
php artisan migrate        # Exécuter les migrations
php artisan migrate:fresh  # Réinitialiser la BDD
php artisan config:cache   # Cache la configuration
```

### Frontend
```bash
npm run dev       # Mode développement
npm run build     # Build de production
npm run preview   # Prévisualiser le build
npm run lint      # Linter le code
```

- Email : votre-email@exemple.com

---

⭐ N'oubliez pas de mettre une étoile si ce projet vous a aidé !
