# System Integration Guide

> Understanding how all components work together in the APCS platform

## Overview

The APCS platform consists of three tightly integrated subsystems that communicate through well-defined interfaces. This document explains the integration points, data flows, and interaction patterns between components.

## System Integration Map

```
┌────────────────────────────────────────────────────────────────┐
│                    End-to-End Request Flow                     │
└────────────────────────────────────────────────────────────────┘

     User Action
         │
         ▼
┌─────────────────┐
│   MicroHack     │  1. User Interface
│   (Frontend)    │     • React components
│                 │     • State management
│   Port: 3001    │     • WebSocket client
└────────┬────────┘
         │
         ├─────► HTTP/REST ──────┐
         │                       │
         └─────► WebSocket ──────┤
                                 ▼
                        ┌─────────────────┐
                        │  APCS Server    │  2. Backend API
                        │  (Node.js)      │     • Authentication
                        │                 │     • Business logic
                        │  Port: 3000     │     • Data persistence
                        └────────┬────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
            ┌──────────┐  ┌──────────┐  ┌──────────┐
            │PostgreSQL│  │  Redis   │  │Socket.io │
            │  (Data)  │  │(Pub/Sub) │  │ (Events) │
            └──────────┘  └──────────┘  └──────────┘
                    │
                    │ Database Access
                    ▼
            ┌─────────────────┐
            │ Agent System    │  3. AI Layer
            │ (Python)        │     • Natural language
            │                 │     • Task automation
            │ Port: 8000      │     • MCP tools
            └─────────────────┘
                    │
                    ├─────► MCP Protocol
                    │
                    └─────► Mistral API
```

## Integration Patterns

### 1. Authentication Flow

**Sequence**: User Login → Token Generation → Token Validation

```
┌─────────┐              ┌──────────┐              ┌───────────┐
│ Browser │              │ Frontend │              │  Backend  │
└────┬────┘              └─────┬────┘              └─────┬─────┘
     │                         │                         │
     │  1. Enter credentials   │                         │
     ├────────────────────────►│                         │
     │                         │  2. POST /api/auth/login│
     │                         ├────────────────────────►│
     │                         │                         │
     │                         │  3. Verify credentials  │
     │                         │     (bcrypt)            │
     │                         │                         │
     │                         │  4. Generate JWT tokens │
     │                         │  { accessToken,         │
     │                         │    refreshToken }       │
     │                         │◄────────────────────────┤
     │                         │                         │
     │  5. Store in context    │                         │
     │     & sessionStorage    │                         │
     │◄────────────────────────┤                         │
     │                         │                         │
     │  6. Subsequent requests │                         │
     │     include token       │                         │
     │                         ├─────────────────────────►
     │                         │  Authorization: Bearer  │
     │                         │  {accessToken}          │
```

**Implementation**:

Frontend:
```typescript
// src/context/AuthContext.tsx
const login = async (email: string, password: string) => {
  const response = await api.post('/api/auth/login', { email, password });
  const { accessToken, user } = response;
  
  setToken(accessToken);
  setUser(user);
  sessionStorage.setItem('accessToken', accessToken);
};
```

Backend:
```typescript
// src/controllers/auth.controller.ts
async login(req, res) {
  const { email, password } = req.body;
  const user = await authService.validateCredentials(email, password);
  
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role
  });
  
  res.json({ accessToken, user });
}
```

### 2. Real-Time Updates Flow

**Sequence**: Database Change → WebSocket Broadcast → UI Update

```
┌─────────┐    ┌──────────┐    ┌──────────┐    ┌─────────┐
│ User A  │    │ Backend  │    │Socket.io │    │ User B  │
└────┬────┘    └─────┬────┘    └─────┬────┘    └────┬────┘
     │               │                │              │
     │ 1. Create task│                │              │
     ├──────────────►│                │              │
     │               │                │              │
     │               │ 2. Save to DB  │              │
     │               │   (Prisma)     │              │
     │               │                │              │
     │               │ 3. Emit event  │              │
     │               ├───────────────►│              │
     │               │ io.to('workspace:123')        │
     │               │   .emit('task:created', task) │
     │               │                │              │
     │               │                │ 4. Broadcast │
     │               │                ├─────────────►│
     │               │                │              │
     │ 5. Receive    │                │ 6. Receive   │
     │    update     │                │    update    │
     │◄──────────────┤                │◄─────────────┤
     │               │                │              │
     │ 7. Update UI  │                │ 8. Update UI │
     │    (React)    │                │    (React)   │
```

**Implementation**:

Backend Service:
```typescript
// src/services/task.service.ts
async createTask(data: CreateTaskDto) {
  const task = await prisma.task.create({ data });
  
  // Emit WebSocket event
  io.to(`workspace:${task.spaceId}`).emit('task:created', task);
  
  return task;
}
```

