# 📚 Documentation MCP Workflow API

**Version:** 2.0  
**Protocole:** Model Context Protocol (MCP)  
**Transport:** stdio  
**Base de données:** PostgreSQL  
**Domaine:** Méthodologie Kanban uniquement

---

## 🎯 Vue d'ensemble

Le MCP Workflow expose **9 outils** pour gérer des workflows Kanban. Les outils sont organisés en 3 catégories :

1. **Product Backlog** - 3 outils
2. **Tasks** - 3 outils
3. **Colonnes Kanban** - 3 outils

> **Note:** Ce MCP est dédié uniquement à la méthodologie **KANBAN**. Les outils d'administration (Workspaces) sont dans `administration_mcp.py` et les outils Scrum sont dans `scrum_master_mcp.py`.

---

## 🗂️ Catégories d'outils

### 1️⃣ Product Backlog

#### `create_backlog_item`
Créer un item dans le Product Backlog (user story).

**Paramètres requis:**
- `title` (string) - Titre de l'item

**Paramètres optionnels (auto-récupérés via API):**
- `space_id` (string) - ID du workspace (défaut: space_dev via `/v1/context/default-workspace`)
- `created_by_id` (string) - ID du créateur (défaut: user courant via `/v1/context/current-user`)
- `description` (string) - Description détaillée
- `assignee_id` (string) - ID de l'assigné

**Retour:**
```
✅ Item créé dans le Product Backlog : #42 - Implémenter authentification OAuth (workspace: space_dev)
```

**Dépendances:** Aucune (tout est auto-récupéré)

**Intégration HTTP:** 
- Appelle `/v1/context/default-workspace` si space_id non fourni
- Appelle `/v1/context/current-user` si created_by_id non fourni

---

#### `get_backlog`
Récupérer le Product Backlog complet d'un workspace.

**Paramètres optionnels:**
- `space_id` (string) - ID du workspace (défaut: space_dev via `/v1/context/default-workspace`)

**Retour:**
```
📋 Product Backlog (12 items):
#1 - Authentification OAuth → Alice
#2 - Dashboard analytics
#3 - Notifications push → Bob
...
```

**Dépendances:** Aucune (space_id auto-récupéré)

**Intégration HTTP:** Appelle `/v1/context/default-workspace` si space_id non fourni

---

#### `update_backlog_item`
Mettre à jour un item du backlog.

**Paramètres requis:**
- `item_id` (string) - ID de l'item ⚠️ **ITEM_ID requis**

**Paramètres optionnels:**
- `title` (string) - Nouveau titre
- `description` (string) - Nouvelle description
- `assignee_id` (string) - Nouvel assigné
- `position` (integer) - Nouvelle position

**Retour:**
```
✅ Item #42 mis à jour
```

**Dépendances:** Requiert `item_id` (via `get_backlog`)

---

### 2️⃣ Tasks

#### `create_task`
Créer une nouvelle tâche liée à un item du backlog (KANBAN).

**Paramètres requis:**
- `backlog_item_id` (string) - ID de l'item du backlog ⚠️ **BACKLOG_ITEM_ID requis**

**Paramètres optionnels:**
- `assignee_id` (string) - ID de l'assigné

**Retour:**
```
✅ Tâche créée (ID: task_abc123)
```

**Dépendances:** Requiert `backlog_item_id` (via `get_backlog`)

---

#### `move_task`
Déplacer une tâche vers une colonne kanban (drag & drop).

**Paramètres requis:**
- `task_id` (string) - ID de la tâche ⚠️ **TASK_ID requis**
- `column_id` (string) - ID de la colonne destination ⚠️ **COLUMN_ID requis**

**Paramètres optionnels:**
- `position` (integer) - Position dans la colonne (défaut: 0)

**Retour:**
```
✅ Tâche déplacée vers la colonne col_inprogress
```

**Dépendances:** 
- Requiert `task_id` (via `get_kanban_board` ou `get_column_tasks`)
- Requiert `column_id` (via `get_kanban_board`)

---

#### `assign_task`
Assigner une tâche à un utilisateur.

