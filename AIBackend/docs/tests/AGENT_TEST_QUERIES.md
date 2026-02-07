# 🧪 Tests Complets des Agents APCS

Guide exhaustif pour tester tous les agents avec des requêtes utilisateur naturelles.

---

## 📋 Configuration de Base

### Données de test
```powershell
# KANBAN Workspace
$kanban_space = 'clxxx6666666666666666'  # Development Team

# SCRUM Workspace  
$scrum_space = 'clxxx7777777777777777'   # Marketing Project

# Utilisateurs
$alice = 'clxxx1111111111111111'  # Alice Dupont
$bob = 'clxxx2222222222222222'    # Bob Martin
$charlie = 'clxxx3333333333333333'  # Charlie Leroux
```

### Fonction Helper pour les tests
```powershell
function Test-Agent {
    param(
        [string]$AgentId,
        [string]$Message,
        [string]$SpaceId = 'clxxx6666666666666666',
        [string]$UserId = 'clxxx1111111111111111',
        [string]$SprintId = $null
    )
    
    $context = @{
        user_id = $UserId
        space_id = $SpaceId
    }
    if ($SprintId) { $context.sprint_id = $SprintId }
    
    $body = @{
        agent_id = $AgentId
        message = $Message
        session_id = "test_$(Get-Random)"
        context = $context
        stream = $false
    } | ConvertTo-Json -Depth 3
    
    $result = Invoke-RestMethod -Uri 'http://localhost:8000/v1/agents/message' -Method POST -Body $body -ContentType 'application/json'
    Write-Host "`n=== REQUETE ===" -ForegroundColor Cyan
    Write-Host "Agent: $AgentId" -ForegroundColor Yellow
    Write-Host "Message: $Message" -ForegroundColor Yellow
    Write-Host "`n=== REPONSE ===" -ForegroundColor Green
    Write-Host $result.content
    Write-Host "`n"
}
```

---

## 🔧 WORKFLOW AGENT (`workflow_agent`)

### Outils disponibles:
- `get_board` - Afficher le board (KANBAN ou SCRUM)
- `get_space_info` - Infos du workspace
- `create_backlog_item` - Ajouter au Product Backlog
- `get_backlog` - Voir le Product Backlog
- `update_backlog_item` - Modifier un item
- `create_task` - Créer une tâche (pour un item existant)
- `move_task` - Déplacer une tâche
- `assign_task` - Assigner une tâche
- `create_column` - Créer une colonne
- `get_kanban_board` - (deprecated) Board KANBAN
- `get_column_tasks` - Tâches d'une colonne

---

### 📊 TESTS - Affichage du Board

```powershell
# Test W1: Afficher le board KANBAN
Test-Agent -AgentId 'workflow_agent' -Message "Affiche le board" -SpaceId 'clxxx6666666666666666'

# Test W2: Afficher le board SCRUM  
Test-Agent -AgentId 'workflow_agent' -Message "Affiche le board" -SpaceId 'clxxx7777777777777777'

# Test W3: Demande avec variante de langage
Test-Agent -AgentId 'workflow_agent' -Message "Montre-moi le kanban" -SpaceId 'clxxx6666666666666666'

# Test W4: Demande informelle
Test-Agent -AgentId 'workflow_agent' -Message "C'est quoi les tâches en cours?" -SpaceId 'clxxx6666666666666666'
```

### 📝 TESTS - Product Backlog

```powershell
# Test W5: Afficher le backlog
Test-Agent -AgentId 'workflow_agent' -Message "Affiche le backlog"

# Test W6: Ajouter un item au backlog
Test-Agent -AgentId 'workflow_agent' -Message "Ajoute au backlog: Implémenter le système de paiement"

# Test W7: Ajouter avec description
Test-Agent -AgentId 'workflow_agent' -Message "Crée un nouvel item au backlog: Intégration Stripe avec description 'Gérer les paiements par carte bancaire'"

# Test W8: Modifier un item
Test-Agent -AgentId 'workflow_agent' -Message "Change le titre de l'item #3 en 'Optimisation des requêtes SQL'"

# Test W9: Assigner un item
Test-Agent -AgentId 'workflow_agent' -Message "Assigne l'item #5 à Bob"
```

### ✅ TESTS - Création de Tâches

```powershell
# Test W10: Créer une tâche pour un item
Test-Agent -AgentId 'workflow_agent' -Message "Crée une tâche pour l'item #5"

