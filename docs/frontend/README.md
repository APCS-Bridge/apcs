# MicroHack - Frontend Application

> Modern, responsive frontend for the APCS platform, built with Next.js 16 and React 19.

## 🎯 Overview

MicroHack is the user-facing application of the APCS platform, providing an intuitive interface for Agile project management. It combines traditional Scrum/Kanban workflows with AI-powered assistance, real-time collaboration, and document management capabilities.

### Key Design Principles

- **User-Centric**: Intuitive navigation and clear visual hierarchy
- **Responsive**: Seamless experience across desktop, tablet, and mobile
- **Real-Time**: Live updates without page refreshes
- **Performant**: Optimized rendering with React 19 concurrent features
- **Accessible**: WCAG-compliant components with keyboard navigation
- **Type-Safe**: Full TypeScript coverage with strict mode

## 🏗️ Architecture

### Technology Stack

- **Next.js 16** - App Router with React Server Components
- **React 19** - Latest features including concurrent rendering
- **TypeScript** - Strict type checking across all components
- **Tailwind CSS 4** - Utility-first styling with custom design system
- **Framer Motion** - Smooth, performant animations
- **Lucide React** - Consistent, customizable icon set
- **date-fns** - Modern date manipulation library

### Project Structure

```
src/
├── app/                           # Next.js App Router pages
│   ├── layout.tsx                # Root layout with providers
│   ├── page.tsx                  # Landing page
│   ├── login/                    # Authentication
│   ├── dashboard/                # User dashboard
│   ├── workspace/[id]/           # Dynamic workspace viewer
│   ├── chatroom/                 # Team chat interface
│   ├── settings/                 # User preferences
│   ├── manage-users/             # Admin: user management
│   └── manage-workspaces/        # Admin: workspace management
│
├── components/                    # Reusable React components
│   ├── layout/                   # Layout components
│   │   ├── Header.tsx           # Top navigation
│   │   ├── Sidebar.tsx          # Main navigation
│   │   ├── NotificationDropdown.tsx
│   │   └── admin/AdminSidebar.tsx
│   ├── workspace/                # Workspace-specific components
│   │   ├── WorkspaceDetailView.tsx
│   │   ├── KanbanBoard.tsx      # Drag-and-drop board
│   │   ├── ProductBacklog.tsx   # Backlog management
│   │   ├── ChatWidget.tsx       # AI chatbot
│   │   ├── ChatMessage.tsx      # Message display
│   │   └── ChatInput.tsx        # Auto-resizing input
│   ├── dashboard/                # Dashboard components
│   │   └── WorkspaceCard.tsx    # Workspace preview cards
│   ├── workflow/                 # Document workflow
│   │   ├── DocumentWorkflowView.tsx
│   │   ├── ValidationNode.tsx   # Approval chain nodes
│   │   ├── AddValidatorModal.tsx
│   │   └── CommentsModal.tsx
│   ├── documents/                # Document management
│   │   └── DocumentExplorer.tsx
│   └── modals/                   # Modal dialogs
│       ├── CreateWorkspaceModal.tsx
│       ├── CreateUserModal.tsx
│       └── admin/
│
├── context/                       # React Context providers
│   ├── AuthContext.tsx           # Authentication state
│   └── NotificationContext.tsx   # Real-time notifications
│
├── lib/                           # Utilities and API clients
│   ├── api.ts                    # Backend API client
│   ├── chat.ts                   # Chat history management
│   ├── backlog.ts                # Backlog utilities
│   ├── kanban.ts                 # Kanban board logic
│   ├── documents.tsx             # Document operations
│   └── documentWorkflow.ts       # Workflow management
│
└── globals.css                    # Global styles and Tailwind config
```

## 🎨 Design System

### Color Palette

The application uses a carefully crafted dark theme optimized for long working sessions:

```css
/* Primary Colors */
--primary: #6366f1        /* Indigo - Primary actions */
--primary-hover: #4f46e5  /* Darker indigo for hovers */
--accent: #8b5cf6         /* Purple - Secondary actions */

/* Neutral Colors */
--background: #0f172a     /* Slate 900 - Main background */
--surface: #1e293b        /* Slate 800 - Cards and panels */
--border: #334155         /* Slate 700 - Borders */
--text: #f1f5f9           /* Slate 100 - Primary text */
--text-secondary: #94a3b8 /* Slate 400 - Secondary text */

/* Semantic Colors */
--success: #10b981        /* Green - Success states */
--warning: #f59e0b        /* Amber - Warnings */
--error: #ef4444          /* Red - Errors */
--info: #3b82f6           /* Blue - Information */
```

### Typography

- **Headings**: Inter font family, bold weights
- **Body**: Inter regular, optimized for readability
- **Code**: JetBrains Mono for code snippets

