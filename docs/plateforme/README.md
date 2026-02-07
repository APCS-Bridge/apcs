# APCS - Agile Project Collaboration System

> An intelligent, AI-powered collaboration platform for modern Agile teams, combining real-time communication, sprint management, and AI agent assistance.

## 🎯 Project Overview

**APCS** is a comprehensive software engineering collaboration platform designed to address the challenges faced by distributed Agile teams. The system integrates traditional project management methodologies (Kanban and Scrum) with cutting-edge AI capabilities, providing teams with an intelligent assistant that understands context, automates workflows, and streamlines collaboration.

### The Problem We Solve

Modern software teams struggle with:
- **Fragmented tooling** across project management, communication, and documentation
- **Manual overhead** in sprint planning, backlog grooming, and task management
- **Context switching** between multiple platforms and interfaces
- **Limited automation** for routine project management tasks
- **Scalability challenges** as teams and projects grow

APCS addresses these challenges through a unified platform that combines project management, real-time collaboration, and AI-powered automation.

## 🏗️ System Architecture

The platform consists of three integrated subsystems, each designed with specific architectural principles:

```
┌─────────────────────────────────────────────────────────────────┐
│                        APCS Platform                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────┐      ┌────────────────┐      ┌──────────┐ │
│  │   MicroHack    │◄────►│  APCS Server   │◄────►│  Agent   │ │
│  │   (Frontend)   │      │   (Backend)    │      │  System  │ │
│  │                │      │                │      │          │ │
│  │  • Next.js 16  │      │  • Node.js +   │      │ • Python │ │
│  │  • React 19    │      │    TypeScript  │      │ • Agno   │ │
│  │  • Tailwind    │      │  • Prisma ORM  │      │ • MCP    │ │
│  │  • Real-time   │      │  • PostgreSQL  │      │ • Mistral│ │
│  │    Updates     │      │  • Redis PubSub│      │   Large  │ │
│  │  • WebSocket   │      │  • Socket.io   │      │          │ │
│  └────────────────┘      └────────────────┘      └──────────┘ │
│         │                        │                      │       │
│         └────────────────────────┴──────────────────────┘       │
│                              │                                  │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │   PostgreSQL DB     │
                    │   • User Data       │
                    │   • Workspaces      │
                    │   • Tasks & Sprints │
                    │   • Notifications   │
                    └─────────────────────┘
```

### System Components

#### 1. **MicroHack** - Frontend Application
- **Technology**: Next.js 16, React 19, TypeScript
- **Purpose**: User interface for workspace management, task tracking, and AI interaction
- **Key Features**:
  - Responsive dashboard with workspace overview
  - Kanban board with drag-and-drop task management
  - Product backlog with story point estimation
  - Document validation workflows
  - Integrated AI chatbot with streaming responses
  - Real-time notifications via Firebase Cloud Messaging
- **Documentation**: [MicroHack README](MicroHack/README.md)

#### 2. **APCS Server** - Backend API
- **Technology**: Node.js, TypeScript, Express, Prisma
- **Purpose**: REST API, authentication, business logic, and data persistence
- **Key Features**:
  - JWT-based authentication with refresh tokens
  - Role-based access control (RBAC)
  - Space/workspace management (Kanban & Scrum)
  - Sprint and meeting management
  - Real-time notifications (Firebase + Redis)
  - WebSocket connections for live updates
  - Document management and file uploads
- **Documentation**: [APCS Server README](apcs_server/README.md)

#### 3. **Agent System** - AI Intelligence Layer
- **Technology**: Python 3.11, Agno 1.8.4, FastAPI, MCP Protocol
- **Purpose**: AI-powered task automation and intelligent assistance
- **Key Features**:
  - Three specialized AI agents (Administration, Workflow, Scrum Master)
  - Model Context Protocol (MCP) for structured data access
  - Natural language understanding for project management tasks
  - Context-aware responses using workspace metadata
  - RESTful API for agent communication
- **Documentation**: [Agent System README](apcs_agent_system/README.md)

## 🚀 Key Features

### For Development Teams
- **Dual Methodology Support**: Choose between Kanban (continuous flow) or Scrum (sprint-based)
- **Intelligent Sprint Planning**: AI assistance for backlog grooming and sprint planning
- **Automated Task Management**: Natural language commands for creating and managing tasks
- **Real-time Collaboration**: Live updates, notifications, and team communication
- **Document Workflows**: Validation chains with approval/rejection tracking

### For Project Managers
- **Workspace Overview**: Comprehensive dashboard with metrics and insights
- **Sprint Tracking**: Visual sprint burndown and progress monitoring
- **Team Management**: Role assignment, invitation system, and permission control
- **Meeting Scheduling**: Integrated calendar for Scrum ceremonies and team meetings

### For AI-Powered Automation
- **Natural Language Interface**: Conversational commands for project management
- **Context Awareness**: Agents understand current workspace, sprint, and user context
- **Multi-Agent System**: Specialized agents for different domains (admin, workflow, scrum)
- **Streaming Responses**: Real-time AI response generation with SSE

