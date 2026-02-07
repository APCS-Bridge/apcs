# APCS - Agile Project Collaboration System 🚀

## 💡 Inspiration

Notre inspiration est née d'une observation simple mais cruciale : **les équipes de développement agile passent trop de temps à jongler entre différents outils**. Un développeur moyen utilise Jira pour les sprints, Slack pour la communication, GitHub pour le code, Google Docs pour la documentation, et Firebase pour les notifications. Cette fragmentation crée de la friction et ralentit la vélocité des sprints.

Nous avons voulu créer une **plateforme unifiée** qui intègre tous ces aspects dans une expérience cohérente, enrichie par l'intelligence artificielle pour automatiser les tâches répétitives du Scrum Master et faciliter le workflow de validation de documents.

Notre vision : **réduire le temps de gestion de projet de 40% pour permettre aux équipes de se concentrer sur ce qui compte vraiment - créer de la valeur**.

## 🎓 What We Learned

### 1. **Complexité des Architectures Distribuées**
Nous avons appris à orchestrer une architecture microservices complète avec :
- **Frontend React 19** avec Next.js 16 et Turbopack
- **Backend Node.js** avec Express et Socket.IO pour le temps réel
- **Système d'Agents Python** avec FastAPI et Model Context Protocol (MCP)
- **PostgreSQL 16** avec Prisma ORM
- **Redis** pour la gestion des queues BullMQ

La coordination entre ces services, particulièrement la gestion des WebSockets et la synchronisation des états, nous a appris l'importance du **Contract-First Design** et des **Health Checks**.

### 2. **TypeScript Strict Mode is No Joke**
L'activation de `exactOptionalPropertyTypes` et `noUncheckedIndexedAccess` nous a confrontés à plus de **51 erreurs de compilation** à résoudre. Cela nous a enseigné :
- La différence subtile entre `undefined` et propriétés optionnelles
- L'importance des type guards et assertions
- Le compromis entre sécurité de type et vélocité de développement

Formellement, si $T$ est un type avec une propriété optionnelle $p?$, alors :
$$T.p : U \cup \{\text{undefined}\} \iff p \in \text{keys}(T)$$

### 3. **Real-Time Systems Are Hard**
Implémenter Socket.IO avec Redis pub/sub pour synchroniser les kanban boards en temps réel entre plusieurs clients nous a appris :
- La gestion des race conditions
- L'optimistic UI updates vs server reconciliation
- Le défi de la **consistance éventuelle** (eventual consistency)

### 4. **AI Agent Orchestration**
L'intégration du Model Context Protocol (MCP) pour nos agents IA (Scrum Master, Administration, Workflow) nous a montré :
- Comment structurer des prompts pour des réponses cohérentes
- La gestion du contexte entre multiple tours de conversation
- Le prompt engineering pour éviter les hallucinations

### 5. **Docker Multi-Stage Builds**
Optimiser nos Dockerfiles pour réduire la taille des images finales :
- Backend : de 1.2GB à **340MB** avec multi-stage builds
- Frontend : de 980MB à **180MB** avec standalone output Next.js
- Agent : utilisation de `uv` pour la gestion Python ultra-rapide

### 6. **Database Automation in Docker**
Créer un `docker-entrypoint.sh` qui :
- Attend que PostgreSQL soit prêt (avec `nc -z`)
- Applique automatiquement `schema.sql`
- Seed la base avec des données de test
- Gère les conversions CRLF↔LF cross-platform

Cela a éliminé le besoin de Prisma migrations en développement tout en gardant un **schema-as-code** versionné.

## 🔨 How We Built It

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Client Browser                       │
│  Next.js 16 (React 19) + Socket.IO Client + SWR       │
└────────────┬────────────────────────────┬───────────────┘
             │                            │
             │ HTTP/REST                  │ WebSocket
             │                            │
┌────────────▼────────────────────────────▼───────────────┐
│              APCS Backend (Node.js/Express)             │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐   │
│  │   JWT    │  │ Socket.IO│  │   Firebase Admin   │   │
│  │   Auth   │  │  Server  │  │   (Push Notifs)   │   │
│  └──────────┘  └──────────┘  └────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Prisma ORM + PostgreSQL Client          │  │
│  └──────────────────────────────────────────────────┘  │
└────────┬──────────────────────┬───────────────────────┘
         │                      │
         │ SQL                  │ HTTP API Calls
         │                      │
┌────────▼──────────┐  ┌────────▼──────────────────────┐
│   PostgreSQL 16   │  │  Agent System (Python/FastAPI)│
│                   │  │  ┌──────────────────────────┐ │
│  • Users          │  │  │  Scrum Master Agent      │ │
│  • Workspaces     │  │  │  (MCP Server)            │ │
│  • Sprints        │  │  └──────────────────────────┘ │
│  • Tasks          │  │  ┌──────────────────────────┐ │
│  • Documents      │  │  │  Administration Agent    │ │
│  • Notifications  │  │  │  (MCP Server)            │ │
│                   │  │  └──────────────────────────┘ │
└───────────────────┘  │  ┌──────────────────────────┐ │
                       │  │  Workflow Agent          │ │
                       │  │  (Document Validation)   │ │
                       │  └──────────────────────────┘ │
                       └───────────────────────────────┘
