# 📚 Documentation MCP Scrum Master API

**Version:** 1.0  
**Protocole:** Model Context Protocol (MCP)  
**Transport:** stdio  
**Base de données:** PostgreSQL  
**Domaine:** Méthodologie Scrum uniquement

---

## 🎯 Vue d'ensemble

Le MCP Scrum Master expose **5 outils** pour gérer les sprints et la méthodologie Scrum. Les outils permettent de créer des sprints, gérer le sprint backlog, et suivre l'avancement.

**Outils disponibles:**
1. `create_sprint` - Créer un sprint
2. `add_to_sprint_backlog` - Ajouter un item au sprint backlog
3. `get_sprint_backlog` - Récupérer le sprint backlog
4. `start_sprint` - Démarrer un sprint
5. `complete_sprint` - Terminer un sprint

---

## 🗂️ Catégories d'outils

### 1️⃣ Gestion des Sprints

#### `create_sprint`
Créer un nouveau sprint (SCRUM uniquement).

**Paramètres requis:**
- `space_id` (string) - ID du workspace SCRUM ⚠️ **SPACE_ID requis**
- `name` (string) - Nom du sprint
- `start_date` (string) - Date de début (YYYY-MM-DD)
- `end_date` (string) - Date de fin (YYYY-MM-DD)

**Paramètres optionnels:**
- `goal` (string) - Objectif du sprint

**Retour:**
```
✅ Sprint créé : Sprint 1 - MVP (ID: sprint_xyz123, status: PLANNING)
```

**Dépendances:** 
- Requiert `space_id` de type SCRUM
- Le workspace doit exister (créé via Administration MCP)

**Exemple:**
```python
create_sprint(
    space_id="space_scrum",
    name="Sprint 1 - MVP",
    start_date="2026-02-10",
    end_date="2026-02-24",
    goal="Livrer la première version du produit"
)
```

---

#### `start_sprint`
Démarrer un sprint (changer status à ACTIVE).

**Paramètres requis:**
- `sprint_id` (string) - ID du sprint ⚠️ **SPRINT_ID requis**

**Retour:**
```
✅ Sprint Sprint 1 - MVP démarré
```

**Dépendances:** 
- Requiert `sprint_id` (via `create_sprint`)
- Le sprint doit être en status PLANNING

**Exemple:**
```python
start_sprint(sprint_id="sprint_xyz123")
```

---

#### `complete_sprint`
Terminer un sprint (changer status à COMPLETED).

**Paramètres requis:**
- `sprint_id` (string) - ID du sprint ⚠️ **SPRINT_ID requis**

**Retour:**
```
✅ Sprint Sprint 1 - MVP terminé
```

**Dépendances:** 
- Requiert `sprint_id` (via `create_sprint`)
- Le sprint doit être en status ACTIVE

**Exemple:**
```python
complete_sprint(sprint_id="sprint_xyz123")
```

---

### 2️⃣ Sprint Backlog

#### `add_to_sprint_backlog`
Ajouter un item du Product Backlog au Sprint Backlog.

**Paramètres requis:**
- `sprint_id` (string) - ID du sprint ⚠️ **SPRINT_ID requis**
- `backlog_item_id` (string) - ID de l'item ⚠️ **BACKLOG_ITEM_ID requis**

**Paramètres optionnels:**
- `story_points` (integer) - Estimation en story points
- `position` (integer) - Position dans le sprint backlog

**Retour:**
```
✅ Item ajouté au Sprint Backlog (ID: sbi_abc123)
```

**Dépendances:** 
- Requiert `sprint_id` (via `create_sprint`)
- Requiert `backlog_item_id` (via Workflow MCP `create_backlog_item`)

**Exemple:**
```python
add_to_sprint_backlog(
    sprint_id="sprint_xyz123",
    backlog_item_id="item_5",
    story_points=5,
    position=0
)
```

---

#### `get_sprint_backlog`
Récupérer le Sprint Backlog complet d'un sprint.

**Paramètres requis:**
- `sprint_id` (string) - ID du sprint ⚠️ **SPRINT_ID requis**

**Retour:**
```
📋 Sprint Backlog (8 items):
#1 - Créer page de connexion (5 SP) → Alice
#2 - Dashboard analytics (8 SP)
#3 - Notifications push (3 SP) → Bob
...
```

**Dépendances:** Requiert `sprint_id` (via `create_sprint`)

**Exemple:**
```python
get_sprint_backlog(sprint_id="sprint_xyz123")
```

---

## 📊 Graphe de dépendances

```
[SCRUM MASTER REQUEST]
     |
     v
create_sprint() ──┬──> add_to_sprint_backlog() ──> get_sprint_backlog()
                  │              |
                  │              v
                  ├──> start_sprint()
                  │
                  └──> complete_sprint()
```

**Dépendances externes:**
- `backlog_item_id` provient du **Workflow MCP** (`create_backlog_item`)
- `space_id` provient de l'**Administration MCP** (`create_space`)

---

## 📋 Tableau récapitulatif des IDs requis

