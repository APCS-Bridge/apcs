# Role-Based Permissions Summary

## Sidebar Menu Items by Role

### SUPERADMIN (Sidebar.tsx)
- ✅ Create User
- ✅ Create Workspace
- ✅ Manage Workspaces
- ✅ Manage Users

### ADMIN (AdminSidebar.tsx)
- ✅ Create User
- ✅ Create Workspace
- ✅ Manage Workspaces
- ✅ Manage Users

### USER
- Dashboard only (no management options)
- Can view assigned workspaces
- Cannot see "Create" or "Manage" menu items

## Page Access Control

### `/dashboard` - All roles ✅
- SUPERADMIN: Sees all workspaces
- ADMIN: Sees workspaces they own/are members of
- USER: Sees workspaces they are members of

### `/workspace/[id]` - All roles ✅
- All users can view if they have workspace access
- Features adapt based on workspace role (SCRUM_MASTER, PRODUCT_OWNER, etc.)
- ChatWidget available for all users

### `/manage-users` - SUPERADMIN & ADMIN only 🔒
- Protected: USER role redirects to `/dashboard`
- Create, edit, delete users
- Change user roles

### `/manage-workspaces` - SUPERADMIN & ADMIN only 🔒
- Protected: USER role redirects to `/dashboard`
- View all workspaces
- Manage workspace members
- Delete workspaces

### `/login` - Public ✅
- All users can access
- Redirects to `/dashboard` after login

## Protection Mechanisms

### 1. Sidebar Filtering
```typescript
// Each menu item has roles array
const menuItems = [
  {
    label: 'Manage Users',
    action: () => router.push('/manage-users'),
    roles: ['SUPERADMIN', 'ADMIN']
  }
];

// Filter visible items
const visibleMenuItems = menuItems.filter(item => 
  item.roles.includes(user?.role || 'USER')
);
```

### 2. Route Guards
```typescript
// In manage pages
useEffect(() => {
  if (!["SUPERADMIN", "ADMIN"].includes(currentUser.role)) {
    router.push("/dashboard");
    return;
  }
}, [currentUser, router]);
```

### 3. Component-Level Checks
```typescript
// In WorkspaceDetailView
const isScrumMaster = currentScrumRole === "SCRUM_MASTER";
const canManageSprints = isScrumMaster || isSpaceOwner || isSuperAdmin;

// Conditionally render features
{canManageSprints && (
  <button>Create Sprint</button>
)}
```

## Testing Matrix

| Role | Dashboard | Workspace | Manage Users | Manage Workspaces |
|------|-----------|-----------|--------------|-------------------|
| SUPERADMIN | ✅ All | ✅ All | ✅ Full Access | ✅ Full Access |
| ADMIN | ✅ Own | ✅ Assigned | ✅ Full Access | ✅ Full Access |
| USER | ✅ Own | ✅ Assigned | ❌ Redirect | ❌ Redirect |

## User Flow Examples

### USER Role
1. Login → `/dashboard`
2. See workspaces they're member of
3. Click workspace → `/workspace/[id]`
4. Can use ChatWidget
5. Cannot see "Manage" menu items
6. Direct access to `/manage-users` → Redirects to `/dashboard`

### ADMIN Role
1. Login → `/dashboard`
2. See workspaces they own/are members of
3. Click workspace → `/workspace/[id]`
4. Can use ChatWidget
5. See "Manage" menu items in sidebar
6. Can access `/manage-users` and `/manage-workspaces`
7. Can create users and workspaces

### SUPERADMIN Role
1. Auto-login → `/dashboard`
2. See ALL workspaces in system
3. Click workspace → `/workspace/[id]`
4. Can use ChatWidget
5. See all "Manage" menu items
6. Full system access
7. Can create users and workspaces
8. Never truly logs out (auto-relogins)

## What Changed

### Before
- Role determined ROUTE: `/admin/*` vs `/superadmin/*`
- Duplicate pages for each role
- URL revealed user's role

### After
- Role determines RENDERING: Same route, different content
- Single pages with conditional rendering
- Clean URLs for everyone
- Menu items filtered by permission

## Security Notes

✅ **Multi-layer protection:**
1. Sidebar hides unauthorized links
2. Pages redirect unauthorized users
3. Backend API validates all requests
4. Component-level feature flags

⚠️ **Important:**
- Hiding menu items is UX, not security
- Always validate permissions on backend
- Route guards are convenience, not protection
- Real security happens in API endpoints

