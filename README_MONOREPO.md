# APCS - Agile Project Collaboration System

Système de collaboration de projet agile complet avec gestion de tâches, chat en temps réel, intégration Git et agents IA.

## 🏗️ Architecture du Mono-Repo

Ce repository contient trois sous-projets principaux :

### 📱 MicroHack (Frontend)
- **Technologie** : Next.js 16 (React 19) avec TypeScript
- **Port** : 3000
- **Features** : UI/UX, authentification, gestion de workspace, intégration temps réel

### 🔧 apcs_server (Backend)
- **Technologie** : Node.js/Express avec TypeScript  
- **Port** : 3001
- **Features** : API REST, Socket.IO, authentification JWT, intégration Firebase

### 🤖 apcs_agent_system (Agent System)
- **Technologie** : Python 3.12 avec FastAPI
- **Port** : 8000
- **Features** : Agents IA (Scrum Master, Administration, Workflow), intégration MCP

### 🗄️ db (Database)
- **Technologie** : PostgreSQL 16
- **Fichiers** : schema.sql, seed.sql pour initialisation automatique

## 🚀 Quick Start

### Prérequis
- Docker Desktop installé et en cours d'exécution
- Git

### Installation et Démarrage

```bash
# Cloner le repository
git clone <votre-repo-url>
cd apcss

# Créer le fichier .env à la racine (voir .env.example)
cp .env.example .env

# Lancer tous les services avec Docker Compose
docker-compose up -d --build

# Vérifier que tous les services sont démarrés
docker-compose ps
```

Le build initial prend ~5-10 minutes. Les services seront disponibles sur :
- Frontend : http://localhost:3000
- Backend API : http://localhost:3001
- Agent API : http://localhost:8000
- PostgreSQL : localhost:5432
- Redis : localhost:6379

### Compte SUPERADMIN par défaut

```
Email: admin@apcs.com
Mot de passe: password123
```

## 📝 Variables d'Environnement

Un fichier `.env` est requis à la racine du projet. **NE PAS** le commiter dans Git.

Variables principales :
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` : Credentials PostgreSQL
- `DATABASE_URL` : Connexion Prisma
- `JWT_SECRET` : Secret pour les tokens JWT
- `GITHUB_TOKEN` : Token pour intégration GitHub (optionnel)

Voir les fichiers `.env.example` dans chaque sous-projet pour la liste complète.

## 🛠️ Commandes Utiles

```bash
# Arrêter tous les services
docker-compose down

# Arrêter et supprimer les volumes (réinitialisation complète)
docker-compose down -v

# Rebuilt un service spécifique
docker-compose build backend
docker-compose up -d backend

# Voir les logs d'un service
docker logs apcs_backend
docker logs apcs_frontend
docker logs apcs_agent_api

# Accéder au psql
docker exec -it apcs_postgres psql -U apcs_user -d apcs_db
```

## 📚 Documentation

Consultez le dossier `docs/` pour :
- Architecture détaillée du système
- Documentation API (backend)
- Guide d'intégration IA
- Documentation MCP (Model Context Protocol)

## 🧪 Pour les Testeurs Hackathon

Sur Windows, utilisez le script fourni :

```bash
setup-database.bat
```

Ce script :
1. Arrête et nettoie tous les containers
2. Rebuild les images
3. Initialise la base de données avec le schema et les données de test
4. Démarre tous les services

## 📦 Structure du Projet

```
apcss/
├── MicroHack/           # Frontend Next.js
├── apcs_server/         # Backend Express
├── apcs_agent_system/   # Système d'agents Python
├── db/                  # Scripts SQL
├── docs/                # Documentation
├── docker-compose.yml   # Orchestration des services
├── setup-database.bat   # Script d'initialisation Windows
└── .gitignore          # Fichiers ignorés par Git
```

## 🔒 Sécurité

- ⚠️ Les fichiers `.env` contiennent des secrets et ne doivent **JAMAIS** être commités
- 🔑 Changez tous les mots de passe par défaut en production
- 🛡️ Les tokens JWT et secrets doivent être générés aléatoirement

## 👥 Contribution

Pour contribuer au projet :

1. Créer une branche feature : `git checkout -b feature/ma-fonctionnalite`
2. Commiter les changements : `git commit -m 'Ajout de ma fonctionnalité'`
3. Pusher la branche : `git push origin feature/ma-fonctionnalite`
4. Créer une Pull Request

## 📄 License

Projet académique - APCS Team 2026
