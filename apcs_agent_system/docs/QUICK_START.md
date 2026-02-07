# 🚀 Guide de Démarrage Rapide - Intégration Complète

Ce guide explique comment démarrer les **2 backends** (frontend TypeScript + API agents Python) ensemble.

---

## 📋 Prérequis

- **Node.js 18+** et **npm**
- **Python 3.11+**
- **Docker Desktop** (démarré)
- **UV** (gestionnaire Python)
- **PostgreSQL** (via Docker)

---

## 🔧 Installation

### Étape 1 : Démarrer PostgreSQL

```powershell
# À la racine du projet apcs_agent_system
docker-compose up -d

# Vérifier que PostgreSQL tourne
docker ps | Select-String "microhack-db"
```

### Étape 2 : Initialiser la base de données

```powershell
# Créer le schéma
Get-Content db\schema.sql | docker exec -i microhack-db psql -U microhack -d collaboration_platform

# Insérer les données de test
Get-Content db\seed.sql | docker exec -i microhack-db psql -U microhack -d collaboration_platform
```

---

## 🟢 Backend 1 : Frontend Backend (apcs_server)

Ce backend Node.js/TypeScript gère les utilisateurs, workspaces, sprints, et authentification.

### Installation

```powershell
cd apcs_server

# Installer les dépendances
npm install

# Configurer .env
Copy-Item .env.example .env
```

### Configuration .env

Éditer `apcs_server/.env` :

```env
# Database
DATABASE_URL="postgresql://microhack:securepassword@localhost:5432/collaboration_platform"

# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

### Générer Prisma Client

```powershell
npx prisma generate
```

### Démarrer le serveur

```powershell
npm run dev
```

**Le serveur démarre sur** : `http://localhost:3000`

### Tester

```powershell
# Health check
Invoke-WebRequest -Uri "http://localhost:3000/health" -Method GET
```

**Résultat attendu** :
```json
{
  "status": "success",
  "message": "Server is running correctly"
}
```

---

## 🟦 Backend 2 : API Agents (apcs_agent_system)

Ce backend Python/FastAPI gère les agents IA qui interagissent avec les utilisateurs.

### Installation

```powershell
cd apcs_agent_system

# Créer l'environnement virtuel
uv venv

# Activer le venv
.venv\Scripts\activate

# Installer les dépendances
uv pip install agno==1.8.4 fastapi uvicorn httpx psycopg[binary] psycopg-pool python-dotenv pyyaml
```

### Configuration .env

Le fichier `.env` est déjà configuré avec :

```env
# Backend Frontend (apcs_server)
EXTERNAL_BACKEND_URL=http://localhost:3000

# Database PostgreSQL (pour MCP servers)
POSTGRES_USER=microhack
POSTGRES_PASSWORD=securepassword
POSTGRES_DB=collaboration_platform
DATABASE_URL=postgresql://microhack:securepassword@localhost:5432/collaboration_platform

# Mistral API
MISTRAL_API_KEY=votre-clé-ici

# API Config
RUNTIME_ENV=dev
API_HOST=0.0.0.0
API_PORT=8000
```

### Démarrer le serveur

```powershell
uv run uvicorn api.main:app --reload --port 8000
```

**Le serveur démarre sur** : `http://localhost:8000`

### Tester

```powershell
# Health check
Invoke-WebRequest -Uri "http://localhost:8000/v1/health" -Method GET

# Playground
Start-Process "http://localhost:8000/playground"
```

---

## 🔗 Vérification de l'Intégration

### Test 1 : Les 2 backends tournent

```powershell
# Backend Frontend (apcs_server)
Invoke-WebRequest -Uri "http://localhost:3000/health" -Method GET

# Backend API (agents)
Invoke-WebRequest -Uri "http://localhost:8000/v1/health" -Method GET
```

Les deux doivent retourner `200 OK`.

### Test 2 : Context API appelle apcs_server

```powershell
# Tester que le backend API peut appeler le backend frontend
Invoke-WebRequest -Uri "http://localhost:8000/context/current-user" -Method GET
```

**Note** : Cela nécessite un token JWT. Pour l'instant, le backend retournera une erreur d'authentification, c'est normal.

### Test 3 : Utiliser le Playground

1. Ouvrir **http://localhost:8000/playground**
2. Sélectionner **Administration Agent**
3. Taper : `"Bonjour, explique-moi la différence entre KANBAN et SCRUM"`

L'agent doit répondre avec une explication pédagogique.

---

