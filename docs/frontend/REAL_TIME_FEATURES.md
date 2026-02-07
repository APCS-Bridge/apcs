# Real-Time Features & Notifications

> Live updates, WebSocket communication, and push notifications for seamless collaboration

## Overview

The real-time features enable instant synchronization across clients, providing users with immediate feedback on team activities, task updates, and system events without requiring page refreshes.

## Architecture

### Multi-Channel Notification System

```
┌─────────────────────────────────────────────────────────────────┐
│                    Notification Delivery Channels               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌───────────────────┐  │
│  │  WebSocket   │   │   Firebase   │   │   In-App          │  │
│  │  (Socket.io) │   │     FCM      │   │   Dropdown        │  │
│  │              │   │              │   │                   │  │
│  │ • Live updates│  │ • Push       │   │ • Notification    │  │
│  │ • Real-time  │   │   notifications│  │   history         │  │
│  │   sync       │   │ • Background │   │ • Read/unread     │  │
│  │ • Presence   │   │   delivery   │   │ • Quick actions   │  │
│  └──────────────┘   └──────────────┘   └───────────────────┘  │
│         │                   │                     │            │
└─────────┼───────────────────┼─────────────────────┼────────────┘
          │                   │                     │
          └───────────────────┴─────────────────────┘
                              │
                   ┌──────────┴──────────┐
                   │   Backend Server    │
                   │   • Redis Pub/Sub   │
                   │   • Event Bus       │
                   │   • Notification    │
                   │     Service         │
                   └─────────────────────┘
```

### Communication Patterns

#### 1. WebSocket (Real-Time Updates)
- **Use Case**: Active users see immediate updates
- **Protocol**: Socket.io (WebSocket + fallbacks)
- **Scope**: Workspace-specific channels
- **Latency**: < 100ms

#### 2. Firebase Cloud Messaging (Push Notifications)
- **Use Case**: Background notifications when app is closed
- **Protocol**: FCM protocol
- **Scope**: Device-specific, user-targeted
- **Delivery**: Guaranteed (queued if offline)

#### 3. In-App Notifications
- **Use Case**: Historical notification access
- **Protocol**: REST API
- **Scope**: User-specific, persistent
- **Storage**: PostgreSQL database

## WebSocket Implementation

### Connection Management

**File**: [src/lib/socket.ts](../src/lib/socket.ts)

```typescript
import { io, Socket } from 'socket.io-client';

class SocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string) {
    if (this.socket?.connected) return;

    this.socket = io(process.env.NEXT_PUBLIC_API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.socket?.on('connect', () => {
      console.log('Socket connected');
      this.reconnectAttempts = 0;
    });

    this.socket?.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, manual reconnection needed
        this.socket?.connect();
      }
    });

    this.socket?.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        // Fallback to polling for notifications
        this.fallbackToPolling();
      }
    });

    this.socket?.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      this.resyncState();
    });
  }

  joinWorkspace(workspaceId: string) {
    this.socket?.emit('join:workspace', workspaceId);
  }

  leaveWorkspace(workspaceId: string) {
    this.socket?.emit('leave:workspace', workspaceId);
  }

  on(event: string, handler: (...args: any[]) => void) {
    this.socket?.on(event, handler);
  }

  off(event: string, handler: (...args: any[]) => void) {
    this.socket?.off(event, handler);
  }

  emit(event: string, ...args: any[]) {
    this.socket?.emit(event, ...args);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  private async resyncState() {
    // Fetch any missed updates during disconnection
    const lastSync = localStorage.getItem('lastSyncTimestamp');
    if (lastSync) {
      await api.get('/api/sync', { 
        params: { since: lastSync } 
      });
    }
    localStorage.setItem('lastSyncTimestamp', Date.now().toString());
  }

  private fallbackToPolling() {
    // Start polling for notifications every 10 seconds
    setInterval(async () => {
      await api.get('/api/notifications/poll');
    }, 10000);
  }
}

export const socketManager = new SocketManager();
```

### Event Types & Handlers

