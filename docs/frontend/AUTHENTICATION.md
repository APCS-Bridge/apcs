# Authentication & Authorization

> Secure, JWT-based authentication system with role-based access control

## Overview

The authentication system provides secure user authentication using JWT (JSON Web Tokens) with automatic token refresh, role-based access control, and comprehensive security measures to protect user data and application resources.

## Architecture

### Authentication Flow

```
┌────────────┐                ┌─────────────┐                ┌──────────────┐
│   Client   │                │  API Server │                │  PostgreSQL  │
└─────┬──────┘                └──────┬──────┘                └──────┬───────┘
      │                              │                              │
      │  1. POST /api/auth/login     │                              │
      │  { email, password }         │                              │
      ├─────────────────────────────►│                              │
      │                              │  2. Verify credentials        │
      │                              ├─────────────────────────────►│
      │                              │                              │
      │                              │  3. User data + hash         │
      │                              │◄─────────────────────────────┤
      │                              │                              │
      │                              │  4. Compare password hash    │
      │                              │     (bcrypt)                 │
      │                              │                              │
      │  5. JWT tokens               │                              │
      │  { accessToken,              │                              │
      │    refreshToken }            │                              │
      │◄─────────────────────────────┤                              │
      │                              │                              │
      │  6. Store tokens in memory   │                              │
      │     (AuthContext)            │                              │
      │                              │                              │
      │  7. Subsequent requests      │                              │
      │  Authorization: Bearer {token}│                             │
      ├─────────────────────────────►│                              │
      │                              │  8. Verify JWT signature     │
      │                              │     & expiration             │
      │                              │                              │
      │  9. Protected resource       │                              │
      │◄─────────────────────────────┤                              │
      │                              │                              │
```

### Token Management

**Access Token**:
- **Purpose**: Authorize API requests
- **Lifetime**: 7 days
- **Storage**: React Context (memory only)
- **Security**: Never persisted to localStorage

**Refresh Token**:
- **Purpose**: Obtain new access tokens
- **Lifetime**: 30 days
- **Storage**: HttpOnly cookie (server-side)
- **Security**: Rotation on use

### Token Refresh Strategy

```typescript
// Automatic token refresh before expiration
const checkTokenExpiration = () => {
  const token = getAccessToken();
  if (!token) return;

  const decoded = jwtDecode(token);
  const expiresIn = decoded.exp * 1000 - Date.now();
  
  // Refresh if expiring within 5 minutes
  if (expiresIn < 5 * 60 * 1000) {
    refreshAccessToken();
  }
};

// Refresh on 401 responses
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        // Retry original request with new token
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return api.request(error.config);
      }
    }
    throw error;
  }
);
```

## Implementation

### AuthContext Provider

**File**: [src/context/AuthContext.tsx](../src/context/AuthContext.tsx)

```typescript
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = sessionStorage.getItem('accessToken');
      if (storedToken) {
        try {
          const userData = await api.getCurrentUser(storedToken);
          setUser(userData);
          setToken(storedToken);
        } catch (error) {
          // Token invalid, clear state
          sessionStorage.removeItem('accessToken');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post('/api/auth/login', { email, password });
    const { accessToken, user: userData } = response;
    
    setToken(accessToken);
    setUser(userData);
    sessionStorage.setItem('accessToken', accessToken);
  };

  const logout = async () => {
    await api.post('/api/auth/logout');
    setToken(null);
    setUser(null);
    sessionStorage.removeItem('accessToken');
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Protected Routes

**Pattern**: Higher-Order Component (HOC)

```typescript
// components/ProtectedRoute.tsx
export function ProtectedRoute({ 
  children, 
  requiredRole 
}: { 
  children: React.ReactNode;
  requiredRole?: UserRole;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return null;
  }

  // Role-based access control
  if (requiredRole && user?.role !== requiredRole) {
    if (user?.role === 'SUPERADMIN') {
      // Superadmin has access to everything
      return <>{children}</>;
    }
    return <UnauthorizedPage />;
  }

  return <>{children}</>;
}

// Usage in page
export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