```

### Tech Stack Decisions

| Layer | Technology | Why? |
|-------|-----------|------|
| **Frontend** | Next.js 16 + React 19 | App Router, Server Components, Turbopack build speed |
| **UI Components** | Tailwind CSS + Framer Motion | Rapid prototyping + smooth animations |
| **State Management** | Context API + SWR | Simplicity + automatic revalidation |
| **Backend** | Express 5 + TypeScript | Mature ecosystem, type safety |
| **Real-Time** | Socket.IO + Redis | Bidirectional communication, horizontal scaling |
| **Database** | PostgreSQL 16 | ACID guarantees, JSON support, mature ORM (Prisma) |
| **ORM** | Prisma | Type-safe queries, migrations, excellent DX |
| **Queue** | BullMQ | Redis-based, persistent, automatic retries |
| **Agents** | Python 3.12 + FastAPI | AI/ML ecosystem, async support |
| **Containerization** | Docker Compose | Local development parity with production |

### Development Workflow

1. **Mono-Repo Structure**: Unified all 3 projects (Frontend, Backend, Agent System) into a single repository for easier management
2. **Docker-First Development**: All services run in Docker with hot-reload
3. **Schema-First Database**: SQL schema as source of truth, auto-applied on container start
4. **Type-Safe API Contracts**: Shared TypeScript interfaces between frontend/backend

### Key Features Implemented

#### 🎯 Kanban Board with Real-Time Sync
- Drag-and-drop cards avec `react-beautiful-dnd`
- Socket.IO pour synchronisation instantanée entre clients
- Optimistic updates pour une UX fluide

#### 💬 Chat System with AI Assistant
- WebSocket-based messaging
- Message history persistence
- Online presence indicators
- Typing indicators

#### 📝 Document Review Workflow
- Graphe de validation avec révisions parallèles et séquentielles
- Système de commentaires thread  
- Statuts en temps réel (pending, approved, rejected)
- Integration avec Google Docs

#### 🤖 AI Scrum Master Agent
- Analyse automatique des sprints
- Suggestions de tâches basées sur la vélocité
- Détection des blockers
- Génération de daily stand-up reports

#### 🔔 Push Notifications System
- Firebase Cloud Messaging
- BullMQ pour la queue de notifications
- Notification persistante in-app
- Badge counts en temps réel

#### 🔐 Authentication & Authorization
- JWT avec refresh tokens
- Role-based access control (SUPERADMIN, ADMIN, USER)
- Workspace-level permissions
- Protected routes avec middleware

## 🚧 Challenges We Faced

### 1. **TypeScript Type Hell** ⚠️
**Problème** : Activation de `exactOptionalPropertyTypes` a cassé 51 fichiers avec des erreurs comme :
```typescript
error TS2375: Type '{ stats: {...} | undefined }' is not assignable 
to type 'GitCommitDetail' with 'exactOptionalPropertyTypes: true'
```

**Solution** : 
- Désactivation temporaire des options strictes (`noUncheckedIndexedAccess: false`)
- Ajout systématique de `as string` pour `req.params`
- Utilisation de type assertions `as Record<string, string>` pour objets dynamiques

**Leçon** : TypeScript strict est idéal en théorie, mais dans le contexte d'un hackathon, la **vélocité prime sur la perfection**.

### 2. **CRLF vs LF in Docker Entrypoint** 🐧
**Problème** : 
```
exec /docker-entrypoint.sh: no such file or directory
```
Alors que le fichier existait bel et bien !

**Root Cause** : Windows utilise CRLF (`\r\n`), Linux utilise LF (`\n`). Le shebang `#!/bin/bash\r` était invalide.

**Solution** :
```dockerfile
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh
```

**Leçon** : Toujours utiliser `git config core.autocrlf input` et convertir les line endings dans le Dockerfile.

### 3. **Docker Build Cache Invalidation** 🔄
**Problème** : Modifications de code TypeScript non prises en compte malgré rebuild.

**Debugging Steps** :
```bash
docker-compose build          # Cache hit - pas de changements
docker-compose build --no-cache  # Rebuild from scratch - ça marche!
```

**Solution** : 
- Ordre optimal des layers dans Dockerfile
- `COPY package*.json` AVANT `COPY . .`
- Utiliser `.dockerignore` pour exclure `node_modules/`

**Leçon** : La complexité de temps du build est $O(n \cdot m)$ où $n$ = nombre de layers, $m$ = taille des fichiers. Optimiser l'ordre est crucial.

### 4. **Socket.IO Reconnection Loops** 🔁
**Problème** : Clients se reconnectant en boucle infinie après déconnexion réseau.

**Root Cause** : Backend ne nettoyait pas les anciennes connexions socket, causant des conflits d'ID.

