# 🧪 Tests de Communication Inter-Backends - Workflow Agent

Ce document liste les requêtes à tester dans le Playground (app.agno.com) qui nécessitent une communication entre le backend agents (port 8000) et apcs_server (port 3000).

---

## 📊 Architecture de Communication

```
Playground (app.agno.com)
    ↓ HTTP
Backend Agents (port 8000) - Python/FastAPI
    ↓ MCP Tools
    ↓ Endpoints /v1/context/*  → apcs_server (port 3000) - TypeScript/Express
    ↓                              ↓
PostgreSQL Docker (port 5432) - Base unique `collaboration_platform`
```

---

## 🔗 Endpoints de Contexte Utilisés

Les outils MCP appellent automatiquement ces endpoints pour récupérer le contexte :

| Endpoint | Données Retournées | Utilisé Par |
|----------|-------------------|-------------|
| `/v1/context/current-user` | user_id, email, name | create_backlog_item, assign_task |
| `/v1/context/default-workspace` | space_id, méthodologie | get_backlog, get_kanban_board, create_column |
| `/v1/context/active-sprint` | sprint_id, status | add_to_sprint_backlog, get_sprint_backlog |
| `/v1/context/workspace-metadata` | nom, description, colonnes | get_kanban_board |
| `/v1/context/available-users` | liste utilisateurs | assign_task |
| `/v1/context/column-by-name` | column_id depuis nom | move_task |

---

## 🎯 Requêtes de Test - Workflow Agent

### ✅ Niveau 1 : Récupération de Contexte Simple

#### Test 1.1 : get_backlog (récupère workspace automatiquement)
**Requête Playground :**
```
Affiche le backlog
```

**Communication attendue :**
1. Agent reçoit la requête
2. MCP `get_backlog` appelé
3. MCP appelle `/v1/context/default-workspace` → récupère `space_dev`
4. MCP query PostgreSQL avec `space_id='space_dev'`
5. Retour des 6 items du backlog

**Réponse attendue :**
```
Voici le Product Backlog actuel pour le workspace space_dev :

ID | Titre | Assigné à | Statut
---|-------|-----------|-------
1  | Implémenter authentification JWT | Bob Martin | Backlog
2  | Créer interface utilisateur Kanban | Charlie Leroux | Backlog
3  | Optimiser requêtes base de données | Bob Martin | Backlog
4  | Documentation API REST | Diana Bernard | Backlog
5  | Tests unitaires backend | Non assigné | Backlog
6  | Mise en place CI/CD | Non assigné | Backlog
```

**Points à vérifier :**
- ✅ L'agent ne demande PAS "Quel workspace ?"
- ✅ Le workspace `space_dev` est automatiquement récupéré
- ✅ Les 6 items sont affichés correctement
- ✅ Les noms d'assignés sont affichés (pas les IDs)

---

#### Test 1.2 : get_kanban_board (récupère workspace + métadonnées)
**Requête Playground :**
```
Affiche-moi le board kanban
```

**Communication attendue :**
1. MCP `get_kanban_board` appelé
2. MCP appelle `/v1/context/default-workspace` → `space_dev`
3. MCP appelle `/v1/context/workspace-metadata` → colonnes, limites WIP
4. MCP query PostgreSQL pour récupérer les tâches
5. Retour du board complet

**Réponse attendue :**
```
📊 Board Kanban - Workspace space_dev

┌─────────────┬─────────────┬─────────────┬─────────────┐
│ À faire     │ En cours    │ En revue    │ Terminé     │
│ (col_todo)  │ (WIP: 3)    │ (WIP: 2)    │ (col_done)  │
├─────────────┼─────────────┼─────────────┼─────────────┤
│ Task #1     │ Task #3     │ Task #5     │ Task #8     │
│ Task #2     │ Task #4     │             │             │
│             │             │             │             │
└─────────────┴─────────────┴─────────────┴─────────────┘

⚠️ Colonne "En revue" : 1/2 tâches (limite WIP presque atteinte)
✅ Colonne "En cours" : 2/3 tâches
```

**Points à vérifier :**
- ✅ Les 4 colonnes sont affichées
- ✅ Les limites WIP sont mentionnées
- ✅ Les tâches sont dans les bonnes colonnes
- ✅ Alerte si limite WIP proche