// Admin-only page
export default function ManageUsersPage() {
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <UserManagement />
    </ProtectedRoute>
  );
}
```

### Login Component

**File**: [src/app/login/page.tsx](../src/app/login/page.tsx)

```typescript
'use client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="bg-slate-800 p-8 rounded-lg shadow-xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-slate-100">
          Login to APCS
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

## Role-Based Access Control (RBAC)

### Role Hierarchy

```
SUPERADMIN (level 3)
    │
    ├─► Full system access
    ├─► Manage all workspaces
    ├─► Create/delete admins
    └─► View all audit logs
    
ADMIN (level 2)
    │
    ├─► Manage workspaces
    ├─► Invite/remove users
    ├─► Assign roles within workspace
    └─► View workspace analytics
    
USER (level 1)
    │
    ├─► View assigned workspaces
    ├─► Create/edit tasks
    ├─► Comment on items
    └─► Update own profile
```

### Permission Checking

```typescript
// Utility function for permission checks
export const hasPermission = (
  user: User,
  action: string,
  resource?: any
): boolean => {
  // Superadmin has all permissions
  if (user.role === 'SUPERADMIN') return true;

  // Permission matrix
  const permissions = {
    'workspace:create': ['ADMIN', 'SUPERADMIN'],
    'workspace:delete': ['ADMIN', 'SUPERADMIN'],
    'user:invite': ['ADMIN', 'SUPERADMIN'],
    'user:remove': ['ADMIN', 'SUPERADMIN'],
    'task:create': ['USER', 'ADMIN', 'SUPERADMIN'],
    'task:edit': ['USER', 'ADMIN', 'SUPERADMIN'],
    'sprint:create': ['ADMIN', 'SUPERADMIN'],
  };

  const allowedRoles = permissions[action] || [];
  return allowedRoles.includes(user.role);
};

// Usage in component
const CreateWorkspaceButton = () => {
  const { user } = useAuth();
  
  if (!hasPermission(user, 'workspace:create')) {
    return null;
  }

  return (
    <button onClick={handleCreateWorkspace}>
      Create Workspace
    </button>
  );
};
```

### Workspace-Level Permissions

Users can have different roles within each workspace:

```typescript
interface WorkspaceMember {
  userId: string;
  workspaceId: string;
  scrumRole?: 'PRODUCT_OWNER' | 'SCRUM_MASTER' | 'DEVELOPER';
  canEdit: boolean;
  canDelete: boolean;
  canInvite: boolean;
}

// Check workspace-specific permission
const canEditWorkspace = (user: User, workspace: Workspace): boolean => {
  if (user.role === 'SUPERADMIN') return true;
  if (user.role === 'ADMIN') return true;
  
  const membership = workspace.members.find(m => m.userId === user.id);
  return membership?.canEdit || false;
};
```

## Security Best Practices

### 1. Token Storage

**❌ Avoid**:
```typescript
// NEVER store tokens in localStorage
localStorage.setItem('token', accessToken);  // Vulnerable to XSS
```

**✅ Recommended**:
```typescript
// Store in React Context (memory only)
const [token, setToken] = useState<string | null>(null);

// Or use sessionStorage for single-tab sessions
sessionStorage.setItem('token', accessToken);
```

### 2. Password Security

**Client-Side**:
- Minimum 8 characters
- At least one uppercase letter
- At least one number
- At least one special character

**Server-Side**:
- bcrypt hashing with salt rounds = 12
- Never log passwords
- Rate limiting on login attempts

### 3. CSRF Protection

```typescript
// All state-changing requests include CSRF token
api.defaults.headers.common['X-CSRF-Token'] = csrfToken;

// SameSite cookies prevent CSRF
res.cookie('refreshToken', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict'
});
```

### 4. XSS Prevention

```typescript
// Sanitize user inputs before rendering
import DOMPurify from 'dompurify';

const SafeHTML = ({ content }: { content: string }) => {
  const sanitized = DOMPurify.sanitize(content);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
};
```

### 5. API Request Security

```typescript
// Rate limiting per user
const rateLimiter = {
  maxRequests: 100,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

// Timeout for long requests
const api = axios.create({
  timeout: 30000, // 30 seconds
});

// Validate response data
const validateResponse = (data: any): data is ExpectedType => {
  return typeof data === 'object' && 'id' in data && 'name' in data;
};
```

## Error Handling

### Authentication Errors