### Spacing Scale

Consistent 8px base unit: `4, 8, 12, 16, 24, 32, 48, 64, 96`

### Component Patterns

All components follow consistent patterns:
- Loading states with skeleton screens
- Error boundaries with fallback UI
- Empty states with helpful guidance
- Confirm dialogs for destructive actions

## 🔑 Core Features

### 1. Authentication & Authorization

**Implementation**: [src/context/AuthContext.tsx](src/context/AuthContext.tsx)

- JWT-based authentication with access and refresh tokens
- Token refresh before expiration (7-day validity)
- Protected routes with automatic redirects
- Role-based UI rendering (User, Admin, Superadmin)
- Logout with token revocation

```typescript
// Usage in components
const { user, login, logout, isAuthenticated } = useAuth();

if (user?.role === 'SUPERADMIN') {
  // Render admin-only features
}
```

**Security Features**:
- Tokens stored in memory (not localStorage)
- Automatic token refresh on 401 responses
- CSRF protection via SameSite cookies
- XSS prevention with sanitized inputs

### 2. Dashboard & Workspace Management

**Implementation**: [src/app/dashboard/page.tsx](src/app/dashboard/page.tsx)

Features:
- Grid view of user workspaces with preview cards
- Quick stats (members, tasks, sprint progress)
- Methodology badges (Kanban/Scrum)
- Create workspace modal with methodology selection
- Search and filter workspaces

**Workspace Cards** display:
- Workspace name and description
- Methodology badge
- Member count and avatars
- Recent activity timestamp
- Quick navigation to workspace details

### 3. Kanban Board

**Implementation**: [src/components/workspace/KanbanBoard.tsx](src/components/workspace/KanbanBoard.tsx)

A fully interactive Kanban board with:

**Drag-and-Drop**:
- Native HTML5 drag-and-drop API
- Visual feedback during drag
- Drop validation by column type
- Optimistic updates with rollback on failure

**Column Management**:
- Dynamic column creation
- Customizable column order
- WIP (Work in Progress) limits
- Column-specific task filtering

**Task Cards**:
- Priority indicators (High/Medium/Low)
- Assignee avatars
- Story point badges
- Due date warnings
- Quick actions (edit, delete, view details)

**Performance Optimizations**:
- Virtualized rendering for large boards
- Debounced drag handlers
- Memoized column components
- Lazy loading of task details

```typescript
// Kanban board data structure
interface KanbanColumn {
  id: string;
  name: string;
  order: number;
  wipLimit?: number;
  tasks: Task[];
}

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  assigneeId?: string;
  storyPoints?: number;
  dueDate?: Date;
}
```

### 4. Product Backlog

**Implementation**: [src/components/workspace/ProductBacklog.tsx](src/components/workspace/ProductBacklog.tsx)

Comprehensive backlog management:

**Features**:
- Sortable by priority, story points, created date
- Filterable by assignee, sprint, status
- Bulk actions (move to sprint, delete)
- Inline editing
- Story point estimation
- Priority drag-to-reorder

**User Story Management**:
- Title and description with markdown support
- Acceptance criteria checklist
- Story point estimation (Fibonacci sequence)
- Priority levels with color coding
- Sprint assignment

**Integration**:
- Direct sprint planning from backlog
- Drag to add items to current sprint
- AI assistance for story refinement

### 5. AI Chatbot Integration

**Implementation**: [src/components/workspace/ChatWidget.tsx](src/components/workspace/ChatWidget.tsx)

An embedded AI assistant for natural language project management:

**Architecture**:
```
┌──────────────────────────┐
│   ChatWidget             │
│  ┌────────────────────┐  │
│  │ Agent Selector     │  │  Select agent type
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │ Message List       │  │  Scrollable history
│  │  - User messages   │  │
│  │  - AI responses    │  │
│  │  - Typing indicator│  │
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │ ChatInput          │  │  Auto-resizing textarea
│  └────────────────────┘  │
└──────────────────────────┘
```

**Three Specialized Agents**:

1. **Administration Agent**: Workspace and user management
   - Create/list workspaces
   - View user information
   - Manage workspace metadata

2. **Workflow Agent**: Backlog and task management
   - Create backlog items
   - Manage tasks and columns
   - Get board overview

3. **Scrum Master Agent**: Sprint management
   - Create and manage sprints
   - Sprint backlog operations
   - Sprint status tracking

**Chat Features**:
- Streaming responses via Server-Sent Events (SSE)
- Message persistence per workspace
- Markdown rendering in responses
- Code syntax highlighting
- Auto-scroll to latest message
- Context awareness (knows current workspace/sprint)