Frontend Component:
```typescript
// src/components/workspace/KanbanBoard.tsx
useEffect(() => {
  socketManager.joinWorkspace(workspaceId);
  
  socketManager.on('task:created', (task) => {
    setTasks(prev => [...prev, task]);
    showToast('New task added');
  });
  
  return () => {
    socketManager.off('task:created');
    socketManager.leaveWorkspace(workspaceId);
  };
}, [workspaceId]);
```

### 3. AI Agent Interaction Flow

**Sequence**: User Message → Agent Processing → Tool Execution → Response

```
┌────────┐        ┌─────────┐        ┌────────┐        ┌─────────┐
│Frontend│        │ Agent   │        │  MCP   │        │ Backend │
│        │        │ System  │        │ Server │        │   API   │
└───┬────┘        └────┬────┘        └───┬────┘        └────┬────┘
    │                  │                 │                  │
    │ 1. User types:   │                 │                  │
    │ "Create sprint"  │                 │                  │
    ├─────────────────►│                 │                  │
    │ POST /v1/runs/   │                 │                  │
    │      stream      │                 │                  │
    │                  │                 │                  │
    │                  │ 2. Route to     │                  │
    │                  │    Scrum Master │                  │
    │                  │    Agent        │                  │
    │                  │                 │                  │
    │                  │ 3. Parse intent │                  │
    │                  │    (Mistral LLM)│                  │
    │                  │                 │                  │
    │                  │ 4. Call MCP tool│                  │
    │                  │    create_sprint│                  │
    │                  ├────────────────►│                  │
    │                  │                 │                  │
    │                  │                 │ 5. Execute query │
    │                  │                 ├─────────────────►│
    │                  │                 │   INSERT sprint  │
    │                  │                 │                  │
    │                  │                 │ 6. Return data   │
    │                  │                 │◄─────────────────┤
    │                  │                 │                  │
    │                  │ 7. Tool result  │                  │
    │                  │◄────────────────┤                  │
    │                  │                 │                  │
    │                  │ 8. Generate     │                  │
    │                  │    response     │                  │
    │                  │    (Mistral LLM)│                  │
    │                  │                 │                  │
    │ 9. Stream chunks │                 │                  │
    │    (SSE)         │                 │                  │
    │◄─────────────────┤                 │                  │
    │ "Created Sprint 3"                 │                  │
    │ "Dates: Jan 15..."                 │                  │
    │ "[DONE]"         │                 │                  │
```

**Implementation**:

Frontend:
```typescript
// src/lib/chat.ts
async function streamAgentResponse(agent, message, workspaceId, onChunk) {
  const response = await fetch(`${AGENT_API_URL}/v1/runs/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ agent, message, space_id: workspaceId })
  });
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    onChunk(chunk);
  }
}
```

Agent System:
```python
# api/routes/v1_router.py
@router.post("/runs/stream")
async def stream_agent_response(request: AgentRequest):
    agent = get_agent(request.agent)
    context = await get_context(request.space_id)
    
    async def generate():
        async for chunk in agent.run(request.message, stream=True):
            yield f"data: {json.dumps({'content': chunk.content})}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")
```

MCP Tool:
```python
# mcps/scrum_master_mcp.py
@server.call_tool()
async def call_tool(name: str, arguments: dict):
    if name == "create_sprint":
        result = await db.sprints.create(
            space_id=arguments['space_id'],
            name=arguments['name'],
            start_date=arguments['start_date'],
            end_date=arguments['end_date']
        )
        return [TextContent(type="text", text=json.dumps(result))]
```

### 4. Notification Delivery Flow

**Multi-Channel**: Database → WebSocket + Firebase + In-App

```
┌──────────────────────────────────────────────────────────┐
│              Notification Creation Event                 │
└─────────────────────┬────────────────────────────────────┘
                      │
              ┌───────┴───────┐
              │  Backend API  │
              │  Creates      │
              │  Notification │
              └───────┬───────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
┌────────────┐ ┌────────────┐ ┌────────────┐
│PostgreSQL  │ │ Socket.io  │ │  Firebase  │
│Save to DB  │ │ Broadcast  │ │    FCM     │
└────────────┘ └─────┬──────┘ └─────┬──────┘
        │            │              │
        │            ▼              ▼
        │    ┌──────────────┐ ┌──────────────┐
        │    │Active clients│ │Device tokens │
        │    │receive event │ │receive push  │
        │    └──────────────┘ └──────────────┘
        │
        ▼
