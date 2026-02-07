# 🧪 Tests Playground - Administration Agent

Tests des 3 outils MCP de l'Administration Agent dans app.agno.com Playground.

---

## 🏢 Gestion des Workspaces

### 1. **create_space** - Créer un workspace

#### Workspaces KANBAN
```
Crée un workspace Kanban appelé "Marketing Campaign"
```

```
Démarre un nouveau workspace "Support Tickets" en mode KANBAN avec 4 colonnes : To Do, In Progress, Review, Done
```

```
Crée un workspace KANBAN nommé "Design Projects" pour gérer des tâches créatives
```

#### Workspaces SCRUM
```
Crée un workspace Scrum pour l'équipe "Backend Development"
```

```
Démarre un workspace SCRUM appelé "Mobile App Team" avec des sprints de 2 semaines
```

```
Crée un workspace "Product Team" en méthodologie SCRUM pour travailler en itérations
```

---

### 2. **get_user_spaces** - Lister mes workspaces

```
Affiche tous mes workspaces
```

```
Montre-moi la liste de mes espaces de travail avec leur méthodologie
```

```
Combien de workspaces KANBAN vs SCRUM ai-je créés ?
```

---

### 3. **get_space_info** - Détails d'un workspace

```
Affiche les détails du workspace actuel
```

```
Quelle est la méthodologie du workspace "Backend Development" ?
```

```
Donne-moi toutes les informations sur le workspace #3
```

---

## 🎯 Scénario Complet - Création Multi-Workspaces

Pour tester un workflow complet d'administration, exécute ces requêtes dans l'ordre :

### Phase 1 : Découverte & Guidance
```
1. Bonjour, je veux créer mon premier workspace

2. Explique-moi la différence entre KANBAN et SCRUM

3. Quelle méthodologie recommandes-tu pour une équipe Support ?

4. Et pour une équipe de développement produit ?
```

### Phase 2 : Création KANBAN (Support)
```
5. Crée un workspace KANBAN "Customer Support" pour gérer les tickets

6. Affiche les détails de ce workspace

7. Quelles sont les colonnes par défaut créées ?
```

### Phase 3 : Création SCRUM (Dev Team)
```
8. Crée maintenant un workspace SCRUM "Product Development"

9. Vérifie les informations du workspace SCRUM

10. Quelle est la différence entre mes 2 workspaces ?
```

### Phase 4 : Gestion & Organisation
```
11. Affiche tous mes workspaces

12. Recommande-moi quel agent utiliser pour chaque workspace

13. Comment démarrer un sprint dans le workspace SCRUM ?
```

---

## 💡 Informations Utiles

### KANBAN vs SCRUM - Comparaison

| Critère | KANBAN | SCRUM |
|---------|--------|-------|
| **Structure** | Flux continu | Sprints fixes (1-4 semaines) |
| **Rôles** | Pas de rôles définis | Scrum Master, Product Owner, Dev Team |
| **Planification** | À la demande | Sprint Planning régulier |
| **Agent recommandé** | Workflow Agent | Scrum Master Agent |
| **Colonnes** | Personnalisables (To Do, Doing, Done...) | Backlog + Kanban Board |
| **Cérémonies** | Optionnelles | Daily, Review, Retro obligatoires |
| **Utilisation** | Support, Marketing, Ops | Développement produit, Features |

### Méthodologies par équipe
- **Support Client** → KANBAN (tickets continus)
- **Marketing** → KANBAN (campagnes multiples)
- **Opérations/DevOps** → KANBAN (flux de travail)
- **Développement Produit** → SCRUM (sprints, releases)
- **Équipe Feature** → SCRUM (itérations, démos)
- **R&D** → SCRUM (expérimentation, pivots)

### Workflow après création

**Workspace KANBAN créé ?**
→ Utilise le **Workflow Agent** pour :
- Ajouter des items au backlog
- Créer des tâches
- Déplacer les tâches entre colonnes
- Visualiser le Kanban board