# Test W11: Créer avec numéro différent
Test-Agent -AgentId 'workflow_agent' -Message "Crée une tâche pour l'item du backlog #3"

# Test W12: Créer tâche pour item inexistant (test erreur)
Test-Agent -AgentId 'workflow_agent' -Message "Crée une tâche pour l'item #99"

# Test W13: Demande ambiguë
Test-Agent -AgentId 'workflow_agent' -Message "Crée une tâche"
```

### 🔄 TESTS - Déplacement de Tâches

```powershell
# Test W14: Déplacer vers In Progress
Test-Agent -AgentId 'workflow_agent' -Message "Déplace la tâche #1 vers In Progress"

# Test W15: Déplacer vers Done
Test-Agent -AgentId 'workflow_agent' -Message "La tâche #3 est terminée, déplace-la dans Done"

# Test W16: Demande avec nom de colonne en français
Test-Agent -AgentId 'workflow_agent' -Message "Mets la tâche #2 dans 'En cours'"
```

### 👤 TESTS - Assignation

```powershell
# Test W17: Assigner une tâche
Test-Agent -AgentId 'workflow_agent' -Message "Assigne la tâche #4 à Charlie"

# Test W18: Réassigner
Test-Agent -AgentId 'workflow_agent' -Message "Réassigne la tâche #2 à Alice"
```

### 📌 TESTS - Colonnes

```powershell
# Test W19: Créer une colonne
Test-Agent -AgentId 'workflow_agent' -Message "Crée une colonne Testing avec une limite WIP de 2"

# Test W20: Voir les colonnes
Test-Agent -AgentId 'workflow_agent' -Message "Quelles sont les colonnes du board?"
```

### ℹ️ TESTS - Informations

```powershell
# Test W21: Info workspace
Test-Agent -AgentId 'workflow_agent' -Message "Quelle est la méthodologie de ce workspace?"

# Test W22: Demande générale
Test-Agent -AgentId 'workflow_agent' -Message "Donne-moi un résumé de l'état du projet"
```

---

## 🏃 SCRUM MASTER AGENT (`scrum_master_agent`)

### Outils disponibles:
- `create_sprint` - Créer un nouveau sprint
- `add_to_sprint_backlog` - Ajouter un item au Sprint Backlog
- `get_sprint_backlog` - Voir le Sprint Backlog
- `start_sprint` - Démarrer un sprint
- `complete_sprint` - Terminer un sprint

---

### 🏁 TESTS - Gestion des Sprints

```powershell
# Test S1: Voir le sprint actif
Test-Agent -AgentId 'scrum_master_agent' -Message "Quel est le sprint actif?" -SpaceId 'clxxx7777777777777777'

# Test S2: Créer un nouveau sprint
Test-Agent -AgentId 'scrum_master_agent' -Message "Crée un sprint 'Sprint 2' qui commence le 20 février et dure 2 semaines" -SpaceId 'clxxx7777777777777777'

# Test S3: Créer sprint avec objectif
Test-Agent -AgentId 'scrum_master_agent' -Message "Crée un sprint 'MVP Release' du 1er mars au 15 mars avec l'objectif 'Livrer la version MVP du produit'" -SpaceId 'clxxx7777777777777777'

# Test S4: Démarrer un sprint
Test-Agent -AgentId 'scrum_master_agent' -Message "Démarre le sprint 2" -SpaceId 'clxxx7777777777777777'

# Test S5: Terminer un sprint
Test-Agent -AgentId 'scrum_master_agent' -Message "Termine le sprint actuel" -SpaceId 'clxxx7777777777777777'
```

### 📋 TESTS - Sprint Backlog

```powershell
# Test S6: Voir le Sprint Backlog
Test-Agent -AgentId 'scrum_master_agent' -Message "Affiche le sprint backlog" -SpaceId 'clxxx7777777777777777'

# Test S7: Ajouter au Sprint Backlog
Test-Agent -AgentId 'scrum_master_agent' -Message "Ajoute l'item #1 au sprint avec 5 story points" -SpaceId 'clxxx7777777777777777'