┌──────────────┐
│ In-App Panel │
│ Stored for   │
│ later access │
└──────────────┘
```

**Implementation**:

Backend:
```typescript
// src/services/notification.service.ts
async createNotification(data: CreateNotificationDto) {
  // 1. Save to database
  const notification = await prisma.notification.create({ data });
  
  // 2. Send via WebSocket
  io.to(`user:${data.userId}`).emit('notification:new', notification);
  
  // 3. Send push notification
  await sendPushNotification(data.userId, {
    title: notification.title,
    body: notification.body,
    data: notification.data
  });
  
  // 4. Publish to Redis (for multi-instance)
  await redis.publish('notifications', JSON.stringify(notification));
  
  return notification;
}
```

Frontend:
```typescript
// src/context/NotificationContext.tsx
useEffect(() => {
  // WebSocket listener
  socketManager.on('notification:new', (notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
  });
  
  // Firebase FCM listener
  onMessage(messaging, (payload) => {
    showBrowserNotification(payload);
  });
}, []);
```

### 5. Document Workflow Integration

**Sequence**: Upload → Workflow Creation → Validator Notifications

```
┌────────┐     ┌─────────┐     ┌─────────┐     ┌──────────┐
│Frontend│     │ Backend │     │Database │     │Validator │
└───┬────┘     └────┬────┘     └────┬────┘     └────┬─────┘
    │               │               │               │
    │ 1. Upload file│               │               │
    ├──────────────►│               │               │
    │               │ 2. Save file  │               │
    │               │    to storage │               │
    │               │               │               │
    │ 3. Create     │               │               │
    │    workflow   │               │               │
    ├──────────────►│               │               │
    │               │ 4. Save       │               │
    │               │    document   │               │
    │               ├──────────────►│               │
    │               │               │               │
    │ 5. Add        │               │               │
    │    validators │               │               │
    ├──────────────►│               │               │
    │               │ 6. Create     │               │
    │               │    validators │               │
    │               ├──────────────►│               │
    │               │               │               │
    │               │ 7. Send       │               │
    │               │    notification               │
    │               ├──────────────────────────────►│
    │               │ Email + Push  │               │
    │               │               │               │
    │               │               │ 8. Validator  │
    │               │               │    approves   │
    │               │◄──────────────────────────────┤
    │               │               │               │
    │               │ 9. Update     │               │
    │               │    status     │               │
    │               ├──────────────►│               │
    │               │               │               │
    │ 10. Broadcast │               │               │
    │     update    │               │               │
    │◄──────────────┤               │               │
```

## Data Synchronization

### Database-First Approach

All persistent data originates in PostgreSQL:

```
    MicroHack ◄───┬───► APCS Server ◄───► PostgreSQL
                  │
    Agent System ◄┘
    
    • MicroHack: Read via REST API
    • APCS Server: Read/Write via Prisma ORM
    • Agent System: Read via MCP, Write via Backend API
```

### State Management

| Layer | State Storage | Persistence | Sync Method |
|-------|--------------|-------------|-------------|
| Frontend | React Context + Local Storage | Temporary | API polling + WebSocket |
| Backend | Memory + Redis | Session-based | Database transactions |
| Database | PostgreSQL | Permanent | ACID transactions |
| Agent | Stateless | None | Context per request |

### Cache Strategy

```
┌─────────────┐         ┌──────────┐         ┌──────────┐
│  Frontend   │────────►│  Redis   │◄────────│PostgreSQL│
│   5 min     │         │  Cache   │         │  Source  │
│  (Context)  │         │  15 min  │         │of Truth  │
└─────────────┘         └──────────┘         └──────────┘
     │                       │
     │                       │
     └───────────────────────┘
         Cache Miss
```

## Error Handling Integration

### Frontend Error Boundaries

```typescript
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    // Log to error tracking service
    logErrorToService(error, errorInfo);
    
    // Show user-friendly message
    this.setState({ hasError: true });
  }
}
```

### Backend Error Propagation

```typescript
// Service throws error
throw new AppError(404, 'Workspace not found');

