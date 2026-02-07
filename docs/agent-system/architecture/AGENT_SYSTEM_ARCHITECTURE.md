# Agent System Architecture

> AI-powered automation layer using Agno framework, MCP protocol, and Mistral Large

## Overview

The APCS Agent System is an intelligent automation layer that provides natural language interfaces to project management operations. Built on the Agno multi-agent framework and leveraging the Model Context Protocol (MCP), it enables users to interact with their workspaces through conversational commands while maintaining type-safe access to data and operations.

## Architectural Philosophy

### Domain-Driven Design

The agent system is organized around three business domains, each with its own specialized agent:

```
┌─────────────────────────────────────────────────────────────┐
│                  Agent System Architecture                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────────┐  ┌──────────────────┐  ┌─────────┐ │
│   │  Administration  │  │    Workflow      │  │  Scrum  │ │
│   │      Agent       │  │     Agent        │  │ Master  │ │
│   │                  │  │                  │  │  Agent  │ │
│   │  • Workspaces    │  │  • Backlog       │  │ • Sprints│ │
│   │  • Users         │  │  • Tasks         │  │ • Planning│ │
│   │  • Permissions   │  │  • Columns       │  │ • Metrics│ │
│   └────────┬─────────┘  └────────┬─────────┘  └────┬────┘ │
│            │                     │                  │      │
│            └─────────────────────┴──────────────────┘      │
│                              │                             │
└──────────────────────────────┼─────────────────────────────┘
                               │
                        ┌──────┴──────┐
                        │  Agno 1.8.4 │
                        │  Framework  │
                        └──────┬──────┘
                               │
                    ┌──────────┴──────────┐
                    │  MCP Protocol Layer │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Administration  │  │   Workflow      │  │  Scrum Master   │
│   MCP Server    │  │   MCP Server    │  │   MCP Server    │
│   (3 tools)     │  │   (9 tools)     │  │   (5 tools)     │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                     │
         └────────────────────┴─────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   PostgreSQL DB   │
                    │  & External API   │
                    └───────────────────┘
```

### Key Design Principles

1. **Separation of Concerns**: Each agent handles a specific domain
2. **Context Awareness**: Agents understand current workspace and user state
3. **Type Safety**: MCP provides strongly-typed tool definitions
4. **Extensibility**: New tools can be added without modifying agents
5. **Idempotency**: Operations can be retried safely
6. **Observability**: Comprehensive logging and error tracking

## Technology Stack

### Core Framework
- **Agno 1.8.4**: Multi-agent orchestration framework
  - Structured output generation
  - Tool calling capabilities
  - Context management
  - Response streaming

### Language Model
- **Mistral Large**: State-of-the-art language model
  - Natural language understanding
  - Function calling support
  - Large context window (32k tokens)
  - Fast inference

### API Layer
- **FastAPI**: Modern Python web framework
  - Async request handling
  - Automatic API documentation
  - Pydantic data validation
  - WebSocket support for streaming

### Protocol
- **MCP (Model Context Protocol)**: Standardized tool interface
  - Type-safe tool definitions
  - Automatic documentation generation
  - LLM-optimized descriptions
  - Parameter validation

### Database Access
- **asyncpg**: PostgreSQL async driver
- **PostgreSQL 16**: Shared database with main backend

## Project Structure