## 📡 Workflow Complet

### Scénario : Créer un workspace et ajouter des tâches

#### 1. Créer un workspace KANBAN

**Agent** : Administration Agent

**Requête** :
```
Crée-moi un workspace Kanban appelé "Support Team"
```

**Ce qui se passe** :
- L'agent appelle `create_space` du MCP administration_mcp
- MCP insère dans PostgreSQL : `INSERT INTO spaces (name, methodology) VALUES ('Support Team', 'KANBAN')`
- Retourne : `{ spaceId: "uuid-123", name: "Support Team", methodology: "KANBAN" }`

#### 2. Ajouter un item au backlog

**Agent** : Workflow Agent

**Requête** :
```
Ajoute un item au backlog : "Répondre aux tickets urgents"
```

**Ce qui se passe** :
1. L'agent appelle `/context/current-user` → récupère `userId`
2. L'agent appelle `/context/default-workspace` → récupère `spaceId = "uuid-123"`
3. L'agent appelle `create_backlog_item` du MCP workflow_mcp
4. MCP insère : `INSERT INTO backlog_items (title, space_id, created_by_id) VALUES (...)`

#### 3. Créer une tâche

**Agent** : Workflow Agent

**Requête** :
```
Crée une tâche pour l'item #1 : "Prioriser les tickets par urgence"
```

**Ce qui se passe** :
1. L'agent récupère `spaceId` et `userId` via context
2. L'agent appelle `create_task` du MCP workflow_mcp
3. MCP insère : `INSERT INTO tasks (title, backlog_item_id, assignee_id) VALUES (...)`

#### 4. Afficher le Kanban board

**Agent** : Workflow Agent

**Requête** :
```
Affiche-moi le board Kanban
```

**Ce qui se passe** :
1. L'agent récupère `spaceId` via `/context/default-workspace`
2. L'agent appelle `get_kanban_board` du MCP workflow_mcp
3. MCP récupère toutes les colonnes et tâches de ce workspace
4. L'agent formate et affiche le board complet

---

## 🛑 Arrêter les Serveurs

```powershell
# Backend Frontend (apcs_server)
# Ctrl+C dans le terminal

# Backend API (agents)
# Ctrl+C dans le terminal

# PostgreSQL
docker-compose down
```

---

## 🐛 Dépannage

### Erreur : "Connection refused" sur port 3000

**Cause** : Le backend apcs_server n'est pas démarré

**Solution** :
```powershell
cd apcs_server
npm run dev
```

### Erreur : "Connection refused" sur port 5432

**Cause** : PostgreSQL n'est pas démarré

**Solution** :
```powershell
docker-compose up -d
docker ps  # Vérifier que microhack-db tourne
```

### Erreur : "502 Bad Gateway" dans context API

**Cause** : Le backend API ne peut pas joindre apcs_server

**Solution** :
1. Vérifier que apcs_server tourne : `http://localhost:3000/health`
2. Vérifier `EXTERNAL_BACKEND_URL=http://localhost:3000` dans `.env`

### Erreur : "Module not found: agno"

**Cause** : Dépendances Python non installées

**Solution** :
```powershell
cd apcs_agent_system
.venv\Scripts\activate
uv pip install agno==1.8.4 fastapi uvicorn httpx
```

---

## 📚 Documentation

- [README Principal](../README.md)
- [Intégration Backend Complète](./BACKEND_INTEGRATION.md)
- [MCP Workflow API](./MCP_WORKFLOW_API.md)
- [MCP Scrum Master API](./MCP_SCRUM_MASTER_API.md)
- [MCP Administration API](./MCP_ADMINISTRATION_API.md)
- [Tests Workflow Agent](./tests/Workflow_agent_tests.md)
- [Tests Scrum Master Agent](./tests/Scrum_master_agent_tests.md)
- [Tests Administration Agent](./tests/Administration_agent_tests.md)

---

## ✅ Checklist de Démarrage

- [ ] PostgreSQL démarré (`docker-compose up -d`)
- [ ] Base de données initialisée (schema.sql + seed.sql)
- [ ] Backend apcs_server démarré sur port 3000
- [ ] Backend API agents démarré sur port 8000
- [ ] Health checks passent pour les 2 backends
- [ ] Playground accessible sur http://localhost:8000/playground
- [ ] Variable `EXTERNAL_BACKEND_URL` configurée dans `.env`

**🎉 Tout fonctionne ? Vous pouvez maintenant utiliser les 3 agents !**
