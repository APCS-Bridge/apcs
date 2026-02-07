# 🧪 Tests Playground - Scrum Master Agent

Tests des 5 outils MCP du Scrum Master Agent dans app.agno.com Playground.

---

## 🏃 Gestion des Sprints

### 1. **create_sprint** - Créer un sprint

```
Crée un sprint "Sprint 1 - MVP" qui démarre aujourd'hui et dure 2 semaines
```

```
Démarre un nouveau sprint nommé "Sprint Release v1.0" du 10 février au 24 février 2026 avec l'objectif "Livrer toutes les fonctionnalités critiques"
```

```
Crée un sprint de 3 semaines appelé "Sprint Feature X" à partir du lundi prochain
```

---

### 2. **start_sprint** - Démarrer un sprint

```
Démarre le sprint en cours
```

```
Active le sprint pour commencer le travail
```

```
Passe le sprint actuel en mode ACTIVE
```

---

### 3. **complete_sprint** - Terminer un sprint

```
Termine le sprint actuel
```

```
Clôture le sprint en cours et marque-le comme complété
```

```
Finalise le sprint et prépare la rétrospective
```

---

## 📋 Sprint Backlog

### 4. **add_to_sprint_backlog** - Ajouter au sprint backlog

```
Ajoute l'item #2 au sprint actif avec 5 story points
```

```
Place l'item du backlog #4 dans le Sprint Backlog avec estimation de 8 story points
```

```
Ajoute les items #1, #3 et #5 au sprint avec respectivement 3, 5 et 8 story points
```

---

### 5. **get_sprint_backlog** - Afficher le sprint backlog

```
Affiche tous les items du Sprint Backlog actuel
```

```
Montre-moi ce qui est planifié pour ce sprint
```

```
Quelle est la vélocité totale du sprint en story points ?
```

---

## 🎯 Scénario Complet - Sprint Planning

Pour tester un cycle complet de sprint Scrum, exécute ces requêtes dans l'ordre :

### Phase 1 : Préparation (Sprint Planning)
```
1. Crée un workspace SCRUM appelé "Backend API Team"

2. Crée 5 items au backlog :
   - "API Authentication"
   - "User Management endpoints"
   - "Database migrations"
   - "Error handling middleware"
   - "API documentation"

3. Crée un sprint "Sprint 1 - API Foundation" de 2 semaines à partir d'aujourd'hui avec l'objectif "Construire les fondations de l'API"

4. Ajoute les items #1, #2, #3 au sprint avec 5, 8, 3 story points

5. Affiche le Sprint Backlog pour vérifier
```

### Phase 2 : Démarrage du Sprint
```
6. Démarre le sprint

7. Vérifie que le sprint est bien en status ACTIVE

8. Affiche le Sprint Backlog avec les story points
```

### Phase 3 : Pendant le Sprint (Daily Scrum)
```
9. Combien de story points reste-t-il dans le sprint ?

10. Ajoute l'item #4 au sprint avec 5 story points (scope change)

11. Montre-moi la vélocité totale du sprint maintenant
```

### Phase 4 : Fin du Sprint (Review & Retrospective)
```
12. Termine le sprint

13. Quel était le total de story points complétés ?

14. Prépare-moi un résumé du sprint pour la rétrospective
```

---

## 💡 Informations Utiles

### Cycle de vie d'un Sprint
```
PLANNING → (start_sprint) → ACTIVE → (complete_sprint) → COMPLETED
```

### Workspace Scrum requis
- Le Scrum Master Agent travaille uniquement avec des workspaces de type **SCRUM**
- Créer un workspace SCRUM via l'Administration Agent si nécessaire

### Story Points recommandés
- **1-2 SP** : Tâche simple (1-2h)
- **3-5 SP** : Tâche moyenne (1 jour)
- **8 SP** : Tâche complexe (2-3 jours)
- **13+ SP** : À décomposer en tâches plus petites

### Durée des Sprints
- **1 semaine** : Équipes expérimentées, feedbacks rapides
- **2 semaines** : Standard Scrum (recommandé)
- **3 semaines** : Équipes juniors ou projets complexes
- **4 semaines** : Maximum Scrum (rarement utilisé)

---

## 🐛 Debug & Vérification

### Vérifier les sprints
```
Montre-moi tous les sprints du workspace
```

```
Quel est le status du sprint actuel ?
```

```
Y a-t-il un sprint en planning ?
```

### Vérifier le Sprint Backlog
```
Combien d'items sont dans le Sprint Backlog ?
```

```
Quelle est la vélocité totale en story points ?
```

```
Quels items n'ont pas de story points estimés ?
```

### Métriques Scrum
```
Quelle est notre vélocité moyenne sur les 3 derniers sprints ?
```

```
Combien de story points avons-nous complété ce sprint ?
```

```
Le sprint est-il surchargé par rapport à notre capacité ?
```

---

## 📊 Bonnes Pratiques Scrum

### Sprint Planning
```
Aide-moi à planifier le prochain sprint
```

```
Quelle devrait être notre capacité pour ce sprint ?
```

```
Comment prioriser les items du Product Backlog ?
```

### Daily Scrum
```
Quel est l'avancement du sprint aujourd'hui ?
```

```
Combien de story points restent à compléter ?
```

```
Y a-t-il des blocages dans le sprint ?
```

### Sprint Review
```
Montre-moi les items complétés ce sprint
```

```
Qu'est-ce qui n'a pas été terminé ?
```

```
Quelle est notre vélocité pour ce sprint ?
```

### Retrospective
```
Quelle était notre vélocité ce sprint vs le précédent ?
```

```
Recommande des améliorations pour le prochain sprint
```

---

## 🔗 Voir aussi

- [MCP Scrum Master API](../MCP_SCRUM_MASTER_API.md) - Documentation complète des outils
- [Workflow Agent Tests](./Workflow_agent_tests.md) - Tests pour le Kanban
- [Administration Tests](./Administration_agent_tests.md) - Créer des workspaces SCRUM
