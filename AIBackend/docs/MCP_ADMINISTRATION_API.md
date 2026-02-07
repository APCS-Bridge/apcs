# 📚 Documentation MCP Administration API

**Version:** 1.0  
**Protocole:** Model Context Protocol (MCP)  
**Transport:** stdio  
**Base de données:** PostgreSQL  
**Domaine:** Administration des workspaces

---

## 🎯 Vue d'ensemble

Le MCP Administration expose **3 outils** pour gérer les workspaces (espaces de travail). Ces outils sont réservés aux **administrateurs** et permettent de créer, consulter et gérer les espaces de travail KANBAN ou SCRUM.

**Outils disponibles:**
1. `create_space` - Créer un workspace
2. `get_user_spaces` - Lister les workspaces d'un utilisateur
3. `get_space_info` - Obtenir les détails d'un workspace

---

## 🗂️ Outils disponibles

### `create_space`
Créer un nouveau workspace (KANBAN ou SCRUM).

**Paramètres requis:**
- `name` (string) - Nom du workspace
- `owner_id` (string) - ID du propriétaire ⚠️ **USER_ID requis**

**Paramètres optionnels:**
- `methodology` (enum: KANBAN|SCRUM) - Défaut: KANBAN

**Retour:**
```
✅ Workspace créé : Projet Marketing (ID: space_abc123, méthodologie: KANBAN)
```

**Dépendances:** Aucune  
**Note:** C'est le **point de départ** - tous les autres outils (Workflow, Scrum Master) nécessitent un space_id

**Exemple:**
```python
# Créer un workspace Kanban
create_space(name="Projet Marketing", owner_id="user_alice")

# Créer un workspace Scrum
create_space(name="Sprint Dev Q1", owner_id="user_bob", methodology="SCRUM")
```

---

### `get_user_spaces`
Récupérer tous les workspaces d'un utilisateur.

**Paramètres requis:**
- `user_id` (string) - ID de l'utilisateur ⚠️ **USER_ID requis**

**Retour:**
```
📁 3 workspace(s) trouvé(s):
- Projet Marketing (KANBAN) - ID: space_abc123
- Dev Sprint Q1 (SCRUM) - ID: space_def456
- Backlog Général (KANBAN) - ID: space_ghi789
```

**Dépendances:** Aucune  
**Usage:** Permet d'obtenir les `space_id` disponibles pour un utilisateur

**Exemple:**
```python
get_user_spaces(user_id="user_alice")
```

---

### `get_space_info`
Récupérer les informations complètes d'un workspace.

**Paramètres requis:**
- `space_id` (string) - ID du workspace ⚠️ **SPACE_ID requis**

**Retour:**
```
🏢 Projet Marketing
Méthodologie: KANBAN
Propriétaire: user_alice
Membres: 4
```

**Dépendances:** Requiert `space_id` (obtenu via `get_user_spaces` ou `create_space`)

**Exemple:**
```python
get_space_info(space_id="space_abc123")
```

---

## 📊 Graphe de dépendances

```
[ADMIN REQUEST]
     |
     v
create_space() ──┬──> get_user_spaces()
                 │           |
                 │           v
                 └──> get_space_info()
                             |
                             v
                   [Utilisé par Workflow/Scrum MCP]
```

---

## 📋 Tableau récapitulatif des IDs requis

| Outil | user_id | space_id |
|-------|---------|----------|
| `create_space` | ✅ | - |
| `get_user_spaces` | ✅ | - |
| `get_space_info` | - | ✅ |

**Légende:**
- ✅ Requis manuellement
- `-` Non requis

---

## 💡 Exemples d'utilisation

### Workflow complet : Créer et configurer un workspace

```
1. create_space(name="Projet E-commerce", owner_id="user_alice", methodology="KANBAN")
   → Workspace créé : space_ecommerce

2. get_user_spaces(user_id="user_alice")
   → Lister tous les workspaces de Alice (incluant space_ecommerce)

3. get_space_info(space_id="space_ecommerce")
   → Vérifier les détails du workspace (méthodologie, propriétaire, membres)

4. [Utiliser space_ecommerce dans Workflow MCP]
   → create_backlog_item(space_id="space_ecommerce", title="...")
```

---

## 🔍 Données de démonstration (seed.sql)

**Workspaces pré-configurés:**
- **space_dev** (KANBAN) - Développement
  - Propriétaire: user_alice
  - Membres: Alice, Bob, Charlie, Diana
  - Colonnes: À faire, En cours, En revue, Terminé

**Utilisateurs:**
- user_alice (Alice Dupont)
- user_bob (Bob Martin)
- user_charlie (Charlie Durand)
- user_diana (Diana Prince)

---

## 🛠️ Utilisation avec l'Agent Admin

L'agent Admin utilise ces outils pour gérer les workspaces :

**Exemple de requête utilisateur:**
```
User: "Crée un workspace Scrum pour l'équipe Backend, propriétaire Bob"
Agent: 
  1. Appelle create_space(name="Backend", owner_id="user_bob", methodology="SCRUM")
  2. Retourne: ✅ Workspace créé : Backend (ID: space_backend, méthodologie: SCRUM)
```

---

## 🐛 Debugging

### Vérifier les workspaces disponibles

```sql
-- Voir tous les workspaces
SELECT id, name, methodology, owner_id, created_at FROM spaces;

-- Voir les workspaces d'un utilisateur
SELECT s.id, s.name, s.methodology 
FROM spaces s
JOIN space_members sm ON s.id = sm.space_id
WHERE sm.user_id = 'user_alice';

-- Voir les membres d'un workspace
SELECT u.id, u.name, u.email
FROM users u
JOIN space_members sm ON u.id = sm.user_id
WHERE sm.space_id = 'space_dev';
```

### Logs MCP

Les logs du serveur MCP sont dans stderr :
```bash
docker logs agent-api --tail 50 | grep "administration_mcp"
```

---

## 📞 Support

- **Fichier:** `mcps/administration_mcp.py`
- **Base de données:** PostgreSQL sur `postgres:5432`
- **Schéma:** `db/tables/space.py`
- **Seeds:** `db/seed.sql`

---

## 🔗 Voir aussi

- [MCP Workflow API](./MCP_WORKFLOW_API.md) - Gestion Kanban (utilise les workspaces)
- [MCP Scrum Master API](./MCP_SCRUM_MASTER_API.md) - Gestion Scrum (utilise les workspaces)
- [Tests Playground](../TESTS_PLAYGROUND.md) - Exemples de requêtes utilisateur
