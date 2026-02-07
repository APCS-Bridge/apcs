# AI Agent Integration

> Natural language interface for project management powered by specialized AI agents

## Overview

The AI agent integration brings intelligent automation to project management through three specialized agents that understand natural language commands and workspace context. Users interact with agents via a chat interface, receiving streaming responses for common tasks like backlog management, sprint planning, and workspace administration.

## Architecture

### Agent System Design

```
┌─────────────────────────────────────────────────────────────┐
│               Frontend (Chat Interface)                     │
│  ┌────────────────────────────────────────────────────┐    │
│  │  ChatWidget                                         │    │
│  │   ├─ Agent Selector (Dropdown)                     │    │
│  │   ├─ Message History (Scrollable)                  │    │
│  │   └─ Input Field (Auto-expanding)                  │    │
│  └────────────────────────────────────────────────────┘    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ HTTP POST /v1/runs/stream
                        │ Server-Sent Events (SSE)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│           Agent System Backend (Python/FastAPI)             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Agent Router                                       │    │
│  │   ├─ Administration Agent (Workspace management)   │    │
│  │   ├─ Workflow Agent (Tasks & backlog)             │    │
│  │   └─ Scrum Master Agent (Sprints & planning)      │    │
│  └────────────────────────────────────────────────────┘    │
│                        │                                    │
│  ┌────────────────────┴──────────────────────────────┐     │
│  │  MCP (Model Context Protocol) Servers             │     │
│  │   ├─ Administration MCP (3 tools)                 │     │
│  │   ├─ Workflow MCP (9 tools)                       │     │
│  │   └─ Scrum Master MCP (5 tools)                   │     │
│  └────────────────────────────────────────────────────┘    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ Database Queries & HTTP Requests
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend API Server (Node.js)                   │
│  • User Authentication                                      │
│  • Workspace Data                                          │
│  • Task Management                                         │
│  • Sprint Operations                                       │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Agno 1.8.4**: Multi-agent framework with structured outputs
- **Mistral Large**: Language model for natural language understanding
- **FastAPI**: High-performance async Python web framework
- **MCP Protocol**: Standardized tool definition and execution
- **Server-Sent Events**: Streaming responses to frontend
- **PostgreSQL**: Shared database access via MCP

## The Three Agents

### 1. Administration Agent

**Purpose**: Workspace and user management

**Capabilities**:
- Create new workspaces (Kanban or Scrum)
- List user's workspaces
- Get detailed workspace information
- Manage workspace metadata

**Example Commands**:
```
"Create a new Scrum workspace called 'Project Alpha'"
"Show me all my workspaces"
"What's the current workspace information?"
"List all members in this workspace"
```

**MCP Tools** (3):
```python
# Tool 1: create_space
{
  "name": "create_space",
  "description": "Create a new workspace with Kanban or Scrum methodology",
  "parameters": {
    "name": "string",
    "methodology": "KANBAN | SCRUM",
    "description": "string (optional)"
  }
}

# Tool 2: get_user_spaces
{
  "name": "get_user_spaces",
  "description": "List all workspaces the user has access to",
  "parameters": {}
}

# Tool 3: get_space_info
{
  "name": "get_space_info",
  "description": "Get detailed information about a specific workspace",
  "parameters": {
    "space_id": "string (optional, defaults to current workspace)"
  }
}
```

### 2. Workflow Agent

**Purpose**: Backlog and task management for Kanban workflows

**Capabilities**:
- Create and manage backlog items (user stories)
- Create tasks and assign them to team members
- Move tasks between Kanban columns
- Create custom columns
- Get board overview
- Track task status

**Example Commands**:
```
"Create a user story for user authentication with 5 story points"
"Add a task to implement login API"
"Move task #123 to 'In Progress'"
"Show me all tasks in the 'Done' column"
"Assign the authentication task to John"
"What's in our backlog?"
```

**MCP Tools** (9):
```python
# Backlog Management (3 tools)
- create_backlog_item: Create new user story
- get_backlog: List all backlog items
- update_backlog_item: Modify existing item