---

### ✅ Niveau 2 : Création avec Contexte Utilisateur

#### Test 2.1 : create_task (récupère user_id automatiquement)
**Requête Playground :**
```
Crée une tâche pour l'item du backlog #5
```

**Communication attendue :**
1. MCP `create_task` appelé avec `backlog_item_id='item_5'`
2. MCP appelle `/v1/context/current-user` → `user_alice`
3. MCP query PostgreSQL `INSERT INTO tasks (backlog_item_id, assignee_id)`
4. Retour du task_id

**Réponse attendue :**
```
✅ Tâche créée avec succès !

📝 Détails :
- ID : task_5_2
- Item du backlog : #5 - Tests unitaires backend
- Créée par : Alice Dupont (user_alice)
- Colonne : À faire (par défaut)

Tu peux maintenant :
- Déplacer la tâche : "Déplace la tâche #5_2 dans En cours"
- Assigner la tâche : "Assigne la tâche à Bob"
```

**Points à vérifier :**
- ✅ L'agent ne demande PAS "À qui assigner ?"
- ✅ La tâche est créée automatiquement
- ✅ Le user_id courant est récupéré depuis le contexte
- ✅ L'agent propose des actions suivantes

---

#### Test 2.2 : create_backlog_item (récupère workspace + user)
**Requête Playground :**
```
Ajoute un item au backlog : "Implémenter système de notifications push"
```

**Communication attendue :**
1. MCP `create_backlog_item` appelé
2. MCP appelle `/v1/context/default-workspace` → `space_dev`
3. MCP appelle `/v1/context/current-user` → `user_alice`
4. MCP query PostgreSQL `INSERT INTO backlog_items`
5. Retour de item_id

**Réponse attendue :**
```
✅ Item ajouté au backlog !

📋 Détails :
- ID : item_7
- Titre : Implémenter système de notifications push
- Workspace : space_dev
- Créé par : Alice Dupont
- Statut : BACKLOG

Prochaines étapes :
- Créer une tâche : "Crée une tâche pour l'item #7"
- Ajouter description : "Modifie l'item #7 : ajoute la description 'Integration Firebase Cloud Messaging'"
```

**Points à vérifier :**
- ✅ Workspace récupéré automatiquement
- ✅ Créateur récupéré automatiquement
- ✅ L'agent suggère des actions suivantes
- ✅ Formatage clair avec emojis

---

### ✅ Niveau 3 : Actions avec Résolution de Noms

#### Test 3.1 : move_task avec nom de colonne (résolution column_id)
**Requête Playground :**
```
Déplace la tâche #1 dans la colonne "En cours"
```

**Communication attendue :**
1. MCP `move_task` appelé avec `task_id='task_1_1'`, `column_name='En cours'`
2. MCP appelle `/v1/context/column-by-name?name=En cours` → `col_inprogress`
3. MCP query PostgreSQL `UPDATE columns_tasks SET column_id='col_inprogress'`
4. Retour succès

**Réponse attendue :**
```
✅ Tâche déplacée avec succès !

📦 Déplacement :
- Tâche : #1 - Implémenter authentification JWT
- Depuis : À faire
- Vers : En cours (WIP: 2/3)
- Déplacée par : Alice Dupont

⚠️ Attention : La colonne "En cours" contient maintenant 3 tâches (limite WIP atteinte)
```

**Points à vérifier :**
- ✅ L'agent comprend "En cours" et résout automatiquement le column_id
- ✅ Le déplacement est effectué
- ✅ L'agent signale le statut WIP
- ✅ Historique du déplacement affiché

---

#### Test 3.2 : assign_task avec nom d'utilisateur (résolution user_id)
**Requête Playground :**
```
Assigne la tâche #2 à Bob Martin
```

**Communication attendue :**
1. MCP `assign_task` appelé avec `task_id='task_2_1'`, `assignee_name='Bob Martin'`
2. MCP appelle `/v1/context/available-users` → liste des users
3. MCP résout "Bob Martin" → `user_bob`
4. MCP query PostgreSQL `UPDATE tasks SET assignee_id='user_bob'`
5. Retour succès