```
apcs_agent_system/
├── agents/                        # Agent implementations
│   ├── __init__.py
│   ├── administration_agent.py   # Workspace & user management
│   ├── workflow_agent.py         # Backlog & task management
│   ├── scrum_master_agent.py     # Sprint management
│   └── settings.py               # Agent configuration
│
├── mcps/                          # MCP server implementations
│   ├── __init__.py
│   ├── administration_mcp.py     # 3 administration tools
│   ├── workflow_mcp.py           # 9 workflow tools
│   └── scrum_master_mcp.py       # 5 scrum master tools
│
├── api/                           # FastAPI application
│   ├── __init__.py
│   ├── main.py                   # API entry point
│   ├── settings.py               # Configuration
│   ├── middleware/
│   │   ├── __init__.py
│   │   └── auth.py               # JWT authentication
│   └── routes/
│       ├── __init__.py
│       ├── v1_router.py          # Main API router
│       ├── context.py            # Context endpoints
│       ├── playground.py         # Testing interface
│       └── status.py             # Health checks
│
├── db/                            # Database layer
│   ├── __init__.py
│   ├── connection.py             # Connection pool
│   ├── schema.sql                # Database schema
│   ├── seed.sql                  # Test data
│   └── tables/                   # Table-specific queries
│       ├── __init__.py
│       ├── user.py
│       ├── space.py
│       ├── backlog_item.py
│       ├── sprint.py
│       ├── task.py
│       └── column.py
│
├── docs/                          # Documentation
│   ├── MCP_ADMINISTRATION_API.md
│   ├── MCP_WORKFLOW_API.md
│   ├── MCP_SCRUM_MASTER_API.md
│   ├── QUICK_START.md
│   └── tests/                    # Test documentation
│
├── utils/                         # Shared utilities
│   ├── __init__.py
│   ├── log.py                    # Logging configuration
│   └── dttm.py                   # Date/time utilities
│
├── workspace/                     # Agent workspace
│   ├── __init__.py
│   ├── settings.py
│   └── example_secrets/          # Secret templates
│
├── pyproject.toml                # Project metadata
├── requirements.txt              # Dependencies
├── Dockerfile                    # Container definition
├── docker-compose.yml            # Local development
└── README.md                     # Main documentation
```

## Agent Implementations

### 1. Administration Agent

**File**: [agents/administration_agent.py](../agents/administration_agent.py)

**Purpose**: Manage workspaces and users

**Capabilities**:
- Create workspaces with methodology selection
- List user's accessible workspaces
- Get detailed workspace information
- Manage workspace metadata

**Example Interaction**:
```
User: "Create a new Scrum workspace called 'Project Phoenix'"

Agent: I'll create that workspace for you.
       [Calls create_space tool]
       ✅ Created workspace 'Project Phoenix' with Scrum methodology.
       Workspace ID: ws_abc123
       You've been added as the owner.
```

**Implementation Pattern**:
```python
from agno import Agent, MCP

admin_agent = Agent(
    name="Administration Agent",
    model="mistral-large-latest",
    description="Manages workspaces and user access",
    instructions=[
        "You help users create and manage workspaces",
        "Always confirm the methodology (KANBAN or SCRUM) before creating",
        "Provide clear feedback about operations",
    ],
    tools=[MCP("administration")],
    show_tool_calls=True,
    markdown=True,
)
```

### 2. Workflow Agent

**File**: [agents/workflow_agent.py](../agents/workflow_agent.py)

**Purpose**: Manage backlogs, tasks, and Kanban boards

**Capabilities**:
- Create and prioritize backlog items
- Create tasks from backlog items
- Move tasks between columns
- Assign tasks to team members
- Manage Kanban columns
- Track task status

**Example Interaction**:
```
User: "Create a user story for implementing authentication with 8 story points"

Agent: I'll create that user story for you.
       [Calls create_backlog_item tool]
       ✅ Created backlog item #42: "Implement authentication"
       • Story points: 8
       • Status: TODO
       • Priority: Medium
       
       Would you like to add this to the current sprint or create a task for it?
```

**Implementation Pattern**:
```python
workflow_agent = Agent(
    name="Workflow Agent",
    model="mistral-large-latest",
    description="Manages product backlog and Kanban workflows",
    instructions=[
        "Help users manage their product backlog and tasks",
        "Use story points when mentioned (Fibonacci: 1,2,3,5,8,13,21)",
        "Suggest creating tasks when backlog items are ready",
        "Always confirm before moving tasks between columns",
    ],
    tools=[MCP("workflow")],
    show_tool_calls=True,
    markdown=True,
)
```

### 3. Scrum Master Agent

**File**: [agents/scrum_master_agent.py](../agents/scrum_master_agent.py)

**Purpose**: Sprint planning and management