# Task Management (3 tools)
- create_task: Create new task from backlog item
- move_task: Change task column/status
- assign_task: Assign task to team member

# Board Management (3 tools)
- create_column: Add custom Kanban column
- get_kanban_board: Get full board state
- get_column_tasks: List tasks in specific column
```

### 3. Scrum Master Agent

**Purpose**: Sprint management and Scrum ceremonies

**Capabilities**:
- Create sprints with date ranges
- Start and complete sprints
- Add items to sprint backlog
- Track sprint progress
- Get sprint backlog details

**Example Commands**:
```
"Create a 2-week sprint starting today"
"Add backlog item #456 to the current sprint"
"Start the sprint"
"Show me the sprint backlog"
"Complete the current sprint"
"What's our sprint velocity?"
```

**MCP Tools** (5):
```python
# Sprint Lifecycle (3 tools)
- create_sprint: Create new sprint with dates
- start_sprint: Activate a sprint
- complete_sprint: Finish sprint and calculate metrics

# Sprint Backlog (2 tools)
- add_to_sprint_backlog: Add backlog items to sprint
- get_sprint_backlog: List all items in current sprint
```

## Chat Widget Implementation

### Component Structure

**File**: [src/components/workspace/ChatWidget.tsx](../src/components/workspace/ChatWidget.tsx)

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  agentType?: AgentType;
}

type AgentType = 'administration' | 'workflow' | 'scrum_master';

export function ChatWidget({ workspaceId }: { workspaceId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('workflow');
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    // Load chat history from localStorage
    const history = loadChatHistory(workspaceId);
    setMessages(history);
  }, [workspaceId]);

  const sendMessage = async (content: string) => {
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);

    try {
      // Stream response from agent
      await streamAgentResponse(
        selectedAgent,
        content,
        workspaceId,
        (chunk) => {
          // Update assistant message with each chunk
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage?.role === 'assistant') {
              return [
                ...prev.slice(0, -1),
                { ...lastMessage, content: lastMessage.content + chunk }
              ];
            } else {
              return [
                ...prev,
                {
                  id: generateId(),
                  role: 'assistant',
                  content: chunk,
                  timestamp: new Date(),
                  agentType: selectedAgent,
                }
              ];
            }
          });
        }
      );
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          id: generateId(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        }
      ]);
    } finally {
      setIsStreaming(false);
      saveChatHistory(workspaceId, messages);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-purple-600 hover:bg-purple-700 rounded-full shadow-lg flex items-center justify-center z-40"
      >
        <MessageSquare className="text-white" size={24} />
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="fixed bottom-24 right-6 w-96 h-[600px] bg-slate-800 rounded-lg shadow-2xl flex flex-col z-50 border border-slate-700"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot size={20} className="text-purple-400" />
              <h3 className="font-semibold text-slate-100">AI Assistant</h3>
            </div>
            <button onClick={() => setIsOpen(false)}>
              <X size={20} className="text-slate-400 hover:text-slate-100" />
            </button>
          </div>

          {/* Agent Selector */}
          <div className="p-3 border-b border-slate-700">
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value as AgentType)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100"
            >
              <option value="administration">Administration Agent</option>
              <option value="workflow">Workflow Agent</option>
              <option value="scrum_master">Scrum Master Agent</option>
            </select>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(message => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isStreaming && <TypingIndicator />}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-700">
            <ChatInput onSend={sendMessage} disabled={isStreaming} />
          </div>
        </motion.div>
      )}
    </>
  );
}
```

### Streaming API Client

**File**: [src/lib/chat.ts](../src/lib/chat.ts)