## 🛠️ Technology Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - Latest React with concurrent features
- **TypeScript** - Type-safe development
- **Tailwind CSS 4** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Lucide React** - Icon library

### Backend
- **Node.js 18+** - JavaScript runtime
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Prisma ORM** - Database toolkit
- **PostgreSQL 16** - Relational database
- **Redis** - Pub/sub and caching
- **Socket.io** - WebSocket communication
- **Firebase Admin** - Push notifications

### AI & Agents
- **Python 3.11** - Programming language
- **Agno 1.8.4** - Multi-agent framework
- **Mistral Large** - Language model
- **FastAPI** - Modern Python web framework
- **MCP Protocol** - Model Context Protocol
- **PostgreSQL** - Shared database access

## 📦 Project Structure

```
final/
├── README.md                         # This file
├── MicroHack/                        # Frontend application
│   ├── README.md                     # Frontend documentation
│   ├── src/
│   │   ├── app/                      # Next.js pages
│   │   ├── components/               # React components
│   │   ├── context/                  # React context providers
│   │   └── lib/                      # Utilities and API clients
│   └── docs/                         # Feature-specific docs
│
├── apcs_server/                      # Backend API server
│   ├── README.md                     # Backend documentation
│   ├── src/
│   │   ├── controllers/              # Request handlers
│   │   ├── services/                 # Business logic
│   │   ├── routes/                   # API routes
│   │   ├── middleware/               # Express middleware
│   │   └── lib/                      # Shared utilities
│   ├── prisma/
│   │   └── schema.prisma             # Database schema
│   └── docs/                         # Architecture docs
│
└── apcs_agent_system/                # AI agent system
    ├── README.md                     # Agent system documentation
    ├── agents/                       # AI agent implementations
    ├── mcps/                         # MCP server implementations
    ├── api/                          # FastAPI application
    ├── db/                           # Database tables and queries
    └── docs/                         # API and architecture docs
```

## 🚦 Getting Started

### Prerequisites

- **Node.js 18+** and npm/pnpm
- **Python 3.11+** with uv package manager
- **PostgreSQL 16+**
- **Redis 6+**
- **Docker Desktop** (optional, for containerized deployment)

### Quick Start

#### 1. Database Setup

```bash
# Start PostgreSQL (using Docker)
cd apcs_agent_system
docker-compose up -d

# Initialize schema
psql -U microhack -d collaboration_platform -f apcs_agent_system/db/schema.sql
psql -U microhack -d collaboration_platform -f apcs_agent_system/db/seed.sql
```

#### 2. Backend Server

```bash
cd apcs_server

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start server
npm run dev
# Server runs on http://localhost:3000
```

#### 3. Agent System

```bash
cd apcs_agent_system

# Create virtual environment
uv venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac

# Install dependencies
uv pip install -r requirements.txt

# Configure environment
cp example.env .env
# Edit .env with API keys

# Start agent API
uvicorn api.main:app --reload --port 8000
# Agent API runs on http://localhost:8000
```

#### 4. Frontend Application

```bash
cd MicroHack

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with backend URLs

# Start development server
pnpm dev
# App runs on http://localhost:3001
```

Visit `http://localhost:3001` to access the application.

## 🔐 Default Credentials

After running seed scripts:

- **Superadmin**: `superadmin@example.com` / `SuperAdmin123!`
- **Admin**: `admin@example.com` / `Admin123!`
- **User**: `john.doe@example.com` / `User123!`

## 🎓 Usage Guide

### Creating Your First Workspace

1. Login to the application
2. Navigate to Dashboard
3. Click "Create Workspace"
4. Choose methodology (Kanban or Scrum)
5. Invite team members

### Using the AI Chatbot

1. Open any workspace
2. Click the purple chat icon (bottom-right)
3. Select an agent:
   - **Administration Agent**: Workspace and user management
   - **Workflow Agent**: Backlog items, tasks, and Kanban
   - **Scrum Master Agent**: Sprints, ceremonies, and planning
4. Type natural language commands like:
   - "Create a new user story for authentication"
   - "Show me the current sprint backlog"
   - "Add a task to the 'In Progress' column"

### Managing Sprints (Scrum)

1. Create a sprint with date range
2. Add backlog items to sprint
3. Start the sprint to activate
4. Track progress on Kanban board
5. Complete sprint when done

## 🧪 Testing

Each subsystem includes comprehensive testing documentation:

- **Frontend**: Component tests, integration tests, E2E tests
- **Backend**: Unit tests, API tests, database tests
- **Agents**: Agent behavior tests, MCP integration tests

See individual project READMEs for detailed testing instructions.

## 📊 System Design Rationale

### Architecture Decisions

#### Microservices Separation
We separated the agent system from the main backend to achieve:
- **Independent scaling**: AI workloads can scale separately
- **Technology flexibility**: Python for AI, Node.js for API performance
- **Fault isolation**: Agent failures don't impact core platform
- **Development velocity**: Teams can work independently