```typescript
// Workspace events
interface WorkspaceEvents {
  // Member activity
  'member:joined': (member: WorkspaceMember) => void;
  'member:left': (memberId: string) => void;
  'member:online': (memberId: string) => void;
  'member:offline': (memberId: string) => void;

  // Task updates
  'task:created': (task: Task) => void;
  'task:updated': (task: Task) => void;
  'task:deleted': (taskId: string) => void;
  'task:moved': (data: { taskId: string; columnId: string }) => void;
  'task:assigned': (data: { taskId: string; userId: string }) => void;

  // Sprint updates
  'sprint:created': (sprint: Sprint) => void;
  'sprint:started': (sprint: Sprint) => void;
  'sprint:completed': (sprint: Sprint) => void;
  'sprint:updated': (sprint: Sprint) => void;

  // Backlog updates
  'backlog:item:created': (item: BacklogItem) => void;
  'backlog:item:updated': (item: BacklogItem) => void;
  'backlog:item:deleted': (itemId: string) => void;

  // Chat messages
  'message:new': (message: ChatMessage) => void;
  'message:typing': (data: { userId: string; userName: string }) => void;

  // Notifications
  'notification:new': (notification: Notification) => void;
}

// Usage in components
const WorkspaceView = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [onlineMembers, setOnlineMembers] = useState<Set<string>>(new Set());

  useEffect(() => {
    socketManager.joinWorkspace(workspaceId);

    // Subscribe to events
    socketManager.on('task:created', (task) => {
      setTasks(prev => [...prev, task]);
      showToast('New task created');
    });

    socketManager.on('task:updated', (task) => {
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    });

    socketManager.on('member:online', (memberId) => {
      setOnlineMembers(prev => new Set(prev).add(memberId));
    });

    socketManager.on('member:offline', (memberId) => {
      setOnlineMembers(prev => {
        const updated = new Set(prev);
        updated.delete(memberId);
        return updated;
      });
    });

    return () => {
      socketManager.leaveWorkspace(workspaceId);
      socketManager.off('task:created');
      socketManager.off('task:updated');
      socketManager.off('member:online');
      socketManager.off('member:offline');
    };
  }, [workspaceId]);

  return (
    <div>
      <OnlineIndicator count={onlineMembers.size} />
      <TaskList tasks={tasks} />
    </div>
  );
};
```

### Presence System

Track online users in real-time:

```typescript
interface PresenceData {
  userId: string;
  userName: string;
  avatarUrl?: string;
  status: 'online' | 'away' | 'busy';
  lastSeen: Date;
}

class PresenceManager {
  private presenceMap = new Map<string, PresenceData>();
  private heartbeatInterval?: NodeJS.Timeout;

  startTracking(workspaceId: string) {
    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      socketManager.emit('presence:heartbeat', {
        workspaceId,
        status: this.getUserStatus(),
      });
    }, 30000);

    // Listen for presence updates
    socketManager.on('presence:update', (data: PresenceData) => {
      this.presenceMap.set(data.userId, data);
      this.notifyPresenceChange(data);
    });
  }

  stopTracking() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    socketManager.off('presence:update');
  }

  private getUserStatus(): 'online' | 'away' | 'busy' {
    const lastActivity = parseInt(
      sessionStorage.getItem('lastActivity') || '0'
    );
    const now = Date.now();
    const inactiveTime = now - lastActivity;

    if (inactiveTime > 5 * 60 * 1000) return 'away'; // 5 minutes
    return 'online';
  }

  getOnlineUsers(workspaceId: string): PresenceData[] {
    return Array.from(this.presenceMap.values())
      .filter(p => p.status === 'online');
  }
}

export const presenceManager = new PresenceManager();
```

## Firebase Cloud Messaging

### Setup & Configuration

**File**: [src/lib/firebase.ts](../src/lib/firebase.ts)

```typescript
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });
      
      // Send token to backend for storage
      await api.post('/api/notifications/register-device', { token });
      
      return token;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting permission:', error);
    return null;
  }
};

export const setupForegroundNotifications = () => {
  onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    
    const { title, body, data } = payload.notification || {};
    
    // Show browser notification
    if (title) {
      new Notification(title, {
        body,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: data,
      });
    }
    
    // Update in-app notification state
    notificationContext.addNotification({
      title: title || 'New notification',
      body: body || '',
      data: data || {},
      timestamp: new Date(),
    });
  });
};
```

### Service Worker (Background Notifications)

**File**: [public/firebase-messaging-sw.js](../public/firebase-messaging-sw.js)

```javascript
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
});

const messaging = firebase.messaging();

self.addEventListener('push', (event) => {
  const data = event.data.json();
  const { title, body, icon, badge, data: customData } = data.notification;

  const options = {
    body,
    icon: icon || '/icon-192x192.png',
    badge: badge || '/badge-72x72.png',
    data: customData,
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if app is already open
        for (let client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if not open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
```

## In-App Notifications

### Notification Context

**File**: [src/context/NotificationContext.tsx](../src/context/NotificationContext.tsx)

```typescript
interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: Date;
  data?: Record<string, any>;
  actionUrl?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  fetchNotifications: () => Promise<void>;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();

    // Listen for new notifications via WebSocket
    socketManager.on('notification:new', (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show toast notification
      showToast(notification.title, notification.body);
    });

    return () => {
      socketManager.off('notification:new');
    };
  }, []);

  const fetchNotifications = async () => {
    const data = await api.get('/api/notifications');
    setNotifications(data.notifications);
    setUnreadCount(data.notifications.filter(n => !n.read).length);
  };

  const markAsRead = async (id: string) => {
    await api.patch(`/api/notifications/${id}/read`);
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    await api.patch('/api/notifications/read-all');
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const deleteNotification = async (id: string) => {
    await api.delete(`/api/notifications/${id}`);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
```

