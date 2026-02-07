# Guide Session - Intégration apcs_server → Backend API

## 📌 Vue d'ensemble

La table `sessions` dans apcs_server sauvegarde le contexte de l'utilisateur :
- `user_id` : Sauvegardé au login
- `space_id` : Sauvegardé lors de l'ouverture d'un workspace
- `sprint_id` : Le sprint actuel du workspace

Les endpoints context du backend API appellent `/api/session` pour récupérer ces données.

---

## 🔧 Setup

### 1. Créer la table session

```bash
cd apcs_server

# Générer le client Prisma
npx prisma generate

# Appliquer la migration
npx prisma migrate deploy
```

### 2. Démarrer apcs_server

```bash
npm run dev
```

---

## 📡 Endpoints Session (apcs_server)

### GET /api/session
Récupérer la session de l'utilisateur courant

**Headers** : `Authorization: Bearer {jwt_token}`

**Response** :
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "spaceId": "space456",
    "sprintId": "sprint789",
    "updatedAt": "2026-02-06T..."
  }
}
```

### POST /api/session/workspace
Définir le workspace actif (quand l'utilisateur ouvre un workspace)

**Headers** : `Authorization: Bearer {jwt_token}`

**Body** :
```json
{
  "spaceId": "space456"
}
```

**Response** :
```json
{
  "success": true,
  "message": "Workspace context updated",
  "data": {
    "userId": "user123",
    "spaceId": "space456",
    "sprintId": null
  }
}
```

### POST /api/session/sprint
Définir le sprint actif

**Headers** : `Authorization: Bearer {jwt_token}`

**Body** :
```json
{
  "sprintId": "sprint789"
}
```

### DELETE /api/session
Effacer la session (optionnel au logout)

---

## 🔄 Flow Utilisateur

### 1. Login
```
POST /api/auth/login
→ Crée automatiquement une session avec user_id
→ space_id et sprint_id = null
```

### 2. Ouverture d'un workspace
```
Frontend → POST /api/session/workspace { spaceId: "space456" }
→ Met à jour session.space_id = "space456"
```

### 3. Changement de workspace
```
Frontend → POST /api/session/workspace { spaceId: "space_autre" }
→ Met à jour session.space_id = "space_autre"
→ sprint_id reste inchangé (ou mis à null)
```

### 4. Sélection d'un sprint actif
```
Frontend → POST /api/session/sprint { sprintId: "sprint789" }
→ Met à jour session.sprint_id = "sprint789"
```

---

## 🤖 Utilisation par les Agents

Les agents appellent les endpoints context qui utilisent la session :

### Exemple : Workflow Agent crée un backlog item

```python
# 1. L'agent récupère le contexte
GET /context/current-user
→ Appelle /api/session
→ Récupère { user_id, space_id, sprint_id }

# 2. L'agent utilise space_id et user_id
create_backlog_item(
    title="Nouvelle feature",
    space_id=space_id,  # Depuis session
    created_by_id=user_id  # Depuis session
)
```

### Endpoints Context mis à jour

| Endpoint Context | Appels Backend | Données |
|------------------|----------------|---------|
| `/context/current-user` | `GET /api/session` | `user_id, space_id, sprint_id` |
| `/context/default-workspace` | `GET /api/session` → `GET /api/spaces/{spaceId}` | Détails workspace |
| `/context/active-sprint` | `GET /api/session` → `GET /api/sprints/{sprintId}` | Détails sprint |
| `/context/workspace-metadata` | `GET /api/session` → `GET /api/spaces/{spaceId}` | Métadonnées |
| `/context/available-users` | `GET /api/session` → `GET /api/spaces/{spaceId}/members` | Liste membres |

---

## 🧪 Test

### Test 1 : Login et création de session

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"password123"}'

# Récupère le token JWT

# Vérifier la session
curl http://localhost:3000/api/session \
  -H "Authorization: Bearer {token}"
```

**Résultat attendu** :
```json
{
  "success": true,
  "data": {
    "userId": "user_alice",
    "spaceId": null,
    "sprintId": null
  }
}
```

### Test 2 : Définir un workspace

```bash
curl -X POST http://localhost:3000/api/session/workspace \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"spaceId":"space_dev"}'
```

### Test 3 : Les agents récupèrent le contexte

```bash
# L'agent appelle
curl http://localhost:8000/context/current-user

# Qui appelle
curl http://localhost:3000/api/session \
  -H "Authorization: Bearer {token}"
```

---

## ⚠️ Important

1. **Authentification** : Tous les endpoints context doivent transmettre le JWT token à apcs_server
2. **Workspace automatique** : Si pas de workspace dans la session, retourner `null` ou le premier workspace de l'utilisateur
3. **Sprint automatique** : Si pas de sprint dans la session, retourner le sprint actif du workspace