#### MCP Protocol Adoption
Model Context Protocol provides:
- **Structured data access**: Type-safe tool definitions
- **LLM-friendly interface**: Optimized for AI agent consumption
- **Extensibility**: Easy to add new tools and capabilities
- **Standardization**: Industry-standard protocol for AI integrations

#### Prisma ORM
Chosen for:
- **Type safety**: Generated TypeScript types from schema
- **Migration management**: Version-controlled schema changes
- **Developer experience**: Intuitive query API
- **Performance**: Efficient query optimization

#### Real-time Architecture
Using Socket.io and Redis for:
- **Scalability**: Pub/sub pattern supports horizontal scaling
- **Reliability**: Redis persistence ensures message delivery
- **Flexibility**: Multiple transport protocols (WebSocket, polling)

### Scalability Considerations

#### Database
- Indexed foreign keys for join performance
- Separate tables for high-write scenarios (notifications)
- Connection pooling via Prisma
- Read replicas ready (configuration available)

#### API Server
- Stateless design enables horizontal scaling
- Redis session storage for multi-instance deployments
- CDN-ready static asset serving
- Rate limiting per user/IP

#### Agent System
- Async FastAPI for concurrent request handling
- Independent agent instances per request
- MCP caching for frequently accessed data
- Queue-based processing for long-running tasks

#### Frontend
- Static generation for marketing pages
- Incremental Static Regeneration (ISR) for dynamic content
- Client-side caching with React Query patterns
- Code splitting and lazy loading

### Edge Cases Handled

#### Concurrent Modifications
- Optimistic locking on critical resources
- Last-write-wins with timestamp tracking
- Real-time conflict detection via WebSocket

#### Network Failures
- Retry logic with exponential backoff
- Graceful degradation when agents unavailable
- Offline-first caching for read operations
- WebSocket reconnection with state sync

#### Data Consistency
- Transactional sprint completion
- Cascade deletes for workspace cleanup
- Referential integrity via foreign keys
- Soft deletes for audit trail

#### Security
- JWT token refresh flow
- Token revocation blacklist
- Rate limiting on auth endpoints
- SQL injection prevention via ORM
- XSS protection with sanitization
- CORS configuration per environment

## 🔍 Integration Points

### Frontend ↔ Backend
- REST API for CRUD operations
- WebSocket for real-time updates
- JWT authentication headers
- Firebase FCM for push notifications

### Backend ↔ Agent System
- HTTP requests during agent sessions
- Redis pub/sub for event-driven updates
- Shared PostgreSQL database (via MCP)
- Webhook callbacks for async operations

### Agent System ↔ LLM
- Mistral Large API for language understanding
- Structured outputs via Agno framework
- Token optimization with context pruning
- Streaming responses for UX responsiveness

## 📈 Performance Metrics

### Target Benchmarks
- **API Response Time**: < 200ms (95th percentile)
- **Database Queries**: < 50ms (average)
- **WebSocket Latency**: < 100ms
- **Agent Response Time**: < 3s for simple queries
- **Frontend Load Time**: < 2s (FCP)

### Monitoring
- Application performance monitoring (APM) ready
- Structured logging with correlation IDs
- Error tracking and alerting
- Database query performance logging

## 🤝 Contributing

This is a hackathon project, but contributions are structured as follows:

1. **Frontend**: UI components, styling, user experience
2. **Backend**: API endpoints, business logic, database optimization
3. **Agents**: AI prompt engineering, tool development, MCP extensions

See individual project READMEs for development guidelines.

## 📝 Documentation

### Complete Documentation Set

- **[MicroHack Frontend](MicroHack/README.md)** - UI architecture and components
- **[APCS Server Backend](apcs_server/README.md)** - API documentation and deployment
- **[Agent System](apcs_agent_system/README.md)** - AI agents and MCP protocol
- **[Getting Started Guide](apcs_agent_system/docs/QUICK_START.md)** - Step-by-step setup
- **[API Reference](apcs_server/README.md#api-endpoints)** - Complete endpoint documentation
- **[Database Schema](apcs_server/prisma/schema.prisma)** - Data model definitions

## 🏆 Hackathon Highlights

### Innovation
- **Multi-agent AI system** with specialized domain expertise
- **Model Context Protocol** implementation for structured AI interactions
- **Real-time collaboration** with WebSocket and Server-Sent Events
- **Document validation workflows** with approval chains

### Technical Excellence
- **Type safety** throughout the stack (TypeScript + Prisma)
- **Clean architecture** with separation of concerns
- **Comprehensive error handling** and edge case coverage
- **Production-ready** deployment configuration

### User Experience
- **Intuitive interface** with modern design patterns
- **Responsive design** for mobile and desktop
- **Real-time feedback** with optimistic updates
- **AI assistance** that feels natural and helpful

### Scalability
- **Microservices architecture** for independent scaling
- **Database optimization** with proper indexing
- **Caching strategies** at multiple layers
- **Horizontal scaling** capability

## 📜 License

This project was developed for the [Hackathon Name] hackathon.

## 👥 Team

_Add your team information here_

---

**Built with ❤️ for modern Agile teams**