```typescript
const AGENT_API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL;

export async function streamAgentResponse(
  agent: AgentType,
  message: string,
  workspaceId: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  const token = sessionStorage.getItem('accessToken');

  const response = await fetch(`${AGENT_API_URL}/v1/runs/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      agent,
      message,
      space_id: workspaceId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Agent request failed: ${response.statusText}`);
  }

  // Read Server-Sent Events stream
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        
        if (data === '[DONE]') {
          return;
        }

        try {
          const parsed = JSON.parse(data);
          if (parsed.content) {
            onChunk(parsed.content);
          }
        } catch (error) {
          // Not JSON, treat as plain text
          onChunk(data);
        }
      }
    }
  }
}

// Chat history persistence
export function saveChatHistory(workspaceId: string, messages: Message[]) {
  localStorage.setItem(
    `chat_history_${workspaceId}`,
    JSON.stringify(messages)
  );
}

export function loadChatHistory(workspaceId: string): Message[] {
  const stored = localStorage.getItem(`chat_history_${workspaceId}`);
  return stored ? JSON.parse(stored) : [];
}

export function clearChatHistory(workspaceId: string) {
  localStorage.removeItem(`chat_history_${workspaceId}`);
}
```

### Message Components

**File**: [src/components/workspace/ChatMessage.tsx](../src/components/workspace/ChatMessage.tsx)