**Paramètres requis:**
- `task_id` (string) - ID de la tâche ⚠️ **TASK_ID requis**
- `assignee_id` (string) - ID de l'utilisateur ⚠️ **USER_ID requis**

**Retour:**
```
✅ Tâche assignée à user_bob
```

**Dépendances:** Requiert `task_id` et `assignee_id`

---

### 3️⃣ Colonnes Kanban

#### `create_column`
Créer une colonne kanban pour un workspace KANBAN.

**Paramètres requis:**
- `name` (string) - Nom de la colonne

**Paramètres optionnels:**
- `space_id` (string) - ID du workspace (défaut: space_dev via `/v1/context/default-workspace`)
- `position` (integer) - Position de la colonne
- `wip_limit` (integer) - Limite WIP (Work In Progress)

**Retour:**
```
✅ Colonne 'Tests' créée (ID: col_xyz789) dans workspace space_dev
```

**Dépendances:** Aucune (space_id auto-récupéré)

**Intégration HTTP:** Appelle `/v1/context/default-workspace` si space_id non fourni

---

#### `get_kanban_board`
Récupérer le board kanban complet d'un workspace.

**Paramètres optionnels:**
- `space_id` (string) - ID du workspace (défaut: space_dev via `/v1/context/default-workspace`)

**Retour:**
```
📊 Board Kanban:

🔹 À faire (3 tâches)
  - #1: Créer page de connexion
  - #2: Dashboard analytics
  - #3: Notifications push

🔹 En cours (WIP: 3) (2 tâches)
  - #4: Refactoring API
  - #5: Tests unitaires
```

**Dépendances:** Aucune (space_id auto-récupéré)

**Intégration HTTP:** Appelle `/v1/context/default-workspace` si space_id non fourni

---

#### `get_column_tasks`
Récupérer toutes les tâches d'une colonne.

**Paramètres requis:**
- `column_id` (string) - ID de la colonne ⚠️ **COLUMN_ID requis**

**Retour:**
```
📋 Colonne 'En cours' (2 tâches):
- #4: Refactoring API
- #5: Tests unitaires
```

**Dépendances:** Requiert `column_id` (via `get_kanban_board`)

---

## 📊 Graphe de dépendances

```
[USER QUERY]
     |
     v
get_backlog() ──> create_backlog_item()
     |                    |
     v                    v
update_backlog_item()  create_task() ──> assign_task()
                           |                   |
                           v                   v
                    get_kanban_board() ──> move_task()
                           |
                           v
                    create_column()
                           |
                           v
                    get_column_tasks()
```

---

## 📋 Tableau récapitulatif des IDs requis

| Outil | space_id | user_id | item_id | task_id | column_id |
|-------|----------|---------|---------|---------|-----------|
| `create_backlog_item` | ⚡ auto | ⚡ auto | - | - | - |
| `get_backlog` | ⚡ auto | - | - | - | - |
| `update_backlog_item` | - | - | ✅ | - | - |
| `create_task` | - | - | ✅ (backlog) | - | - |
| `move_task` | - | - | - | ✅ | ✅ |
| `assign_task` | - | ✅ | - | ✅ | - |
| `create_column` | ⚡ auto | - | - | - | - |
| `get_kanban_board` | ⚡ auto | - | - | - | - |
| `get_column_tasks` | - | - | - | - | ✅ |

**Légende:**
- ✅ Requis manuellement
- ⚡ Auto-récupéré via API (endpoints `/v1/context/*`)
- `-` Non requis

---

## 🌐 Endpoints d'auto-contexte

Le MCP Workflow utilise des endpoints HTTP pour récupérer automatiquement les informations de contexte :