**Réponse attendue :**
```
✅ Tâche assignée !

👤 Assignment :
- Tâche : #2 - Créer interface utilisateur Kanban
- Assignée à : Bob Martin (bob@example.com)
- Précédent : Charlie Leroux
- Changé par : Alice Dupont

📧 Notification envoyée à bob@example.com
```

**Points à vérifier :**
- ✅ L'agent résout "Bob Martin" → `user_bob`
- ✅ L'historique de l'assignation est affiché
- ✅ Notification mention (si Redis actif)
- ✅ Email affiché pour confirmation

---

## 🔍 Vérifications de Comportement

### ❌ Comportements à ÉVITER

1. **Demander des informations déjà dans le contexte :**
   ```
   ❌ "Quel est ton workspace actuel ?"
   ❌ "Quel est ton user_id ?"
   ❌ "Dans quel space veux-tu créer la tâche ?"
   ```

2. **Afficher des IDs techniques au lieu de noms :**
   ```
   ❌ "Tâche assignée à user_bob"
   ✅ "Tâche assignée à Bob Martin (user_bob)"
   ```

3. **Ne pas signaler les limites WIP :**
   ```
   ❌ "Tâche déplacée dans En cours"
   ✅ "Tâche déplacée dans En cours (2/3 - attention à la limite WIP)"
   ```

### ✅ Comportements à RECHERCHER

1. **Récupération automatique du contexte :**
   - Workspace récupéré depuis `/v1/context/default-workspace`
   - User récupéré depuis `/v1/context/current-user`
   - Sprint actif récupéré depuis `/v1/context/active-sprint`

2. **Résolution proactive des noms :**
   - "En cours" → `col_inprogress` via `/v1/context/column-by-name`
   - "Bob Martin" → `user_bob` via `/v1/context/available-users`

3. **Réponses structurées et actionables :**
   - Emojis pour la lisibilité
   - Suggestions d'actions suivantes
   - Alertes sur WIP limits
   - Historique des changements

---

## 📝 Notes pour Amélioration des Prompts

### Observations à noter pendant les tests :

1. **L'agent demande-t-il des informations inutilement ?**
   - Si oui → Améliorer les instructions pour utiliser les endpoints de contexte

2. **L'agent utilise-t-il les bons outils dans le bon ordre ?**
   - Exemple : `get_kanban_board` avant `move_task` pour résoudre column_id

3. **Les réponses sont-elles claires et actionnables ?**
   - Si non → Ajouter des exemples de formatage dans les instructions

4. **L'agent gère-t-il les erreurs gracieusement ?**
   - Exemple : "La colonne 'En cours' est pleine (WIP: 3/3), impossible d'ajouter une tâche"

5. **L'agent suggère-t-il des actions pertinentes ?**
   - Après création d'item → Suggérer de créer une tâche
   - Après création de tâche → Suggérer de l'assigner ou la déplacer

---

## 🚀 Prochaines Étapes

1. **Tester chaque requête dans le Playground**
2. **Noter les réponses actuelles vs réponses attendues**
3. **Identifier les patterns problématiques**
4. **Mettre à jour les instructions des agents**
5. **Retester et itérer**

---

## 📊 Checklist de Test

### Workflow Agent
- [ ] Test 1.1 : get_backlog
- [ ] Test 1.2 : get_kanban_board
- [ ] Test 2.1 : create_task
- [ ] Test 2.2 : create_backlog_item
- [ ] Test 3.1 : move_task (avec nom de colonne)
- [ ] Test 3.2 : assign_task (avec nom d'utilisateur)

### Scrum Master Agent (à tester séparément)
- [ ] get_sprint_backlog (récupère sprint actif)
- [ ] add_to_sprint_backlog (récupère workspace + sprint)
- [ ] start_sprint (récupère workspace)

### Administration Agent (à tester séparément)
- [ ] create_space (récupère user courant)
- [ ] get_user_spaces (récupère user courant)

---

## 🔧 Configuration Requise

**Backends actifs :**
- ✅ apcs_server (port 3000) : `npm run dev`
- ✅ Backend agents (port 8000) : `uv run uvicorn api.main:app --reload --port 8000`
- ✅ PostgreSQL Docker (port 5432)
- ✅ Redis Docker (port 6379)

**Session utilisateur :**
- User : Alice Dupont (user_alice)
- Workspace par défaut : space_dev
- Sprint actif : Aucun (mode KANBAN)