```typescript
enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
}

class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    message: string
  ) {
    super(message);
  }
}

// Error handler in AuthContext
const handleAuthError = (error: any) => {
  if (error.code === AuthErrorCode.TOKEN_EXPIRED) {
    // Attempt token refresh
    refreshAccessToken();
  } else if (error.code === AuthErrorCode.INVALID_CREDENTIALS) {
    // Show error to user
    setError('Invalid email or password');
  } else {
    // Generic error
    setError('Authentication failed. Please try again.');
  }
};
```

## Session Management

### Session Lifecycle

```typescript
// 1. Session starts on successful login
const startSession = (user: User, token: string) => {
  setUser(user);
  setToken(token);
  sessionStorage.setItem('sessionStart', Date.now().toString());
};

// 2. Session monitored for activity
useEffect(() => {
  const checkActivity = () => {
    const lastActivity = sessionStorage.getItem('lastActivity');
    const now = Date.now();
    
    // Auto-logout after 30 minutes of inactivity
    if (lastActivity && now - parseInt(lastActivity) > 30 * 60 * 1000) {
      logout();
    }
  };

  const interval = setInterval(checkActivity, 60000); // Check every minute
  return () => clearInterval(interval);
}, []);

// 3. Activity tracked on user interactions
const trackActivity = () => {
  sessionStorage.setItem('lastActivity', Date.now().toString());
};

// 4. Session ends on logout
const endSession = async () => {
  await api.post('/api/auth/logout');
  setUser(null);
  setToken(null);
  sessionStorage.clear();
  router.push('/login');
};
```

## Testing Authentication

### Manual Test Cases

1. **Login Flow**
   - [ ] Valid credentials → successful login
   - [ ] Invalid email → error message
   - [ ] Invalid password → error message
   - [ ] Empty fields → validation errors
   - [ ] Network error → user-friendly message

2. **Token Management**
   - [ ] Access token stored correctly
   - [ ] Token included in API requests
   - [ ] Token refresh before expiration
   - [ ] Expired token triggers re-login

3. **Protected Routes**
   - [ ] Unauthenticated user redirected to login
   - [ ] Authenticated user gains access
   - [ ] Role-based restrictions enforced

4. **Logout**
   - [ ] Tokens cleared from storage
   - [ ] User redirected to login page
   - [ ] Subsequent requests fail with 401

### Security Audit Checklist

- [ ] Passwords never logged or stored in plain text
- [ ] Tokens not stored in localStorage
- [ ] HTTPS enforced in production
- [ ] CSRF protection enabled
- [ ] XSS prevention measures in place
- [ ] Rate limiting on auth endpoints
- [ ] Session timeout configured
- [ ] Failed login attempts logged

## Troubleshooting

### Common Issues

**Issue**: Token expired during user session
- **Solution**: Implement automatic token refresh
- **Prevention**: Refresh tokens 5 minutes before expiration

**Issue**: User logged out unexpectedly
- **Cause**: Token refresh failed or expired
- **Solution**: Show gentle notification and redirect to login

**Issue**: 401 Unauthorized on valid requests
- **Cause**: Token not included in request headers
- **Solution**: Verify API client configuration

**Issue**: CORS errors on login
- **Cause**: Backend not configured for frontend origin
- **Solution**: Add origin to CORS whitelist in backend

## Integration with Backend

### API Endpoints

```typescript
// Login
POST /api/auth/login
Body: { email: string, password: string }
Response: { accessToken: string, refreshToken: string, user: User }

// Logout
POST /api/auth/logout
Headers: { Authorization: Bearer {token} }
Response: { message: string }

// Refresh Token
POST /api/auth/refresh
Cookies: { refreshToken }
Response: { accessToken: string }

// Get Current User
GET /api/users/current
Headers: { Authorization: Bearer {token} }
Response: User
```

### WebSocket Authentication

```typescript
// Authenticate socket connection
io.on('connection', (socket) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    socket.disconnect();
    return;
  }

  try {
    const decoded = verifyToken(token);
    socket.data.userId = decoded.userId;
    socket.join(`user:${decoded.userId}`);
  } catch (error) {
    socket.disconnect();
  }
});
```

---

**Secure authentication is the foundation of a trusted platform** 🔐