**Capabilities**:
- Create sprints with date ranges
- Start and complete sprints
- Add items to sprint backlog
- Track sprint progress
- Calculate sprint metrics

**Example Interaction**:
```
User: "Create a 2-week sprint starting next Monday"

Agent: I'll create that sprint for you.
       [Calls create_sprint tool]
       ✅ Created Sprint #3
       • Name: Sprint 3
       • Duration: 2 weeks
       • Start: Jan 15, 2026
       • End: Jan 29, 2026
       • Status: PLANNING
       
       Sprint is ready for planning. Add backlog items using:
       "Add backlog item #42 to this sprint"
```

**Implementation Pattern**:
```python
scrum_master_agent = Agent(
    name="Scrum Master Agent",
    model="mistral-large-latest",
    description="Handles sprint planning and Scrum ceremonies",
    instructions=[
        "Guide users through sprint planning and execution",
        "Typical sprint durations: 1-4 weeks",
        "Remind users to start sprints after planning",
        "Provide sprint metrics when completing sprints",
    ],
    tools=[MCP("scrum_master")],
    show_tool_calls=True,
    markdown=True,
)
```

## MCP Protocol Implementation

### MCP Server Structure

Each MCP server provides a set of related tools:

```python
from mcp.server import Server
from mcp.types import Tool, TextContent

server = Server("administration")

@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="create_space",
            description="Create a new workspace with specified methodology",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Workspace name"
                    },
                    "methodology": {
                        "type": "string",
                        "enum": ["KANBAN", "SCRUM"],
                        "description": "Project management methodology"
                    },
                    "description": {
                        "type": "string",
                        "description": "Optional workspace description"
                    }
                },
                "required": ["name", "methodology"]
            }
        ),
        # ... more tools
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    if name == "create_space":
        result = await create_space_handler(arguments)
        return [TextContent(
            type="text",
            text=json.dumps(result, indent=2)
        )]
    # ... handle other tools
```

### Tool Categories

**Administration MCP** (3 tools):
```python
1. create_space(name, methodology, description?)
   → Creates workspace and adds user as owner

2. get_user_spaces()
   → Returns list of accessible workspaces

3. get_space_info(space_id?)
   → Returns detailed workspace information
```

**Workflow MCP** (9 tools):
```python
# Backlog Management
1. create_backlog_item(title, description?, story_points?, priority?)
2. get_backlog(space_id?)
3. update_backlog_item(item_id, updates)

# Task Management
4. create_task(backlog_item_id, column_id?, title?)
5. move_task(task_id, column_id)
6. assign_task(task_id, user_id)

# Board Management
7. create_column(name, order?)
8. get_kanban_board(space_id?)
9. get_column_tasks(column_id)
```

**Scrum Master MCP** (5 tools):
```python
# Sprint Lifecycle
1. create_sprint(name, start_date, end_date)
2. start_sprint(sprint_id?)
3. complete_sprint(sprint_id?)

# Sprint Backlog
4. add_to_sprint_backlog(backlog_item_id, sprint_id?)
5. get_sprint_backlog(sprint_id?)
```

## Context Management

### Automatic Context Injection

Agents receive rich context automatically:

```python
class AgentContext:
    """Context provided to every agent request"""
    
    # User Information
    user_id: str
    user_name: str
    user_email: str
    user_role: str  # USER, ADMIN, SUPERADMIN
    
    # Workspace Information
    space_id: str
    space_name: str
    methodology: str  # KANBAN, SCRUM
    
    # Active Sprint (if Scrum)
    active_sprint: Optional[Sprint]
    
    # Available Users
    workspace_members: List[WorkspaceMember]
    
    # Metadata
    request_id: str
    timestamp: datetime
```

### Context Resolution

**File**: [api/routes/context.py](../api/routes/context.py)