**Implementation Details**:
```typescript
// Streaming API call
const streamAgentResponse = async (
  agent: AgentType,
  message: string,
  onChunk: (text: string) => void
) => {
  const response = await fetch(`${AGENT_API_URL}/v1/runs/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      agent,
      message,
      space_id: currentWorkspaceId
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    onChunk(chunk);
  }
};
```

### 6. Real-Time Notifications

**Implementation**: [src/context/NotificationContext.tsx](src/context/NotificationContext.tsx)

Multi-channel notification system:

**Channels**:
- **In-App**: Notification dropdown in header
- **Push**: Firebase Cloud Messaging (FCM)
- **WebSocket**: Live updates for active sessions

**Notification Types**:
- Workspace invitations
- Task assignments
- Sprint updates (created, started, completed)
- Meeting reminders
- Mentions in chat
- Document validation requests
- Approval status changes

**Features**:
- Unread count badge
- Mark as read/unread
- Notification grouping
- Action buttons (accept invitation, view task)
- Auto-dismiss after action

**Persistence**:
- Notifications stored in database
- Filtered by user and read status
- Pagination for large lists
- Real-time sync across devices

### 7. Document Validation Workflow

**Implementation**: [src/components/workflow/DocumentWorkflowView.tsx](src/components/workflow/DocumentWorkflowView.tsx)

A visual approval chain system:

**Workflow Structure**:
```
[Document] → [Validator 1] → [Validator 2] → [Validator 3] → [Approved]
                   ↓              ↓              ↓
               [Comments]     [Comments]     [Comments]
```

**Features**:
- Drag-to-reorder validators
- Add validators at any position
- Remove validators
- Owner notes per validator
- Comment threads per validation node
- Email notifications to validators
- Status tracking (pending/approved/rejected)

**Validation Actions**:
- **Approve**: Move to next validator
- **Reject**: Stop workflow, require revision
- **Comment**: Add feedback without approval

**Status States**:
- `draft`: No validators assigned
- `in_progress`: Awaiting validations
- `completed`: All validations approved
- `rejected`: At least one rejection

**UI Components**:
- SVG-based workflow visualization
- Animated transitions between states
- Color-coded status indicators
- Modal for comments and actions

### 8. Real-Time Collaboration

**WebSocket Integration**: Connected via Socket.io

**Real-Time Events**:
```typescript
// Client subscribes to workspace events
socket.emit('join:workspace', workspaceId);

// Listen for updates
socket.on('task:updated', (task) => {
  updateTaskInUI(task);
});

socket.on('sprint:started', (sprint) => {
  showNotification('Sprint started!');
});