**Workspace SCRUM créé ?**
→ Utilise le **Scrum Master Agent** pour :
- Créer des sprints
- Planifier le Sprint Backlog
- Démarrer/terminer les sprints
- Suivre la vélocité

---

## 🐛 Debug & Vérification

### Vérifier les workspaces
```
Liste tous mes workspaces avec leur méthodologie
```

```
Combien de workspaces KANBAN ai-je ?
```

```
Affiche les IDs de tous mes workspaces
```

### Vérifier un workspace spécifique
```
Quel est le propriétaire du workspace "Backend Development" ?
```

```
Quand a été créé le workspace "Support Tickets" ?
```

```
Le workspace actuel est KANBAN ou SCRUM ?
```

### Comparaison
```
Compare mes workspaces KANBAN vs SCRUM
```

```
Quel workspace a été créé en premier ?
```

```
Montre-moi la répartition de mes workspaces par méthodologie
```

---

## 🎓 Questions Pédagogiques

### Choix de méthodologie
```
J'ai une équipe de 5 développeurs qui livrent des features tous les mois, quelle méthodologie ?
```

```
Mon équipe traite 50 tickets de support par jour, KANBAN ou SCRUM ?
```

```
On veut faire des démos toutes les 2 semaines, quelle approche ?
```

```
Notre flux de travail est imprévisible et continu, quelle méthodologie ?
```

### Guidance
```
Comment organiser un workspace SCRUM après création ?
```

```
Quelles colonnes créer pour un workspace KANBAN Support ?
```

```
Explique-moi les étapes pour démarrer mon premier sprint
```

```
Quelle durée de sprint recommandes-tu pour une équipe junior ?
```

### Migration
```
Peut-on passer d'un workspace KANBAN à SCRUM ?
```

```
Comment réorganiser mon workflow en sprints ?
```

```
Mon équipe veut essayer SCRUM, comment commencer ?
```

---

## 🔧 Cas d'Usage Réels

### Startup Tech (Multi-équipes)
```
Crée 3 workspaces :
1. "Engineering Team" en SCRUM avec sprints de 2 semaines
2. "Customer Success" en KANBAN pour les tickets
3. "Marketing" en KANBAN pour les campagnes
```

### Agence de Consulting
```
Pour chaque projet client, crée un workspace SCRUM dédié
```

### Équipe DevOps
```
Workspace KANBAN "Infrastructure" avec colonnes :
- Backlog
- To Deploy
- In Progress
- Testing
- Production
```

### Équipe Produit Agile
```
Workspace SCRUM "Product Roadmap" avec :
- Sprints de 3 semaines
- Sprint Planning tous les lundis
- Demo vendredi
```

---

## 🚀 Best Practices

### Nommage des workspaces
✅ **BON** : "Mobile App Team", "Customer Support Q1 2026", "Backend API v2"
❌ **MAUVAIS** : "Workspace1", "Test", "AAA"

### Organisation
- **1 équipe = 1 workspace** (séparation claire)
- **Méthodologie cohérente** avec le type de travail
- **Nom descriptif** pour identifier rapidement

### Après création
1. **KANBAN** → Configure les colonnes personnalisées (via Workflow Agent)
2. **SCRUM** → Crée le premier sprint (via Scrum Master Agent)
3. **Tous** → Ajoute les membres de l'équipe
4. **Tous** → Crée le Product Backlog initial

---

## 🔗 Voir aussi

- [MCP Administration API](../MCP_ADMINISTRATION_API.md) - Documentation complète des outils
- [Workflow Agent Tests](./Workflow_agent_tests.md) - Tests pour les workspaces KANBAN
- [Scrum Master Tests](./Scrum_master_agent_tests.md) - Tests pour les workspaces SCRUM
- [README.md](../../README.md) - Architecture du système multi-agents