```python
@router.get("/context")
async def get_agent_context(
    space_id: Optional[str] = None,
    user_id: str = Depends(get_current_user)
) -> AgentContext:
    """Get complete context for agent execution"""
    
    # Get user info
    user = await db.users.get_by_id(user_id)
    
    # Get workspace info
    if not space_id:
        space_id = await db.users.get_default_workspace(user_id)
    
    workspace = await db.spaces.get_by_id(space_id)
    
    # Get active sprint (if Scrum)
    active_sprint = None
    if workspace.methodology == "SCRUM":
        active_sprint = await db.sprints.get_active(space_id)
    
    # Get workspace members
    members = await db.space_members.list_by_space(space_id)
    
    return AgentContext(
        user_id=user.id,
        user_name=user.name,
        user_email=user.email,
        user_role=user.role,
        space_id=workspace.id,
        space_name=workspace.name,
        methodology=workspace.methodology,
        active_sprint=active_sprint,
        workspace_members=members,
        request_id=generate_request_id(),
        timestamp=datetime.utcnow()
    )
```

## API Endpoints

### Main API Router

**File**: [api/main.py](../api/main.py)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="APCS Agent System",
    description="AI-powered project management automation",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3001")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(v1_router, prefix="/v1")
app.include_router(context_router, prefix="/api")
app.include_router(status_router)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}
```

### Streaming Endpoint

**File**: [api/routes/v1_router.py](../api/routes/v1_router.py)

```python
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from agents import admin_agent, workflow_agent, scrum_master_agent

router = APIRouter()

@router.post("/runs/stream")
async def stream_agent_response(
    request: AgentRequest,
    context: AgentContext = Depends(get_agent_context)
):
    """Stream agent response using Server-Sent Events"""
    
    # Select agent
    agent = {
        "administration": admin_agent,
        "workflow": workflow_agent,
        "scrum_master": scrum_master_agent,
    }[request.agent]
    
    # Create streaming generator
    async def generate():
        # Inject context into message
        enriched_message = f"""
Context:
- User: {context.user_name} ({context.user_email})
- Workspace: {context.space_name} ({context.methodology})
- Active Sprint: {context.active_sprint.name if context.active_sprint else 'None'}

User Request: {request.message}
"""
        
        # Stream response
        async for chunk in agent.run(enriched_message, stream=True):
            if chunk.content:
                yield f"data: {json.dumps({'content': chunk.content})}\n\n"
        
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
```

## Database Integration

### Connection Pool

**File**: [db/connection.py](../db/connection.py)

```python
import asyncpg
from typing import Optional

class Database:
    _pool: Optional[asyncpg.Pool] = None
    
    @classmethod
    async def connect(cls):
        """Create connection pool"""
        if cls._pool is None:
            cls._pool = await asyncpg.create_pool(
                host=os.getenv("DB_HOST", "localhost"),
                port=int(os.getenv("DB_PORT", "5432")),
                user=os.getenv("DB_USER", "microhack"),
                password=os.getenv("DB_PASSWORD"),
                database=os.getenv("DB_NAME", "collaboration_platform"),
                min_size=5,
                max_size=20,
            )
    
    @classmethod
    async def disconnect(cls):
        """Close connection pool"""
        if cls._pool:
            await cls._pool.close()
            cls._pool = None
    
    @classmethod
    def get_pool(cls) -> asyncpg.Pool:
        """Get connection pool"""
        if cls._pool is None:
            raise RuntimeError("Database not connected")
        return cls._pool

# Initialize on startup
@app.on_event("startup")
async def startup():
    await Database.connect()

@app.on_event("shutdown")
async def shutdown():
    await Database.disconnect()
```

### Table Modules

**File**: [db/tables/space.py](../db/tables/space.py)

```python
from db.connection import Database