```typescript
export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex gap-2 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-indigo-600' : 'bg-purple-600'
        }`}>
          {isUser ? <User size={16} /> : <Bot size={16} />}
        </div>

        {/* Message Bubble */}
        <div className={`rounded-lg p-3 ${
          isUser 
            ? 'bg-indigo-600 text-white' 
            : 'bg-slate-700 text-slate-100'
        }`}>
          {/* Agent Badge */}
          {!isUser && message.agentType && (
            <div className="text-xs text-purple-300 mb-1">
              {getAgentName(message.agentType)}
            </div>
          )}

          {/* Content with Markdown rendering */}
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              components={{
                code: ({ node, inline, className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={tomorrow}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          {/* Timestamp */}
          <div className="text-xs opacity-70 mt-1">
            {formatDistanceToNow(message.timestamp, { addSuffix: true })}
          </div>
        </div>
      </div>
    </div>
  );
}

function getAgentName(type: AgentType): string {
  const names = {
    administration: '🛠️ Administration',
    workflow: '📋 Workflow',
    scrum_master: '🏃 Scrum Master',
  };
  return names[type] || 'AI Agent';
}
```

**File**: [src/components/workspace/ChatInput.tsx](../src/components/workspace/ChatInput.tsx)

```typescript
export function ChatInput({ 
  onSend, 
  disabled 
}: { 
  onSend: (message: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleSend = () => {
    if (value.trim() && !disabled) {
      onSend(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-2">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask me anything..."
        disabled={disabled}
        rows={1}
        className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 max-h-32"
      />
      <button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        <Send size={18} />
      </button>
    </div>
  );
}
```

## Context Awareness

### Automatic Context Injection

Agents automatically receive context about:

```typescript
interface AgentContext {
  userId: string;
  userName: string;
  userEmail: string;
  spaceId: string;
  spaceName: string;
  methodology: 'KANBAN' | 'SCRUM';
  activeSprint?: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    status: 'PLANNING' | 'ACTIVE' | 'COMPLETED';
  };
  availableUsers: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}
```

This context allows agents to:
- Know which workspace the user is in
- Understand the methodology (Kanban vs Scrum)
- Access the active sprint automatically
- Suggest valid team members for assignments

### Backend Context API

**Endpoint**: `GET /api/context`

```python
@router.get("/context")
async def get_context(
    space_id: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    context = {
        "user": await get_user_info(user_id),
        "workspace": await get_workspace_info(space_id or get_default_workspace(user_id)),
        "active_sprint": await get_active_sprint(space_id),
        "available_users": await get_workspace_members(space_id),
    }
    return context
```

## Error Handling

### Agent Error Types

```typescript
enum AgentErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  STREAM_ERROR = 'STREAM_ERROR',
  TOOL_EXECUTION_ERROR = 'TOOL_EXECUTION_ERROR',
  CONTEXT_ERROR = 'CONTEXT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
}

class AgentError extends Error {
  constructor(
    public type: AgentErrorType,
    message: string,
    public details?: any
  ) {
    super(message);
  }
}

// Error handler in ChatWidget
const handleAgentError = (error: AgentError) => {
  const errorMessages = {
    [AgentErrorType.NETWORK_ERROR]: 'Unable to connect to agent. Check your internet connection.',
    [AgentErrorType.AUTHENTICATION_ERROR]: 'Session expired. Please login again.',
    [AgentErrorType.STREAM_ERROR]: 'Error receiving response. Please try again.',
    [AgentErrorType.TOOL_EXECUTION_ERROR]: 'The agent encountered an error performing that action.',
    [AgentErrorType.CONTEXT_ERROR]: 'Unable to load workspace context.',
    [AgentErrorType.RATE_LIMIT_ERROR]: 'Too many requests. Please wait a moment.',
  };

  const message = errorMessages[error.type] || 'An unexpected error occurred.';
  
  setMessages(prev => [
    ...prev,
    {
      id: generateId(),
      role: 'assistant',
      content: `❌ ${message}`,
      timestamp: new Date(),
    }
  ]);
};
```

## Performance Considerations

### Response Streaming

Streaming provides:
- **Immediate feedback**: Users see responses as they're generated
- **Perceived performance**: Feels faster than waiting for complete response
- **Processing indicator**: No need for separate loading states

### Caching Strategy

```typescript
// Cache frequently accessed data
const contextCache = new Map<string, { data: AgentContext; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getAgentContext(workspaceId: string): Promise<AgentContext> {
  const cached = contextCache.get(workspaceId);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const context = await api.get(`/api/context?space_id=${workspaceId}`);
  contextCache.set(workspaceId, { data: context, timestamp: now });
  
  return context;
}
```

### Token Optimization

```typescript
// Limit message history sent to agent
const MAX_HISTORY_MESSAGES = 10;

function getRelevantHistory(messages: Message[]): Message[] {
  return messages.slice(-MAX_HISTORY_MESSAGES);
}
```

## Testing AI Features

### Manual Test Scenarios

**Administration Agent**:
- [ ] "Create a new Kanban workspace called 'Test Project'"
- [ ] "What workspaces do I have access to?"
- [ ] "Show me the current workspace details"

**Workflow Agent**:
- [ ] "Create a user story for login feature with 8 story points"
- [ ] "List all backlog items"
- [ ] "Add a task to implement the API endpoint"
- [ ] "Move task to In Progress column"

**Scrum Master Agent**:
- [ ] "Create a 2-week sprint starting Monday"
- [ ] "Add backlog item #1 to the sprint"
- [ ] "Show me the sprint backlog"
- [ ] "Start the sprint"

### Edge Cases

- [ ] Empty workspace (no data)
- [ ] Invalid commands (gibberish)
- [ ] Ambiguous requests ("do something")
- [ ] Network interruption during streaming
- [ ] Rate limit exceeded
- [ ] Backend service unavailable

## Best Practices

### Prompt Engineering

Guide users with examples:

```typescript
const agentExamples = {
  administration: [
    "Create a new workspace",
    "List all my workspaces",
    "Show workspace info",
  ],
  workflow: [
    "Create a user story",
    "List backlog items",
    "Add a task",
    "Move task to column",
  ],
  scrum_master: [
    "Create a sprint",
    "Add items to sprint",
    "Start the sprint",
    "Show sprint backlog",
  ],
};
```

### User Guidance

Show helpful tooltips:

```typescript
<div className="text-sm text-slate-400 p-3 bg-slate-700/50 rounded-lg mb-3">
  💡 Try asking: "{getRandomExample(selectedAgent)}"
</div>
```

### Conversation Design

- Keep responses concise
- Use formatmarkdown for readability
- Include actionable suggestions
- Confirm actions before execution (for destructive operations)

---

**AI agents make project management conversational** 🤖✨
