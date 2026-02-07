# APCS Agent System - Multi-Agent Collaboration Platform

Système multi-agent intelligent pour gérer vos workflows Kanban et Scrum avec une approche séparée par domaine.

## 🏗️ Architecture

### Composants Principaux

- **Agno 1.8.4** : Framework multi-agent avec Mistral Large
- **MCP (Model Context Protocol)** : 3 serveurs MCP spécialisés pour l'accès aux données
- **FastAPI** : API REST pour l'intégration backend externe
- **PostgreSQL 16** : Base de données relationnelle (utilisée par les MCP servers)
- **Backend Externe** : Plateforme de collaboration (appels HTTP via proxy)

### 🤖 Les 3 Agents Spécialisés

Ce système utilise une **architecture par domaine** avec 3 agents autonomes :

#### 1. **Administration Agent** (Workspaces & Méthodologies)
- **Rôle** : Créer et gérer les workspaces (KANBAN ou SCRUM)
- **MCP Server** : `mcps/administration_mcp.py` (3 outils)
- **Utilisation** : Point d'entrée pour créer un nouveau workspace
- **Documentation** : [MCP Administration API](docs/MCP_ADMINISTRATION_API.md)
- **Tests** : [Administration Agent Tests](docs/tests/Administration_agent_tests.md)

**Outils disponibles** :
- `create_space` : Créer un workspace KANBAN ou SCRUM
- `get_user_spaces` : Lister tous les workspaces de l'utilisateur
- `get_space_info` : Obtenir les détails d'un workspace

#### 2. **Workflow Agent** (Kanban & Tasks)
- **Rôle** : Gérer le Product Backlog et les boards Kanban
- **MCP Server** : `mcps/workflow_mcp.py` (9 outils)
- **Utilisation** : Pour les workspaces KANBAN (flux continu)
- **Documentation** : [MCP Workflow API](docs/MCP_WORKFLOW_API.md)
- **Tests** : [Workflow Agent Tests](docs/tests/Workflow_agent_tests.md)

**Outils disponibles** :
- Product Backlog : `create_backlog_item`, `get_backlog`, `update_backlog_item`
- Tasks : `create_task`, `move_task`, `assign_task`
- Kanban : `create_column`, `get_kanban_board`, `get_column_tasks`

#### 3. **Scrum Master Agent** (Sprints & Story Points)
- **Rôle** : Gérer les sprints et le Sprint Backlog
- **MCP Server** : `mcps/scrum_master_mcp.py` (5 outils)
- **Utilisation** : Pour les workspaces SCRUM (itérations fixes)
- **Documentation** : [MCP Scrum Master API](docs/MCP_SCRUM_MASTER_API.md)
- **Tests** : [Scrum Master Agent Tests](docs/tests/Scrum_master_agent_tests.md)

**Outils disponibles** :
- Sprints : `create_sprint`, `start_sprint`, `complete_sprint`
- Sprint Backlog : `add_to_sprint_backlog`, `get_sprint_backlog`

### 🔄 Flux de Travail Recommandé

```
1. Administration Agent
   └─> Créer un workspace (KANBAN ou SCRUM)
       │
       ├─> KANBAN choisie?
       │   └─> Utiliser Workflow Agent
       │       └─> Backlog → Tasks → Colonnes Kanban
       │
       └─> SCRUM choisie?
           └─> Utiliser Scrum Master Agent + Workflow Agent
               └─> Backlog → Sprint Planning → Sprint Execution → Review/Retro
```

### 🌐 Intégration Backend Externe

Les agents ne communiquent **PAS directement avec la base de données**. Ils utilisent une **couche proxy HTTP** pour appeler le backend de la plateforme de collaboration externe.

**Configuration** :
```env
EXTERNAL_BACKEND_URL=http://localhost:3000  # URL du backend externe
```

**API Context (Proxy Layer)** : `api/routes/context.py`