socket.on('member:joined', (member) => {
  addMemberToList(member);
});
```

**Optimistic Updates**:
- UI updates immediately
- Rollback on server error
- Conflict resolution with last-write-wins
- Visual indicators for pending changes

## 🔄 Data Flow

### API Communication Pattern

```typescript
// Centralized API client: src/lib/api.ts
class APIClient {
  private baseURL: string;
  private token?: string;

  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...options?.headers
      }
    });

    if (!response.ok) {
      throw new APIError(response.status, await response.json());
    }

    return response.json();
  }

  // Workspace operations
  async getWorkspaces() {
    return this.request<Workspace[]>('/api/spaces');
  }

  async createWorkspace(data: CreateWorkspaceDto) {
    return this.request<Workspace>('/api/spaces', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Task operations
  async getTasks(workspaceId: string) {
    return this.request<Task[]>(`/api/spaces/${workspaceId}/tasks`);
  }

  // ... more methods
}
```

### State Management Strategy

**Local State**: React useState for component-specific state

**Context API**: For global state (auth, notifications)

**Server State**: Fetched via API, cached in memory

**Optimistic Updates Pattern**:
```typescript
const moveTask = async (taskId: string, newColumnId: string) => {
  // 1. Update UI immediately
  const previousState = getCurrentState();
  updateUIOptimistically(taskId, newColumnId);

  try {
    // 2. Send request to server
    await api.updateTask(taskId, { columnId: newColumnId });
    
    // 3. Confirm success (UI already updated)
    showSuccessToast('Task moved');
  } catch (error) {
    // 4. Rollback on failure
    restoreState(previousState);
    showErrorToast('Failed to move task');
  }
};
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Backend server running on port 3000
- Agent system running on port 8000

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

```env
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Agent System API
NEXT_PUBLIC_AGENT_API_URL=http://localhost:8000

# Firebase (for push notifications)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key
```

### Development

```bash
# Start development server
pnpm dev

# Open browser to http://localhost:3001

# Build for production
pnpm build

# Start production server
pnpm start
```

### Linting

```bash
# Run ESLint
pnpm lint

# Auto-fix issues
pnpm lint --fix
```

## 🧪 Testing Approach

### Manual Testing Checklist

**Authentication**:
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (error handling)
- [ ] Token refresh on expired token
- [ ] Logout and token revocation
- [ ] Protected route redirects

**Dashboard**:
- [ ] Workspace cards display correctly
- [ ] Create workspace modal functions
- [ ] Navigate to workspace details
- [ ] Search and filter workspaces

**Kanban Board**:
- [ ] Drag and drop tasks between columns
- [ ] Create new tasks
- [ ] Edit task details
- [ ] Delete tasks (with confirmation)
- [ ] Visual feedback during interactions

**AI Chatbot**:
- [ ] Open/close chat widget
- [ ] Select different agents
- [ ] Send messages and receive streaming responses
- [ ] Markdown rendering in responses
- [ ] Error handling for failed requests

**Notifications**:
- [ ] Receive real-time notifications
- [ ] Notification dropdown displays unread count
- [ ] Mark notifications as read
- [ ] Navigate to related items from notifications

**Document Workflow**:
- [ ] Create document workflow
- [ ] Add validators in specific order
- [ ] Approve document as validator
- [ ] Reject document with comment
- [ ] View workflow progress

## 🎭 Component Showcase

### Example: WorkspaceCard Component

```typescript
interface WorkspaceCardProps {
  workspace: Workspace;
  onClick: (id: string) => void;
}

export function WorkspaceCard({ workspace, onClick }: WorkspaceCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="bg-slate-800 rounded-lg p-6 cursor-pointer hover:bg-slate-750 transition-colors"
      onClick={() => onClick(workspace.id)}
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-xl font-semibold text-slate-100">
          {workspace.name}
        </h3>
        <span className={`px-2 py-1 text-xs rounded ${
          workspace.methodology === 'SCRUM' 
            ? 'bg-indigo-500/20 text-indigo-300'
            : 'bg-purple-500/20 text-purple-300'
        }`}>
          {workspace.methodology}
        </span>
      </div>
      
      <p className="text-slate-400 text-sm mb-4 line-clamp-2">
        {workspace.description}
      </p>
      
      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {workspace.members.slice(0, 4).map(member => (
            <img
              key={member.id}
              src={member.avatar}
              alt={member.name}
              className="w-8 h-8 rounded-full border-2 border-slate-800"
            />
          ))}
          {workspace.members.length > 4 && (
            <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-800 flex items-center justify-center text-xs">
              +{workspace.members.length - 4}
            </div>
          )}
        </div>
        
        <span className="text-xs text-slate-500">
          {formatDistanceToNow(workspace.updatedAt, { addSuffix: true })}
        </span>
      </div>
    </motion.div>
  );
}
```

## 📊 Performance Optimizations

### Implemented Techniques

1. **Code Splitting**: Dynamic imports for heavy components
2. **Image Optimization**: Next.js Image component with automatic WebP
3. **Lazy Loading**: Below-the-fold components loaded on demand
4. **Memoization**: React.memo for expensive components
5. **Virtualization**: Large lists rendered with windowing
6. **Debouncing**: Search inputs and drag handlers
7. **Prefetching**: Next.js Link component prefetches routes

### Metrics

- **Lighthouse Score**: 95+ (Performance)
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Bundle Size**: < 500KB (gzipped)

## 🔒 Security Considerations

### Implemented Measures

- **XSS Protection**: Sanitized user inputs, Content Security Policy
- **CSRF Protection**: SameSite cookies, token validation
- **Input Validation**: Client-side validation (UX) + server-side validation (security)
- **Secure Headers**: HSTS, X-Frame-Options, X-Content-Type-Options
- **Authentication**: JWT tokens with secure storage
- **Authorization**: Role-based access control at component level

### Best Practices

- Never store sensitive data in localStorage
- Validate all user inputs before display
- Use HTTPS in production
- Implement rate limiting for API calls
- Log security events for audit trail

## 🌐 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 📚 Additional Documentation

- [Chatbot Integration Guide](CHATBOT_README.md)
- [Chatbot Setup Instructions](CHATBOT_SETUP.md)
- [Document Workflow Feature](WORKFLOW_FEATURE_README.md)
- [Permissions Guide](PERMISSIONS_GUIDE.md)
- [Migration Notes](MIGRATION_COMPLETE.md)
- [Refactoring Summary](REFACTORING_SUMMARY.md)

## 🤝 Contributing

### Development Workflow

1. Create feature branch from `main`
2. Implement changes with TypeScript strict mode
3. Test manually across all major features
4. Submit pull request with detailed description

### Code Style

- Use functional components with hooks
- Prefer TypeScript interfaces over types
- Follow Airbnb style guide
- Use ESLint and Prettier
- Write self-documenting code with clear names

## 📞 Support

For issues or questions:
- Check existing documentation first
- Create an issue in the project repository
- Contact the development team

---

**Built with modern web technologies for modern teams** 🚀