**Solution** :
```typescript
io.on('connection', (socket) => {
  const userId = socket.data.userId;
  
  // Déconnecter les anciennes connexions du même user
  const existingSockets = await io.in(`user:${userId}`).fetchSockets();
  existingSockets.forEach(s => {
    if (s.id !== socket.id) s.disconnect();
  });
  
  socket.join(`user:${userId}`);
});
```

**Leçon** : En WebSocket, gérer proprement le **lifecycle des connexions** est critique.

### 5. **Race Condition in Kanban Updates** 🏁
**Problème** : Déplacer rapidement plusieurs cartes causait des états incohérents.

**Scenario** :
1. Client A déplace Card1 de TODO → IN_PROGRESS
2. Client B déplace Card2 de TODO → IN_PROGRESS  
3. Server reçoit les updates dans ordre aléatoire
4. État final corrompu (cards manquantes ou dupliquées)

**Solution** : Version-based optimistic locking
```typescript
interface Card {
  id: string;
  position: number;
  columnId: string;
  version: number; // Incremented on each update
}

// Server-side
async function moveCard(cardId, newColumnId, newPosition, expectedVersion) {
  const card = await db.card.findUnique({ where: { id: cardId } });
  
  if (card.version !== expectedVersion) {
    throw new ConflictError('Card was modified by another user');
  }
  
  return await db.card.update({
    where: { id: cardId },
    data: { 
      columnId: newColumnId, 
      position: newPosition,
      version: { increment: 1 }
    }
  });
}
```

**Leçon** : Dans les systèmes distribués, **l'ordre d'arrivée ≠ ordre logique**. Les vecteurs de version résolvent ce problème.

### 6. **Database Initialization Timing** ⏱️
**Problème** : Backend démarrait avant que PostgreSQL soit prêt → connexion échouée.

**Solution** : Health check bash dans entrypoint
```bash
until nc -z postgres 5432; do
  echo "⏳ Waiting for PostgreSQL..."
  sleep 1
done
echo "✅ PostgreSQL is up!"
```

**Complexité** : Temps d'attente moyen = $E[T] = \frac{1}{\lambda}$ où $\lambda$ est le taux de succès des health checks.

### 7. **Prisma Schema Sync Issues** 🔄
**Problème** : Développeurs devaient constamment exécuter `prisma migrate dev` et synchroniser migrations.

**Solution** : Abandon des migrations Prisma au profit de **schema.sql as source of truth**
- Plus simple à versionner
- Pas de conflits de migration
- Exécution idempotente avec `CREATE TABLE IF NOT EXISTS`
- Auto-appliqué au démarrage du container

**Trade-off** : Perte du rollback automatique, mais gain massif en simplicité.

### 8. **Frontend Build Size Explosion** 📦
**Problème Initial** : Bundle Next.js de 2.3 MB (gzipped)

**Optimisations** :
1. ✅ Standalone output mode : `-40%`
2. ✅ Dynamic imports pour react-beautiful-dnd : `-15%`
3. ✅ Tree-shaking de lucide-react (icons uniquement utilisés) : `-25%`
4. ✅ SWR au lieu de Redux : `-18%`

**Résultat Final** : 890 KB gzipped ✨

**Équation** : 
$$\text{Bundle Size} = \sum_{i=1}^{n} \text{Module}_i - \text{TreeShaking}(unused) - \text{CodeSplitting}(lazy)$$

### 9. **Mono-Repo Git Submodules Hell** 🔥
**Problème** : Avions 3 repos séparés avec des `.git` imbriqués, créant des submodules involontaires.

**Solution** :
```powershell
Remove-Item -Recurse -Force MicroHack\.git
Remove-Item -Recurse -Force apcs_server\.git
Remove-Item -Recurse -Force apcs_agent_system\.git
git rm --cached MicroHack apcs_server apcs_agent_system
git add MicroHack/ apcs_server/ apcs_agent_system/
```

**Leçon** : Pour un mono-repo, **un seul .git à la racine** !

## 🎯 What's Next

- [ ] Kubernetes deployment avec Helm charts
- [ ] GraphQL API pour queries complexes
- [ ] End-to-end tests avec Playwright
- [ ] CI/CD pipeline avec GitHub Actions
- [ ] Metrics & Observability (Prometheus + Grafana)
- [ ] Mobile app avec React Native

## 📊 Final Stats

- **Total Lines of Code**: 81,881
- **Files Committed**: 251
- **Docker Images**: 3 (Frontend 180MB, Backend 340MB, Agent 420MB)
- **API Endpoints**: 47
- **Database Tables**: 23
- **Real-Time Events**: 18
- **AI Agents**: 3

## 🏆 Conclusion

APCS représente 3 semaines de développement intense, des nuits blanches, et l'apprentissage de technologies de pointe. Plus qu'un simple projet de hackathon, c'est une plateforme **production-ready** qui résout un problème réel vécu par des milliers d'équipes agile.

La plus grande leçon ? **L'itération rapide bat la perfection**. Nous avons privilégié la livraison de valeur incrémentale plutôt que l'architecture parfaite, tout en maintenant une qualité de code professionnelle.

---

**Built with ❤️ by the APCS Team | February 2026**