class SpaceTable:
    @staticmethod
    async def create(name: str, methodology: str, owner_id: str, description: str = None):
        """Create new workspace"""
        pool = Database.get_pool()
        
        async with pool.acquire() as conn:
            async with conn.transaction():
                # Insert space
                space = await conn.fetchrow(
                    """
                    INSERT INTO spaces (name, methodology, owner_id, description)
                    VALUES ($1, $2, $3, $4)
                    RETURNING *
                    """,
                    name, methodology, owner_id, description
                )
                
                # Add owner as member
                await conn.execute(
                    """
                    INSERT INTO space_members (space_id, user_id, scrum_role)
                    VALUES ($1, $2, $3)
                    """,
                    space['id'], owner_id, 
                    'PRODUCT_OWNER' if methodology == 'SCRUM' else None
                )
                
                return dict(space)
    
    @staticmethod
    async def get_by_id(space_id: str):
        """Get workspace by ID"""
        pool = Database.get_pool()
        
        async with pool.acquire() as conn:
            space = await conn.fetchrow(
                "SELECT * FROM spaces WHERE id = $1",
                space_id
            )
            return dict(space) if space else None
    
    @staticmethod
    async def list_user_spaces(user_id: str):
        """List workspaces accessible to user"""
        pool = Database.get_pool()
        
        async with pool.acquire() as conn:
            spaces = await conn.fetch(
                """
                SELECT s.* FROM spaces s
                JOIN space_members sm ON s.id = sm.space_id
                WHERE sm.user_id = $1
                ORDER BY s.created_at DESC
                """,
                user_id
            )
            return [dict(space) for space in spaces]
```

## Error Handling & Logging

### Structured Logging

**File**: [utils/log.py](../utils/log.py)

```python
import logging
import json
from datetime import datetime

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_data)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("agent_system.log")
    ]
)

logger = logging.getLogger("agent_system")
logger.addHandler(logging.StreamHandler())
logger.handlers[0].setFormatter(JSONFormatter())
```

### Agent Error Handling

```python
from fastapi import HTTPException

class AgentError(Exception):
    """Base agent error"""
    pass

class ToolExecutionError(AgentError):
    """Tool execution failed"""
    pass

class ContextError(AgentError):
    """Context resolution failed"""
    pass

@router.post("/runs/stream")
async def stream_agent_response(request: AgentRequest):
    try:
        # ... agent execution
        pass
    except ToolExecutionError as e:
        logger.error(f"Tool execution failed: {e}")
        raise HTTPException(status_code=500, detail="Tool execution error")
    except ContextError as e:
        logger.error(f"Context error: {e}")
        raise HTTPException(status_code=400, detail="Invalid context")
    except Exception as e:
        logger.exception("Unexpected error")
        raise HTTPException(status_code=500, detail="Internal server error")
```

## Performance Optimization

### Response Streaming

Streaming improves perceived performance:

```python
# Instead of waiting for complete response
response = await agent.run(message)  # Wait 5-10 seconds

# Stream tokens as generated
async for chunk in agent.run(message, stream=True):
    yield chunk  # Send immediately
```

### Database Query Optimization

```python
# Use connection pooling
pool = await asyncpg.create_pool(max_size=20)

# Pre fetch related data
workspace = await conn.fetchrow("""
    SELECT 
        s.*,
        COUNT(sm.user_id) as member_count,
        COUNT(t.id) as task_count
    FROM spaces s
    LEFT JOIN space_members sm ON s.id = sm.space_id
    LEFT JOIN tasks t ON s.id = t.space_id
    WHERE s.id = $1
    GROUP BY s.id
""", space_id)
```

### Caching Strategy

```python
from functools import lru_cache
from datetime import datetime, timedelta

# Cache context for 5 minutes
context_cache = {}

async def get_cached_context(space_id: str, user_id: str):
    cache_key = f"{space_id}:{user_id}"
    
    if cache_key in context_cache:
        cached, timestamp = context_cache[cache_key]
        if datetime.utcnow() - timestamp < timedelta(minutes=5):
            return cached
    
    context = await get_agent_context(space_id, user_id)
    context_cache[cache_key] = (context, datetime.utcnow())
    
    return context
```

## Deployment

### Docker Configuration

**File**: [Dockerfile](../Dockerfile)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Configuration

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=microhack
DB_PASSWORD=securepassword
DB_NAME=collaboration_platform

# Mistral API
MISTRAL_API_KEY=your_api_key_here

# External Backend
EXTERNAL_BACKEND_URL=http://localhost:3000

# Server
PORT=8000
LOG_LEVEL=INFO
```

---

**Intelligent agents empower users to work smarter** 🤖✨