| Outil | space_id | sprint_id | backlog_item_id | story_points |
|-------|----------|-----------|-----------------|--------------|
| `create_sprint` | ✅ | - | - | - |
| `add_to_sprint_backlog` | - | ✅ | ✅ | ⭕ |
| `get_sprint_backlog` | - | ✅ | - | - |
| `start_sprint` | - | ✅ | - | - |
| `complete_sprint` | - | ✅ | - | - |

**Légende:**
- ✅ Requis manuellement
- ⭕ Optionnel
- `-` Non requis

---

## 💡 Exemples d'utilisation

### Workflow complet : Gérer un sprint Scrum

```
1. [Administration MCP] create_space(name="Backend", owner_id="user_bob", methodology="SCRUM")
   → Workspace créé : space_backend

2. create_sprint(
     space_id="space_backend",
     name="Sprint 1",
     start_date="2026-02-10",
     end_date="2026-02-24",
     goal="Implémenter API REST"
   )
   → Sprint créé : sprint_backend_s1

3. [Workflow MCP] create_backlog_item(space_id="space_backend", title="Endpoint GET /users")
   → Item créé : item_user_endpoint

4. add_to_sprint_backlog(
     sprint_id="sprint_backend_s1",
     backlog_item_id="item_user_endpoint",
     story_points=5
   )
   → Item ajouté au Sprint Backlog

5. get_sprint_backlog(sprint_id="sprint_backend_s1")
   → Visualiser tous les items du sprint

6. start_sprint(sprint_id="sprint_backend_s1")
   → Sprint démarré (status: ACTIVE)

7. [... Développement pendant 2 semaines ...]

8. complete_sprint(sprint_id="sprint_backend_s1")
   → Sprint terminé (status: COMPLETED)
```

---

## 🔄 Cycle de vie d'un Sprint

```
PLANNING ──[start_sprint()]──> ACTIVE ──[complete_sprint()]──> COMPLETED
   ↑                              |
   |                              |
   └──────[add_to_sprint_backlog]─┘
```

**États:**
- **PLANNING** : Sprint créé, en cours de planification
- **ACTIVE** : Sprint en cours d'exécution
- **COMPLETED** : Sprint terminé

---

## 🔍 Données de démonstration (seed.sql)

**Workspaces Scrum disponibles:**
- Actuellement, seul `space_dev` existe (KANBAN)
- Pour tester Scrum, créez un workspace avec `methodology="SCRUM"`

**Exemple de création:**
```python
# Via Administration MCP
create_space(name="Sprint Team", owner_id="user_alice", methodology="SCRUM")
```

---

## 🛠️ Utilisation avec l'Agent Scrum Master

L'agent Scrum Master orchestre les sprints :

**Exemple de requête utilisateur:**
```
User: "Crée un sprint de 2 semaines à partir du 10 février pour le workspace Backend"
Agent: 
  1. Appelle create_sprint(
       space_id="space_backend",
       name="Sprint 1",
       start_date="2026-02-10",
       end_date="2026-02-24"
     )
  2. Retourne: ✅ Sprint créé : Sprint 1 (ID: sprint_xyz, status: PLANNING)
```

---

## 🐛 Debugging

### Vérifier les sprints disponibles

```sql
-- Voir tous les sprints
SELECT id, name, status, start_date, end_date, goal 
FROM sprints
ORDER BY start_date DESC;

-- Voir les sprints d'un workspace
SELECT id, name, status, start_date, end_date
FROM sprints
WHERE space_id = 'space_backend';

-- Voir le sprint backlog
SELECT 
    sbi.id,
    bi.sequence_number,
    bi.title,
    sbi.story_points,
    sbi.position,
    u.name AS assignee_name
FROM sprint_backlog_items sbi
JOIN backlog_items bi ON sbi.backlog_item_id = bi.id
LEFT JOIN users u ON bi.assignee_id = u.id
WHERE sbi.sprint_id = 'sprint_xyz'
ORDER BY sbi.position;
```

### Vérifier l'état d'un sprint

```sql
-- Statistiques d'un sprint
SELECT 
    s.name AS sprint_name,
    s.status,
    COUNT(sbi.id) AS total_items,
    SUM(sbi.story_points) AS total_story_points
FROM sprints s
LEFT JOIN sprint_backlog_items sbi ON s.id = sbi.sprint_id
WHERE s.id = 'sprint_xyz'
GROUP BY s.id, s.name, s.status;
```

### Logs MCP

Les logs du serveur MCP sont dans stderr :
```bash
docker logs agent-api --tail 50 | grep "scrum_master_mcp"
```

---

## 📞 Support

- **Fichier:** `mcps/scrum_master_mcp.py`
- **Base de données:** PostgreSQL sur `postgres:5432`
- **Schéma:** 
  - `db/tables/sprint.py`
  - `db/tables/sprint_backlog_item.py`
- **Seeds:** `db/seed.sql`

---

## 🔗 Voir aussi

- [MCP Administration API](./MCP_ADMINISTRATION_API.md) - Créer des workspaces SCRUM
- [MCP Workflow API](./MCP_WORKFLOW_API.md) - Créer des backlog items
- [Tests Playground](../TESTS_PLAYGROUND.md) - Exemples de requêtes utilisateur