# Test S8: Ajouter plusieurs items
Test-Agent -AgentId 'scrum_master_agent' -Message "Ajoute les items #2 et #3 au sprint backlog" -SpaceId 'clxxx7777777777777777'

# Test S9: Voir les story points
Test-Agent -AgentId 'scrum_master_agent' -Message "Combien de story points dans le sprint actuel?" -SpaceId 'clxxx7777777777777777'

# Test S10: Velocity
Test-Agent -AgentId 'scrum_master_agent' -Message "Quelle est la capacité du sprint?" -SpaceId 'clxxx7777777777777777'
```

### ⚠️ TESTS - Erreurs et Edge Cases

```powershell
# Test S11: Sprint sur workspace KANBAN (erreur attendue)
Test-Agent -AgentId 'scrum_master_agent' -Message "Crée un sprint" -SpaceId 'clxxx6666666666666666'

# Test S12: Ajouter item inexistant au sprint
Test-Agent -AgentId 'scrum_master_agent' -Message "Ajoute l'item #999 au sprint" -SpaceId 'clxxx7777777777777777'
```

---

## 🔐 ADMINISTRATION AGENT (`administration_agent`)

### Outils disponibles:
- `create_space` - Créer un nouveau workspace
- `get_user_spaces` - Voir ses workspaces
- `get_space_info` - Infos d'un workspace

---

### 🏢 TESTS - Gestion des Workspaces

```powershell
# Test A1: Voir mes workspaces
Test-Agent -AgentId 'administration_agent' -Message "Affiche mes workspaces"

# Test A2: Créer un workspace KANBAN
Test-Agent -AgentId 'administration_agent' -Message "Crée un workspace 'Projet Mobile' en mode Kanban"

# Test A3: Créer un workspace SCRUM
Test-Agent -AgentId 'administration_agent' -Message "Crée un workspace 'Backend API' avec la méthodologie Scrum"

# Test A4: Infos d'un workspace
Test-Agent -AgentId 'administration_agent' -Message "Donne-moi les informations du workspace actuel"

# Test A5: Détails sur méthodologie
Test-Agent -AgentId 'administration_agent' -Message "C'est quoi la différence entre Kanban et Scrum?"
```

### 👥 TESTS - Membres (si implémenté)

```powershell
# Test A6: Voir les membres
Test-Agent -AgentId 'administration_agent' -Message "Qui sont les membres de ce workspace?"

# Test A7: Ajouter un membre
Test-Agent -AgentId 'administration_agent' -Message "Ajoute Bob au workspace"
```

---

## 🤖 ORCHESTRATOR (`orchestrator`)

L'orchestrator délègue aux agents spécialisés.

### Tests de délégation

```powershell
# Test O1: Délègue au workflow_agent
Test-Agent -AgentId 'orchestrator' -Message "Affiche le board"

# Test O2: Délègue au scrum_master_agent
Test-Agent -AgentId 'orchestrator' -Message "Crée un sprint" -SpaceId 'clxxx7777777777777777'

# Test O3: Délègue à l'administration_agent
Test-Agent -AgentId 'orchestrator' -Message "Crée un nouveau workspace"

# Test O4: Demande complexe
Test-Agent -AgentId 'orchestrator' -Message "Montre-moi le backlog et dis-moi quels items sont dans le sprint"
```

---

## ⚡ TESTS RAPIDES (Copier-Coller)

### Workflow Agent - Tests essentiels
```powershell
$body = @{agent_id='workflow_agent'; message="Affiche le board"; session_id='t1'; context=@{user_id='clxxx1111111111111111'; space_id='clxxx6666666666666666'}; stream=$false} | ConvertTo-Json -Depth 3; (Invoke-RestMethod -Uri 'http://localhost:8000/v1/agents/message' -Method POST -Body $body -ContentType 'application/json').content

$body = @{agent_id='workflow_agent'; message="Affiche le backlog"; session_id='t2'; context=@{user_id='clxxx1111111111111111'; space_id='clxxx6666666666666666'}; stream=$false} | ConvertTo-Json -Depth 3; (Invoke-RestMethod -Uri 'http://localhost:8000/v1/agents/message' -Method POST -Body $body -ContentType 'application/json').content