### `/v1/context/default-workspace`
Retourne le workspace par défaut (space_dev ou le premier workspace de l'utilisateur).

**Réponse:**
```json
{
  "space_id": "space_dev",
  "name": "Développement",
  "methodology": "KANBAN",
  "owner_id": "user_alice"
}
```

### `/v1/context/current-user`
Retourne l'utilisateur courant (premier utilisateur en DB pour démo).

**Réponse:**
```json
{
  "user_id": "user_alice",
  "name": "Alice Dupont",
  "email": "alice@example.com"
}
```

---

## 💡 Exemples d'utilisation

### Workflow complet : Créer et gérer des tâches Kanban

```
1. create_backlog_item(title="Implémenter notifications push")
   → Agent appelle automatiquement /v1/context/default-workspace
   → Agent appelle automatiquement /v1/context/current-user
   → Item créé : #7

2. get_backlog()
   → Agent appelle automatiquement /v1/context/default-workspace
   → Liste tous les items du backlog

3. create_task(backlog_item_id="item_7")
   → Tâche créée : task_xyz

4. get_kanban_board()
   → Agent appelle automatiquement /v1/context/default-workspace
   → Visualiser le board complet avec colonnes et tâches

5. move_task(task_id="task_xyz", column_id="col_inprogress")
   → Déplacer la tâche vers "En cours"

6. assign_task(task_id="task_xyz", assignee_id="user_bob")
   → Assigner la tâche à Bob
```

---

## 🔍 Données de démonstration (seed.sql)

Le workspace **space_dev** est pré-configuré avec :

**Utilisateurs:**
- user_alice (Alice Dupont)
- user_bob (Bob Martin)
- user_charlie (Charlie Durand)
- user_diana (Diana Prince)

**Colonnes:**
- col_todo ("À faire")
- col_inprogress ("En cours", WIP: 3)
- col_review ("En revue", WIP: 2)
- col_done ("Terminé")

**Backlog items:** 6 items pré-créés (#1-#6)

**Tasks:** 6 tâches réparties dans les colonnes

---

## 🛠️ Utilisation avec l'Agent

L'agent Workflow est **proactif** grâce aux appels HTTP automatiques :

❌ **Ancien comportement:**
```
User: "Crée un item au backlog : Notifications push"
Agent: "Quel est ton space_id et user_id ?"
```

✅ **Nouveau comportement:**
```
User: "Crée un item au backlog : Notifications push"
Agent: 
  1. Appelle GET /v1/context/default-workspace → space_dev
  2. Appelle GET /v1/context/current-user → user_alice
  3. Crée l'item directement
  → ✅ Item créé : #7 - Notifications push
```

---

## 🐛 Debugging

### Vérifier les IDs disponibles

```sql
-- Voir les workspaces
SELECT id, name, methodology FROM spaces;

-- Voir les utilisateurs
SELECT id, name FROM users;

-- Voir les colonnes d'un workspace
SELECT id, name, wip_limit FROM columns WHERE space_id = 'space_dev';

-- Voir les items du backlog
SELECT id, sequence_number, title FROM backlog_items WHERE space_id = 'space_dev';

-- Voir les tâches
SELECT t.id, bi.sequence_number, bi.title, c.name AS column_name
FROM tasks t
JOIN backlog_items bi ON t.backlog_item_id = bi.id
JOIN column_tasks ct ON t.id = ct.task_id
JOIN columns c ON ct.column_id = c.id
WHERE bi.space_id = 'space_dev';
```

### Logs MCP

Les logs du serveur MCP sont dans stderr :
```bash
docker logs agent-api --tail 50 | grep "workflow_mcp"
```

### Tester les endpoints d'auto-contexte

```bash
# Workspace par défaut
curl http://localhost:8000/v1/context/default-workspace

# Utilisateur courant
curl http://localhost:8000/v1/context/current-user
```

---

## 📞 Support

- **Fichier:** `mcps/workflow_mcp.py`
- **Base de données:** PostgreSQL sur `postgres:5432`
- **Schéma:** `db/tables/*.py`
- **Seeds:** `db/seed.sql`
- **Endpoints contexte:** `api/routes/context.py`

---

## 🔗 Voir aussi

- [MCP Administration API](./MCP_ADMINISTRATION_API.md) - Gestion des workspaces
- [MCP Scrum Master API](./MCP_SCRUM_MASTER_API.md) - Gestion des sprints
- [Tests Playground](../TESTS_PLAYGROUND.md) - Exemples de requêtes utilisateur