// Controller catches and formats
catch (error) {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message });
  } else {
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Frontend handles gracefully
catch (error) {
  if (error.response?.status === 404) {
    showError('Workspace not found');
    router.push('/dashboard');
  }
}
```

## Cross-Component Communication

### Event-Driven Architecture

```
             ┌──────────────────┐
             │   Event Bus      │
             │   (Redis)        │
             └────────┬─────────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
    ▼                 ▼                 ▼
┌────────┐      ┌─────────┐      ┌──────────┐
│Backend │      │ Agent   │      │WebSocket │
│Instance│      │ System  │      │ Clients  │
│   #1   │      │         │      │          │
└────────┘      └─────────┘      └──────────┘
```

Events published to Redis are consumed by all subscribers:
- Backend instances (for multi-instance sync)
- Agent system (for awareness of changes)
- WebSocket server (for client broadcasts)

## API Contracts

### REST API

```typescript
// Backend exposes
GET    /api/spaces                    // List workspaces
POST   /api/spaces                    // Create workspace
GET    /api/spaces/:id                // Get workspace details
PUT    /api/spaces/:id                // Update workspace
DELETE /api/spaces/:id                // Delete workspace

GET    /api/spaces/:id/tasks          // List tasks
POST   /api/spaces/:id/tasks          // Create task
PATCH  /api/tasks/:id                 // Update task
DELETE /api/tasks/:id                 // Delete task

// Frontend consumes
const workspaces = await api.get('/api/spaces');
const task = await api.post('/api/spaces/123/tasks', taskData);
```

### WebSocket Events

```typescript
// Backend emits
io.to(`workspace:${id}`).emit('task:created', task);
io.to(`workspace:${id}`).emit('task:updated', task);
io.to(`workspace:${id}`).emit('task:deleted', taskId);
io.to(`user:${userId}`).emit('notification:new', notification);

// Frontend listens
socket.on('task:created', (task) => { /* handle */ });
socket.on('task:updated', (task) => { /* handle */ });
socket.on('task:deleted', (id) => { /* handle */ });
socket.on('notification:new', (notif) => { /* handle */ });
```

### Agent API

```typescript
// Frontend requests
POST /v1/runs/stream
{
  "agent": "workflow",
  "message": "Create a task for login API",
  "space_id": "workspace_123"
}

// Agent system responds (SSE)
data: {"content": "I'll create that task for you.\n"}
data: {"content": "Task created: Login API Implementation\n"}
data: [DONE]
```

## Security Integration

### End-to-End Security

```
Frontend ──┬──► Backend ──┬──► Database
           │              │
           │              └──► Agent System
           │
           └──► JWT in Authorization header
                (verified at each layer)
```

1. **Frontend**: Stores JWT in memory/sessionStorage
2. **Backend**: Verifies JWT signature and expiration
3. **Agent System**: Validates JWT before agent execution
4. **Database**: Row-level security (optional)

### Permission Checking

```typescript
// Backend checks permissions
if (!hasPermission(user, 'workspace:delete', workspace)) {
  throw new ForbiddenError('Insufficient permissions');
}

// Frontend hides UI elements
{hasPermission(user, 'workspace:delete') && (
  <DeleteButton onClick={handleDelete} />
)}
```

## Testing Integration

### End-to-End Test Flow

```typescript
// E2E test simulates full user journey
describe('Create Task Flow', () => {
  it('should create task via AI and update UI', async () => {
    // 1. Login
    await login('user@example.com', 'password');
    
    // 2. Navigate to workspace
    await visit('/workspace/123');
    
    // 3. Open AI chat
    await click('[data-test="chat-button"]');
    
    // 4. Send message
    await type('[data-test="chat-input"]', 'Create task: Build login page');
    await click('[data-test="send-button"]');
    
    // 5. Wait for streaming response
    await waitFor('[data-test="agent-response"]');
    
    // 6. Verify task appears on board
    await waitFor('[data-test="task-card"]');
    expect(screen.getByText('Build login page')).toBeInTheDocument();
  });
});
```

## Performance Considerations

### Request Optimization

```typescript
// Bad: N+1 query problem
const tasks = await getTasks();
for (const task of tasks) {
  task.assignee = await getUser(task.assigneeId);
}

// Good: Join in single query
const tasks = await prisma.task.findMany({
  include: { assignee: true }
});
```

### Caching Strategy

```typescript
// Cache frequently accessed data
const workspace = await cache.get(`workspace:${id}`, async () => {
  return await db.workspaces.findById(id);
}, { ttl: 300 }); // 5 minutes
```

### Connection Pooling

```
Frontend: 100 users × 10 requests/min = 1000 req/min
    ↓
Backend: Connection pool (20 connections)
    ↓
Database: Max connections = 100
```

## Monitoring Integration

### Distributed Tracing

```typescript
// Generate correlation ID
const correlationId = generateId();

// Frontend logs
logger.info('API request started', { correlationId, endpoint: '/api/tasks' });

// Backend logs
logger.info('Processing request', { correlationId, userId, action: 'create_task' });

// Agent logs
logger.info('Agent execution', { correlationId, agent: 'workflow', message });
```

### Health Check Aggregation

```typescript
// System health endpoint
GET /health/system

{
  "status": "healthy",
  "components": {
    "frontend": { "status": "up", "responseTime": "45ms" },
    "backend": { "status": "up", "responseTime": "12ms" },
    "agents": { "status": "up", "responseTime": "230ms" },
    "database": { "status": "up", "connections": 15 },
    "redis": { "status": "up", "memory": "45MB" }
  }
}
```

---

**Strong integration creates a seamless user experience** 🔗
