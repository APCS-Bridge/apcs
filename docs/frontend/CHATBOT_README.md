# AI Chatbot Feature

## Quick Start

The AI chatbot is now integrated into all workspace views. To use it:

1. **Set up environment variables** (create `.env.local`):

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3000/api
   NEXT_PUBLIC_AGENT_API_URL=http://localhost:8000
   ```

2. **Ensure backend services are running:**

   - Backend API (apcs_server): `http://localhost:3000`
   - Agent System (apcs_agent_system): `http://localhost:8000`

3. **Navigate to any workspace** and click the purple chat button in the bottom-right corner

## Features

- 🤖 **Three AI Agents**: Workflow, Scrum Master, and Administration
- 💬 **Real-time Streaming**: See responses as they're generated
- 💾 **Persistent History**: Conversations saved per workspace
- 🎨 **Beautiful UI**: Matches existing design with dark mode support
- 📱 **Responsive**: Works on all screen sizes
- 🔐 **Context-Aware**: Automatically knows your workspace and user context

## Files Created

### Components

- `src/components/workspace/ChatWidget.tsx` - Main chat interface
- `src/components/workspace/ChatMessage.tsx` - Message display
- `src/components/workspace/ChatInput.tsx` - Input field with auto-resize

### Utilities

- `src/lib/chat.ts` - Chat history management and utilities
- `src/lib/api.ts` - Extended with agent communication methods

### Integration

- `src/components/workspace/WorkspaceDetailView.tsx` - Modified to include ChatWidget

### Documentation

- `CHATBOT_SETUP.md` - Complete setup and usage guide

## Architecture

```
┌─────────────────────────────────────────┐
│  WorkspaceDetailView                    │
│  ┌─────────────────────────────────┐   │
│  │  ChatWidget                      │   │
│  │  ├─ Agent Selector Dropdown      │   │
│  │  ├─ ChatMessage (list)          │   │
│  │  └─ ChatInput                    │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
         │                      │
         ▼                      ▼
   GET /api/session    POST /v1/runs/stream
   (port 3000)         (port 8000)
         │                      │
         ▼                      ▼
   Session Data         Agent Response
   (userId, spaceId)    (SSE Stream)
```

## Testing

See `CHATBOT_SETUP.md` for complete testing checklist and troubleshooting guide.

### Quick Test

1. Open a workspace (e.g., `/admin/workspace/{id}`)
2. Click the floating chat button
3. Select "Workflow Agent" from dropdown
4. Type: "List all backlog items"
5. Verify you get a streamed response

## Agent Types

| Agent              | Purpose                       | Example Queries                                           |
| ------------------ | ----------------------------- | --------------------------------------------------------- |
| **Workflow**       | Backlog items, tasks, columns | "Create a new backlog item", "Show me all tasks"          |
| **Scrum Master**   | Sprints, meetings, ceremonies | "Create a new sprint", "Schedule a daily standup"         |
| **Administration** | Users, roles, permissions     | "List all workspace members", "Who is the product owner?" |

## Environment Variables

Required in `.env.local`:

```bash
# Backend API (apcs_server)
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Agent System (apcs_agent_system)
NEXT_PUBLIC_AGENT_API_URL=http://localhost:8000
```

## Session Context

The chatbot automatically includes:

- **userId**: Current logged-in user
- **spaceId**: Current workspace ID
- **sprintId**: Active sprint (if any)
- **sessionId**: Backend session ID

This context is sent with every agent request, allowing agents to provide workspace-specific responses.

## Styling

The chatbot follows the existing design system:

- **Primary color**: Indigo-600
- **Background**: White/Zinc-900 (dark mode)
- **Border radius**: 2xl/3xl
- **Typography**: System font stack
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Future Enhancements

Potential improvements:

- Voice input/output
- File attachments
- Code syntax highlighting
- Message reactions
- Agent memory across sessions
- Multi-turn conversation context
- Export chat history
- Share conversations with team

## Support

For detailed setup, usage, and troubleshooting, see [`CHATBOT_SETUP.md`](./CHATBOT_SETUP.md).