### Notification Dropdown Component

**File**: [src/components/layout/NotificationDropdown.tsx](../src/components/layout/NotificationDropdown.tsx)

```typescript
export function NotificationDropdown() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-slate-100 transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-50">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-100">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-indigo-400 hover:text-indigo-300"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No notifications
              </div>
            ) : (
              notifications.map(notification => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onRead={() => markAsRead(notification.id)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

## Optimistic Updates

### Pattern Implementation

```typescript
// Optimistic update wrapper
async function withOptimisticUpdate<T>(
  optimisticFn: () => void,
  serverFn: () => Promise<T>,
  rollbackFn: () => void
): Promise<T> {
  // 1. Apply optimistic update
  optimisticFn();

  try {
    // 2. Make server request
    const result = await serverFn();
    return result;
  } catch (error) {
    // 3. Rollback on failure
    rollbackFn();
    throw error;
  }
}

// Example: Moving a task
const moveTask = async (taskId: string, newColumnId: string) => {
  const originalState = tasks.find(t => t.id === taskId);

  await withOptimisticUpdate(
    // Optimistic update
    () => {
      setTasks(prev =>
        prev.map(t =>
          t.id === taskId ? { ...t, columnId: newColumnId } : t
        )
      );
    },
    // Server request
    () => api.patch(`/api/tasks/${taskId}`, { columnId: newColumnId }),
    // Rollback
    () => {
      setTasks(prev =>
        prev.map(t =>
          t.id === taskId ? originalState! : t
        )
      );
      showToast('Failed to move task', 'error');
    }
  );
};
```

### Conflict Resolution

```typescript
interface ConflictResolution {
  strategy: 'last-write-wins' | 'merge' | 'manual';
  resolvedValue: any;
}

const resolveConflict = (
  localValue: any,
  serverValue: any,
  timestamp: { local: Date; server: Date }
): ConflictResolution => {
  // Last-write-wins strategy
  if (timestamp.server > timestamp.local) {
    return {
      strategy: 'last-write-wins',
      resolvedValue: serverValue,
    };
  }

  // Merge strategy for non-conflicting fields
  if (typeof localValue === 'object' && typeof serverValue === 'object') {
    return {
      strategy: 'merge',
      resolvedValue: { ...serverValue, ...localValue },
    };
  }

  // Manual resolution required
  return {
    strategy: 'manual',
    resolvedValue: null,
  };
};
```

## Performance Optimization

### Debouncing WebSocket Events

```typescript
import { debounce } from 'lodash';

// Debounce rapid updates (e.g., typing indicators)
const debouncedTypingIndicator = debounce((workspaceId: string) => {
  socketManager.emit('message:typing', { workspaceId });
}, 300);

// Throttle high-frequency events (e.g., cursor movement)
const throttledCursorUpdate = throttle((position: { x: number; y: number }) => {
  socketManager.emit('cursor:move', position);
}, 50);
```

### Connection Pooling

```typescript
class ConnectionPool {
  private connections = new Map<string, Socket>();
  private maxConnections = 5;

  getConnection(workspaceId: string): Socket {
    if (!this.connections.has(workspaceId)) {
      if (this.connections.size >= this.maxConnections) {
        // Close oldest connection
        const oldestKey = this.connections.keys().next().value;
        this.connections.get(oldestKey)?.disconnect();
        this.connections.delete(oldestKey);
      }

      const socket = io(`/workspace/${workspaceId}`);
      this.connections.set(workspaceId, socket);
    }

    return this.connections.get(workspaceId)!;
  }
}
```

## Testing Real-Time Features

### Manual Test Cases

1. **WebSocket Connection**
   - [ ] Connection established on login
   - [ ] Automatic reconnection on disconnect
   - [ ] Fallback to polling if WebSocket fails
   - [ ] Clean disconnect on logout

2. **Live Updates**
   - [ ] Task created by another user appears immediately
   - [ ] Task moved reflects on all clients
   - [ ] Sprint status changes sync across devices
   - [ ] Presence indicators update in real-time

3. **Push Notifications**
   - [ ] Permission requested on first visit
   - [ ] Notifications work when app is closed
   - [ ] Click notification opens relevant page
   - [ ] Notifications grouped appropriately

4. **Conflict Resolution**
   - [ ] Concurrent edits resolved correctly
   - [ ] No data loss on conflicts
   - [ ] User notified of conflicts

## Troubleshooting

### Common Issues

**Issue**: WebSocket connection fails
- Check network connectivity
- Verify CORS configuration on backend
- Ensure authentication token is valid
- Check browser console for errors

**Issue**: Notifications not received
- Verify FCM configuration
- Check notification permissions
- Ensure service worker is registered
- Test in incognito mode (fresh state)

**Issue**: Stale data after reconnection
- Implement state sync on reconnect
- Use timestamp-based syncing
- Clear local cache on major version changes

---

**Real-time collaboration makes teamwork seamless** ⚡