$body = @{agent_id='workflow_agent'; message="Cree une tache pour l'item #5"; session_id='t3'; context=@{user_id='clxxx1111111111111111'; space_id='clxxx6666666666666666'}; stream=$false} | ConvertTo-Json -Depth 3; (Invoke-RestMethod -Uri 'http://localhost:8000/v1/agents/message' -Method POST -Body $body -ContentType 'application/json').content

$body = @{agent_id='workflow_agent'; message="Ajoute au backlog: Test Feature X"; session_id='t4'; context=@{user_id='clxxx1111111111111111'; space_id='clxxx6666666666666666'}; stream=$false} | ConvertTo-Json -Depth 3; (Invoke-RestMethod -Uri 'http://localhost:8000/v1/agents/message' -Method POST -Body $body -ContentType 'application/json').content
```

### Scrum Master Agent - Tests essentiels
```powershell
$body = @{agent_id='scrum_master_agent'; message="Affiche le sprint backlog"; session_id='s1'; context=@{user_id='clxxx1111111111111111'; space_id='clxxx7777777777777777'}; stream=$false} | ConvertTo-Json -Depth 3; (Invoke-RestMethod -Uri 'http://localhost:8000/v1/agents/message' -Method POST -Body $body -ContentType 'application/json').content

$body = @{agent_id='scrum_master_agent'; message="Combien de story points dans ce sprint?"; session_id='s2'; context=@{user_id='clxxx1111111111111111'; space_id='clxxx7777777777777777'}; stream=$false} | ConvertTo-Json -Depth 3; (Invoke-RestMethod -Uri 'http://localhost:8000/v1/agents/message' -Method POST -Body $body -ContentType 'application/json').content
```

### Administration Agent - Tests essentiels
```powershell
$body = @{agent_id='administration_agent'; message="Affiche mes workspaces"; session_id='a1'; context=@{user_id='clxxx1111111111111111'; space_id='clxxx6666666666666666'}; stream=$false} | ConvertTo-Json -Depth 3; (Invoke-RestMethod -Uri 'http://localhost:8000/v1/agents/message' -Method POST -Body $body -ContentType 'application/json').content

$body = @{agent_id='administration_agent'; message="Infos du workspace actuel"; session_id='a2'; context=@{user_id='clxxx1111111111111111'; space_id='clxxx6666666666666666'}; stream=$false} | ConvertTo-Json -Depth 3; (Invoke-RestMethod -Uri 'http://localhost:8000/v1/agents/message' -Method POST -Body $body -ContentType 'application/json').content
```

---

## 📊 Matrice de Couverture des Tests

| Agent | Outil | Test | Statut |
|-------|-------|------|--------|
| **workflow_agent** | get_board (KANBAN) | W1 | ⚪ |
| workflow_agent | get_board (SCRUM) | W2 | ⚪ |
| workflow_agent | get_backlog | W5 | ⚪ |
| workflow_agent | create_backlog_item | W6, W7 | ⚪ |
| workflow_agent | update_backlog_item | W8 | ⚪ |
| workflow_agent | create_task | W10, W11 | ⚪ |
| workflow_agent | create_task (erreur) | W12 | ⚪ |
| workflow_agent | move_task | W14, W15 | ⚪ |
| workflow_agent | assign_task | W17 | ⚪ |
| workflow_agent | create_column | W19 | ⚪ |
| workflow_agent | get_space_info | W21 | ⚪ |
| **scrum_master_agent** | get_sprint_backlog | S6 | ⚪ |
| scrum_master_agent | create_sprint | S2, S3 | ⚪ |
| scrum_master_agent | add_to_sprint_backlog | S7 | ⚪ |
| scrum_master_agent | start_sprint | S4 | ⚪ |
| scrum_master_agent | complete_sprint | S5 | ⚪ |
| **administration_agent** | get_user_spaces | A1 | ⚪ |
| administration_agent | create_space | A2, A3 | ⚪ |
| administration_agent | get_space_info | A4 | ⚪ |

Légende: ⚪ Non testé | ✅ Passé | ❌ Échoué

---

## 🐛 Debug: Voir les logs

```powershell
# Voir les derniers logs
docker logs apcs_agent_api --tail 50

# Chercher les erreurs
docker logs apcs_agent_api 2>&1 | Select-String "ERROR|Erreur"

# Voir les appels MCP
docker logs apcs_agent_api 2>&1 | Select-String "CallToolRequest|completed"
```