Les 7 endpoints de contexte automatique font des appels HTTP vers le backend :
- `/current-user` → `GET /api/users/current`
- `/default-workspace` → `GET /api/workspaces/default`
- `/active-sprint` → `GET /api/sprints/active`
- `/workspace-metadata` → `GET /api/workspaces/{id}/metadata`
- `/available-users` → `GET /api/users`
- `/column-by-name` → `GET /api/columns/by-name`

Cette architecture permet de **découpler les agents** du backend et de travailler avec n'importe quelle plateforme qui implémente le contrat API.


## 📊 Modèle de Données

Schéma relationnel avec **8 tables** supportant KANBAN et SCRUM :

### Tables Principales

- **users** : Utilisateurs du système
- **spaces** : Workspaces avec méthodologie (KANBAN ou SCRUM)
- **space_members** : Membres avec rôles Scrum optionnels (Product Owner, Scrum Master, Developer)
- **backlog_items** : Product Backlog global (user stories)
- **sprints** : Sprints Scrum avec dates, objectifs, et statuts (PLANNING, ACTIVE, COMPLETED)
- **sprint_backlog_items** : Items planifiés pour un sprint avec story points
- **tasks** : Tâches techniques liées au Product ou Sprint Backlog
- **columns** : Colonnes Kanban personnalisables avec limites WIP
- **columns_tasks** : Relation tâches ↔ colonnes (drag & drop)

### Méthodologies Supportées

**KANBAN** (Workflow Agent) :
- Product Backlog → Tasks → Colonnes personnalisables
- Limites WIP (Work In Progress) par colonne
- Flux continu sans sprints
- Visualisation complète du board

**SCRUM** (Scrum Master + Workflow Agents) :
- Product Backlog → Sprint Planning → Sprint Backlog (avec story points) → Tasks
- Rôles : Product Owner, Scrum Master, Developer
- Sprints avec dates début/fin et objectifs
- Cycle : PLANNING → ACTIVE → COMPLETED
- Cérémonies : Daily, Review, Retrospective

**Utilisation des MCP Servers** :
- Les **MCP servers** (administration_mcp, workflow_mcp, scrum_master_mcp) communiquent directement avec PostgreSQL
- Les **agents** utilisent les MCP servers via MCPTools
- La **couche proxy context** appelle le backend externe en HTTP (pas d'accès DB direct)



## 🚀 Installation et Démarrage

### Prérequis

- **Python 3.11+**
- **Node.js 18+** et **npm** (pour le backend frontend apcs_server)
- **Docker Desktop** (démarré)
- **UV** (gestionnaire de packages Python)
- **Compte OpenAI** (pour Mistral via OpenAI-compatible API)

### Guide de Démarrage Rapide

**Pour démarrer l'ensemble du système (2 backends)** : Voir [**Guide de Démarrage Rapide**](docs/QUICK_START.md)

**Pour comprendre l'intégration backend** : Voir [**Intégration Backend**](docs/BACKEND_INTEGRATION.md)

### Installation Backend API Agents (Rapide)

### 1. Créer l'environnement virtuel

```powershell
# Créer le venv
uv venv

# Activer le venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac

# Installer les dépendances principales
uv pip install agno==1.8.4 fastapi uvicorn httpx psycopg[binary] psycopg-pool python-dotenv pyyaml
```

### 2. Variables d'environnement

Créer `.env` à la racine :

```env
# Backend Externe (Plateforme de collaboration)
EXTERNAL_BACKEND_URL=http://localhost:3000

# Base de données PostgreSQL (pour MCP servers)
POSTGRES_USER=microhack
POSTGRES_PASSWORD=securepassword
POSTGRES_DB=collaboration_platform
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}

# OpenAI (Mistral Large via API OpenAI-compatible)
OPENAI_API_KEY=sk-votre-clé-ici
OPENAI_MODEL=mistral-large-latest

# API FastAPI
RUNTIME_ENV=dev
API_HOST=0.0.0.0
API_PORT=8000
```

### 3. Lancer PostgreSQL

```powershell
# Démarrer PostgreSQL avec Docker Compose
docker-compose up -d

# Vérifier que le container est démarré
docker ps
# Devrait afficher: microhack-db sur le port 5432
```

### 4. Initialiser la base de données

```powershell
# Créer le schéma (tables, enums, indexes)
Get-Content db\schema.sql | docker exec -i microhack-db psql -U microhack -d collaboration_platform

# Insérer les données de test
Get-Content db\seed.sql | docker exec -i microhack-db psql -U microhack -d collaboration_platform

# Vérifier les données
docker exec microhack-db psql -U microhack -d collaboration_platform -c "SELECT COUNT(*) FROM users;"
# Devrait afficher: 4
```

### 5. Lancer l'API Agno (localement)

```powershell
# Activer le venv si pas déjà fait
.venv\Scripts\activate

# Démarrer l'API avec reload automatique
uv run uvicorn api.main:app --reload --port 8000

# L'API sera disponible sur:
# - Playground: http://localhost:8000/playground
# - Docs: http://localhost:8000/docs
# - Health: http://localhost:8000/v1/health
```

### 6. Tester les Agents dans le Playground

Ouvrir **http://localhost:8000/playground** et choisir un agent :

#### Administration Agent (créer un workspace)
```
Bonjour, je veux créer un workspace Kanban pour mon équipe Support
```

```
Crée-moi un workspace Scrum "Product Team" avec des sprints de 2 semaines
```

#### Workflow Agent (Kanban)
```
Affiche-moi le board Kanban du workspace actuel
```

```
Ajoute un item au backlog : "Implémenter système de notifications"
```

```
Crée une tâche pour l'item #2 : "Écrire les tests unitaires"
```

#### Scrum Master Agent (Sprints)
```
Crée un sprint "Sprint 1 - MVP" de 2 semaines à partir d'aujourd'hui
```

```
Ajoute l'item #3 au Sprint Backlog avec 5 story points
```

```
Démarre le sprint actuel
```

**📚 Documentation complète :**
- [Administration MCP API](docs/MCP_ADMINISTRATION_API.md) - 3 outils admin
- [Workflow MCP API](docs/MCP_WORKFLOW_API.md) - 9 outils Kanban
- [Scrum Master MCP API](docs/MCP_SCRUM_MASTER_API.md) - 5 outils Scrum

**🧪 Fichiers de tests playground :**
- [Administration Agent Tests](docs/tests/Administration_agent_tests.md)
- [Workflow Agent Tests](docs/tests/Workflow_agent_tests.md)
- [Scrum Master Agent Tests](docs/tests/Scrum_master_agent_tests.md)



## 🛑 Arrêter le Système

```powershell
# Arrêter l'API Agno (Ctrl+C dans le terminal)

# Arrêter PostgreSQL
docker-compose down

# Arrêter PostgreSQL et supprimer les données
docker-compose down -v
```

## 📦 Workflow de Développement

### Développement Local (Recommandé)

Cette approche est **optimale pour le développement** car:
- ✅ **Hot reload instantané** des agents et de l'API
- ✅ **Debugging facile** avec breakpoints Python
- ✅ **Performance maximale** (pas d'overhead Docker)
- ✅ **MCP servers** communiquent directement avec PostgreSQL

```powershell
# 1. Démarrer uniquement PostgreSQL
docker-compose up -d

# 2. Lancer l'API Agno localement avec UV
uv run uvicorn api.main:app --reload --port 8000

# 3. Accéder au playground
# http://localhost:8000/playground
```

### Production / CI/CD

Pour la **production et le CI/CD**, utiliser le `Dockerfile` :

```bash
# Build l'image Docker
docker build -t apcs-agent-api:prd .

# Ou avec docker-compose (décommenter le service api)
docker-compose up --build
```

## 📁 Structure du Projet

```
apcs_agent_system/
├── agents/                      # 🤖 Les 3 agents spécialisés
│   ├── workflow_agent.py        # Agent Kanban (9 outils)
│   ├── scrum_master_agent.py    # Agent Scrum (5 outils)
│   └── administration_agent.py  # Agent Admin (3 outils)
│
├── mcps/                        # 🔧 MCP Servers (DB access)
│   ├── workflow_mcp.py          # 9 outils Kanban
│   ├── scrum_master_mcp.py      # 5 outils Scrum
│   └── administration_mcp.py    # 3 outils Admin
│
├── api/
│   ├── routes/
│   │   ├── context.py           # 🌐 Proxy HTTP vers backend externe
│   │   ├── playground.py        # Agno playground pour tests
│   │   ├── agents.py            # Routes agents
│   │   ├── teams.py             # Routes teams
│   │   └── status.py            # Health checks
│   └── main.py                  # FastAPI app
│
├── db/
│   ├── tables/                  # Modèles Python (dataclasses)
│   │   ├── user.py
│   │   ├── space.py
│   │   ├── backlog_item.py
│   │   ├── sprint.py
│   │   ├── sprint_backlog_item.py
│   │   ├── task.py
│   │   └── column.py
│   ├── schema.sql               # Schéma PostgreSQL complet
│   ├── seed.sql                 # Données de test
│   └── connection.py            # Singleton DB avec connexion persistante
│
├── docs/
│   ├── MCP_WORKFLOW_API.md      # 📚 Doc des 9 outils Kanban
│   ├── MCP_SCRUM_MASTER_API.md  # 📚 Doc des 5 outils Scrum
│   ├── MCP_ADMINISTRATION_API.md# 📚 Doc des 3 outils Admin
│   └── tests/                   # 🧪 Tests playground par agent
│       ├── Workflow_agent_tests.md
│       ├── Scrum_master_agent_tests.md
│       └── Administration_agent_tests.md
│
├── teams/                       # Multi-agent teams (à implémenter)
├── utils/                       # Logging, dates, etc.
├── workspace/                   # Configuration Docker & secrets
│   ├── dev_resources.py
│   ├── prd_resources.py
│   └── secrets/                 # API keys et secrets
└── scripts/                     # Scripts bash/powershell
```


## 🔧 Base de Données

### Architecture

- **PostgreSQL 16** : Utilisé uniquement par les **MCP servers** (administration_mcp, workflow_mcp, scrum_master_mcp)
- **HTTP Proxy** : Les routes context appellent le **backend externe** via HTTP (pas d'accès DB direct)
- **Singleton Pattern** : Connexion persistante unique pour les MCP servers

### Utilisation dans les MCP Servers

```python
from db.connection import execute_query, execute_one, execute_write

# Récupérer des données (dict)
users = await execute_query("SELECT * FROM users")

# Récupérer un seul résultat
user = await execute_one("SELECT * FROM users WHERE id = %s", (user_id,))

# Insert/Update avec RETURNING
user_id = await execute_write(
    "INSERT INTO users (email, name, password_hash) VALUES (%s, %s, %s) RETURNING id",
    (email, name, password_hash)
)
```

### Fonctionnalités Clés

- **Fetch associatif** : Tous les résultats retournés en `dict` (pas de tuples)
- **Connexion unique** : Pas de pool, une seule connexion réutilisée
- **Transactions automatiques** : Commit/rollback géré par le singleton

### API Context (Proxy HTTP)

Les endpoints context dans `api/routes/context.py` **NE TOUCHENT PAS** à PostgreSQL. Ils font des appels HTTP au backend externe :

```python
import httpx

EXTERNAL_BACKEND_URL = os.getenv("EXTERNAL_BACKEND_URL", "http://localhost:3000")

@router.get("/current-user")
async def get_current_user():
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(f"{EXTERNAL_BACKEND_URL}/api/users/current")
        response.raise_for_status()
        return response.json()
```

**Backend externe attendu** (API contract) :
- `GET /api/users/current` : Utilisateur courant
- `GET /api/workspaces/default?user_id=&methodology=` : Workspace par défaut
- `GET /api/sprints/active?space_id=` : Sprint actif
- `GET /api/workspaces/{space_id}/metadata` : Métadonnées du workspace
- `GET /api/users?space_id=` : Utilisateurs du workspace
- `GET /api/columns/by-name?name=&space_id=` : Colonne par nom

Cela permet de **découpler** les agents de l'implémentation du backend et de travailler avec **n'importe quelle plateforme** de collaboration.

## 📚 Documentation et Tests

### Documentation API MCP

Chaque MCP server est documenté avec tous les outils disponibles :

- **[MCP Administration API](docs/MCP_ADMINISTRATION_API.md)** : 3 outils pour gérer les workspaces
  - `create_space`, `get_user_spaces`, `get_space_info`
  - Guide KANBAN vs SCRUM

- **[MCP Workflow API](docs/MCP_WORKFLOW_API.md)** : 9 outils pour Kanban
  - Product Backlog : `create_backlog_item`, `get_backlog`, `update_backlog_item`
  - Tasks : `create_task`, `move_task`, `assign_task`
  - Colonnes : `create_column`, `get_kanban_board`, `get_column_tasks`

- **[MCP Scrum Master API](docs/MCP_SCRUM_MASTER_API.md)** : 5 outils pour Scrum
  - Sprints : `create_sprint`, `start_sprint`, `complete_sprint`
  - Sprint Backlog : `add_to_sprint_backlog`, `get_sprint_backlog`

### Tests Playground

Fichiers de tests avec requêtes prêtes à copier/coller dans le playground :

- **[Administration Agent Tests](docs/tests/Administration_agent_tests.md)**
  - Tests de création de workspaces KANBAN et SCRUM
  - Comparaison des méthodologies
  - Scénario complet multi-workspaces

- **[Workflow Agent Tests](docs/tests/Workflow_agent_tests.md)**
  - 9 outils × 3 requêtes test chacun
  - Scénario complet en 4 phases (16 étapes)
  - Debug et vérification

- **[Scrum Master Agent Tests](docs/tests/Scrum_master_agent_tests.md)**
  - Tests de gestion des sprints
  - Sprint Planning → Execution → Review
  - Story points et vélocité

## 🎯 Quand Utiliser Quel Agent ?

### Vous voulez créer un workspace ?
→ **Administration Agent**
```
"Crée-moi un workspace Kanban pour mon équipe Marketing"
"Je veux un workspace Scrum avec des sprints de 2 semaines"
```

### Vous avez un workspace KANBAN ?
→ **Workflow Agent**
```
"Affiche le board Kanban"
"Ajoute un item au backlog : Nouvelle fonctionnalité X"
"Déplace la tâche #5 dans la colonne 'En cours'"
```

### Vous avez un workspace SCRUM ?
→ **Scrum Master Agent** + **Workflow Agent**

**Scrum Master Agent** pour :
```
"Crée un sprint de 2 semaines"
"Ajoute l'item #3 au Sprint Backlog avec 5 story points"
"Démarre le sprint"
"Quelle est notre vélocité ?"
```

**Workflow Agent** pour :
```
"Ajoute un item au Product Backlog"
"Crée une tâche pour l'item #2"
"Affiche le Kanban board du sprint"
```

## 🛠️ Développement

### Lancer les tests

```bash
./scripts/test.sh
```

### Formater le code

```bash
./scripts/format.sh
```

### Valider la qualité

```bash
./scripts/validate.sh
```

## 🚀 Roadmap

### ✅ Complété (Version 1.0)
- [x] Architecture multi-agent par domaine (3 agents)
- [x] MCP Servers séparés (administration, workflow, scrum_master)
- [x] Intégration backend externe via proxy HTTP
- [x] Auto-context intelligent (récupération automatique de contexte)
- [x] Documentation complète des 17 outils MCP
- [x] Fichiers de tests playground par agent
- [x] Support KANBAN et SCRUM

### 🔄 En cours
- [ ] Teams multi-agents (coordinateurs)
- [ ] Workflows automatisés (blog_post_generator, investment_report_generator)
- [ ] Interface utilisateur (optionnel)

### 📋 Prochaines Étapes
- [ ] Message Agent (notifications et communication)
- [ ] Document Agent (gestion de documentation)
- [ ] Coordinator Agent (routage intelligent)
- [ ] Analytics Agent (métriques et rapports)
- [ ] API REST CRUD complète

## 📝 Contribuer

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/amazing-feature`)
3. Commit les changements (`git commit -m 'Add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

## 📄 Licence

MIT

