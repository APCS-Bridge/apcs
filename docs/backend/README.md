# APCS Server - Multi-Agent Collaboration Platform

A backend server for managing Agile/Scrum teams with KANBAN and SCRUM methodologies, featuring JWT authentication, role-based access control, AI agent integration capabilities, and **real-time push notifications** via Firebase Cloud Messaging (FCM) and Redis.

## 🚀 Features

- **JWT Authentication** - Secure login with access and refresh tokens
- **Token Revocation** - Logout functionality with token blacklisting
- **Role-Based Access Control (RBAC)** - SUPERADMIN, ADMIN, USER roles
- **Invitation System** - Invite users via email with role assignment
- **User Management** - Create, read, update, delete users
- **Space/Workspace Management** - KANBAN and SCRUM methodologies
- **Scrum Master Tools** - Sprint and meeting management for SCRUM spaces
- **Sprint Management** - Create, update, and track sprints with status transitions
- **Meeting Scheduling** - Schedule and manage team meetings (Daily Standup, Planning, Review, Retrospective, etc.)
- **🔔 Push Notifications** - Real-time notifications via Firebase Cloud Messaging with Redis queue
- **🤖 AI Agent Integration** - Redis pub/sub for AI agent notifications
- **Clean Architecture** - Services, controllers, middleware separation
- **PostgreSQL Database** - With Prisma ORM
- **TypeScript** - Fully typed codebase

---

## 📋 Table of Contents

- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Notification System Setup](#notification-system-setup)
- [Running the Server](#running-the-server)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication-endpoints)
  - [User Management](#user-management-endpoints)
  - [Invitation System](#invitation-system-endpoints)
  - [Space Management](#space-management-endpoints)
  - [Space Member Management](#space-member-management-endpoints)
  - [Sprint Management (SCRUM)](#sprint-management-scrum-endpoints)
  - [Meeting Management (Scrum Master)](#meeting-management-scrum-master-endpoints)
  - [Notification System](#notification-system-endpoints)
- [Permission Matrix](#permission-matrix)
- [Error Responses](#error-responses)

---

## 🛠️ Installation

### Prerequisites

- Node.js 18+
- PostgreSQL 16+
- **Redis 6+** (for notifications)
- **Firebase Project** (for push notifications)
- npm or yarn

### Install Dependencies

```bash
npm install
```

---

## ⚙️ Environment Setup

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/apcs_db"

# JWT Secret (change in production)
JWT_SECRET="apcs_super_secret_key_change_in_production_2026"

# Server
PORT=3000
NODE_ENV=development
```

---

## 🗄️ Database Setup

### 1. Run Migrations

```bash
npx prisma migrate dev
```

### 2. Generate Prisma Client

```bash
npx prisma generate
```

### 3. Seed Database (Create SuperAdmin)

```bash
npm run seed
```

**Default SuperAdmin Credentials:**
- Email: `apcsSuperAdmin@gmail.com`
- Password: `superAdmin123`
- Role: `SUPERADMIN`

---

## 🔔 Notification System Setup

The server includes a Redis-based notification system with Firebase Cloud Messaging (FCM) for push notifications.

### Quick Setup

Run the automated setup script:

```bash
./scripts/setup-notifications.sh
```

### Manual Setup

1. **Install and start Redis:**
   ```bash
   # Ubuntu/Debian
   sudo apt install redis-server
   sudo systemctl start redis-server
   
   # macOS
   brew install redis
   brew services start redis
   ```

2. **Configure Firebase:**
   - Download your Firebase service account key JSON
   - Save as `src/config/firebase-admin.json`

3. **Update .env:**
   ```env
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379
   ```

4. **Regenerate Prisma Client:**
   ```bash
   npx prisma generate
   ```

### Documentation

- **Full Setup Guide:** [NOTIFICATION_SETUP.md](NOTIFICATION_SETUP.md)
- **Quick Reference:** [NOTIFICATION_QUICKSTART.md](NOTIFICATION_QUICKSTART.md)

---

## 🏃 Running the Server

### Development Mode

```bash
npm run dev
```

Server will start on `http://localhost:3000`

### Production Build

```bash
npm run build
npm start
```

---

## 📡 API Endpoints

Base URL: `http://localhost:3000`

---

## 🔐 Authentication Endpoints

### 1. Login

Authenticate user and receive JWT tokens.

**Endpoint:** `POST /api/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "apcsSuperAdmin@gmail.com",
  "password": "superAdmin123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "clxxx...",
      "email": "apcsSuperAdmin@gmail.com",
      "name": "APCS Super Admin",
      "role": "SUPERADMIN"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 1800
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing email or password
- `401 Unauthorized` - Invalid credentials

---

### 2. Refresh Token

Generate new access token using refresh token.

**Endpoint:** `POST /api/auth/refresh`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "refreshToken": "your_refresh_token_here"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "new_access_token...",
    "refreshToken": "new_refresh_token...",
    "tokenType": "Bearer",
    "expiresIn": 1800
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing refresh token
- `401 Unauthorized` - Invalid or expired refresh token

---

### 3. Logout

Revoke access token and logout user.

**Endpoint:** `POST /api/auth/logout`

**Authorization:** Required (any authenticated user: SUPERADMIN, ADMIN, or USER)

**Headers:**
```
Authorization: Bearer <your_access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `500 Internal Server Error` - Server error

**Note:** After logout, the token is added to a revoked tokens list and cannot be used again. Any subsequent requests with the same token will fail with "Token has been revoked" error.

---

## 👥 User Management Endpoints

> **Note:** All user management endpoints require authentication.  
> Include JWT token in Authorization header: `Authorization: Bearer <token>`

---

### 1. Create User

Create a new ADMIN or USER account.

**Endpoint:** `POST /api/users`

**Authorization:**
- SUPERADMIN: Can create ADMIN or USER
- ADMIN: Can create USER only

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <your_access_token>
```

**Request Body (Create ADMIN):**
```json
{
  "email": "admin@example.com",
  "password": "admin12345",
  "name": "Admin User",
  "role": "ADMIN"
}
```

**Request Body (Create USER):**
```json
{
  "email": "user@example.com",
  "password": "user12345",
  "name": "Regular User",
  "role": "USER"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "clxxx...",
    "email": "admin@example.com",
    "name": "Admin User",
    "role": "ADMIN",
    "createdAt": "2026-02-06T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields or invalid email/password
- `403 Forbidden` - ADMIN trying to create ADMIN user
- `401 Unauthorized` - Invalid or missing token

---

### 2. Get All Users

Retrieve all users with pagination.

**Endpoint:** `GET /api/users`

**Authorization:** SUPERADMIN or ADMIN

**Headers:**
```
Authorization: Bearer <your_access_token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Example:** `GET /api/users?page=1&limit=10`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "clxxx...",
        "email": "user@example.com",
        "name": "User Name",
        "role": "USER",
        "createdAt": "2026-02-06T10:30:00.000Z"
      }
    ],
    "total": 25,
    "page": 1,
    "totalPages": 3
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - User role not authorized

---

### 3. Get User by ID

Retrieve a specific user by their ID.

**Endpoint:** `GET /api/users/:id`

**Authorization:** SUPERADMIN or ADMIN

**Headers:**
```
Authorization: Bearer <your_access_token>
```

**Example:** `GET /api/users/clxxx123`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "email": "user@example.com",
    "name": "User Name",
    "role": "USER",
    "createdAt": "2026-02-06T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid user ID
- `404 Not Found` - User not found
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - User role not authorized

---

### 4. Get Current User Profile

Get the authenticated user's own profile.

**Endpoint:** `GET /api/users/me`

**Authorization:** Any authenticated user

**Headers:**
```
Authorization: Bearer <your_access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "email": "me@example.com",
    "name": "My Name",
    "role": "USER",
    "createdAt": "2026-02-06T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - User not found

---

### 5. Update User Role

Change a user's role (promote/demote).

**Endpoint:** `PATCH /api/users/:id/role`

**Authorization:** SUPERADMIN only

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <superadmin_token>
```

**Request Body:**
```json
{
  "role": "ADMIN"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User role updated successfully",
  "data": {
    "id": "clxxx...",
    "email": "user@example.com",
    "name": "User Name",
    "role": "ADMIN",
    "createdAt": "2026-02-06T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid role or user ID
- `403 Forbidden` - Not SUPERADMIN
- `401 Unauthorized` - Invalid or missing token

---

### 6. Delete User

Permanently delete a user account.

**Endpoint:** `DELETE /api/users/:id`

**Authorization:** SUPERADMIN only

**Headers:**
```
Authorization: Bearer <superadmin_token>
```

**Example:** `DELETE /api/users/clxxx123`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid user ID or attempting to delete SUPERADMIN
- `403 Forbidden` - Not SUPERADMIN
- `404 Not Found` - User not found
- `401 Unauthorized` - Invalid or missing token

---

## 📨 Invitation System Endpoints

> **Note:** The invitation system allows SUPERADMIN and ADMIN to invite new users to the platform. Invited users can accept or deny invitations to create their accounts.

---

### 1. Create Invitation

Create an invitation to join the platform.

**Endpoint:** `POST /api/invitations`

**Authorization:**
- SUPERADMIN: Can invite USER or ADMIN
- ADMIN: Can invite USER only

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <your_access_token>
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "role": "USER"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Invitation created successfully",
  "data": {
    "id": "inv_123",
    "email": "newuser@example.com",
    "role": "USER",
    "status": "PENDING",
    "senderId": "user_456",
    "senderName": "Admin User",
    "senderEmail": "admin@example.com",
    "createdAt": "2026-02-06T11:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input, email already exists, or pending invitation exists
- `403 Forbidden` - Insufficient permissions
- `401 Unauthorized` - Invalid or missing token

---

### 2. Get All Invitations

Get all invitations (SUPERADMIN sees all, ADMIN sees only their own).

**Endpoint:** `GET /api/invitations`

**Authorization:** SUPERADMIN or ADMIN

**Headers:**
```
Authorization: Bearer <your_access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "inv_123",
      "email": "newuser@example.com",
      "role": "USER",
      "status": "PENDING",
      "senderId": "user_456",
      "senderName": "Admin User",
      "senderEmail": "admin@example.com",
      "createdAt": "2026-02-06T11:00:00.000Z"
    }
  ]
}
```

---

### 3. Check Invitations by Email

Check pending invitations for a specific email (public endpoint).

**Endpoint:** `GET /api/invitations/check/:email`

**Authorization:** Not required (Public)

**Example:**
```bash
curl -X GET http://localhost:3000/api/invitations/check/newuser@example.com
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "inv_123",
      "email": "newuser@example.com",
      "role": "USER",
      "status": "PENDING",
      "senderId": "user_456",
      "senderName": "Admin User",
      "senderEmail": "admin@example.com",
      "createdAt": "2026-02-06T11:00:00.000Z"
    }
  ]
}
```

---

### 4. Accept Invitation

Accept an invitation and create a new user account.

**Endpoint:** `POST /api/invitations/:id/accept`

**Authorization:** Not required (Public)

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "New User"
}
```

**Validation:**
- Email must match the invitation email
- Password must be at least 6 characters
- Name is required

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Invitation accepted and account created successfully",
  "data": {
    "user": {
      "id": "user_789",
      "email": "newuser@example.com",
      "name": "New User",
      "role": "USER",
      "createdAt": "2026-02-06T11:30:00.000Z"
    },
    "invitation": {
      "id": "inv_123",
      "email": "newuser@example.com",
      "role": "USER",
      "status": "ACCEPTED",
      "senderId": "user_456",
      "senderName": "Admin User",
      "senderEmail": "admin@example.com",
      "receiverId": "user_789",
      "createdAt": "2026-02-06T11:00:00.000Z",
      "respondedAt": "2026-02-06T11:30:00.000Z"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input, email mismatch, user already exists, or invitation not pending
- `404 Not Found` - Invitation not found

---

### 5. Deny Invitation

Deny an invitation.

**Endpoint:** `POST /api/invitations/:id/deny`

**Authorization:** Not required (Public)

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "newuser@example.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Invitation denied successfully",
  "data": {
    "id": "inv_123",
    "email": "newuser@example.com",
    "role": "USER",
    "status": "DENIED",
    "senderId": "user_456",
    "senderName": "Admin User",
    "senderEmail": "admin@example.com",
    "createdAt": "2026-02-06T11:00:00.000Z",
    "respondedAt": "2026-02-06T11:35:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input, email mismatch, or invitation not pending
- `404 Not Found` - Invitation not found

---

### 6. Cancel Invitation

Cancel a pending invitation (only sender or SUPERADMIN).

**Endpoint:** `DELETE /api/invitations/:id`

**Authorization:** SUPERADMIN or ADMIN (sender only)

**Headers:**
```
Authorization: Bearer <your_access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Invitation cancelled successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Invitation not pending or not found
- `403 Forbidden` - Not the sender or SUPERADMIN
- `401 Unauthorized` - Invalid or missing token

---

## 🏢 Space Management Endpoints

> **Note:** Spaces are workspaces that can use either KANBAN or SCRUM methodology.

---

### 1. Create Space

Create a new workspace.

**Endpoint:** `POST /api/spaces`

**Authorization:** SUPERADMIN or ADMIN

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <your_access_token>
```

**Request Body:**
```json
{
  "name": "My Project Space",
  "methodology": "SCRUM",
  "ownerId": "optional_user_id"
}
```

**Fields:**
- `name` (required): Space name
- `methodology` (required): Either `KANBAN` or `SCRUM`
- `ownerId` (optional): User ID of the owner (defaults to current user)
  - ADMIN can only create for themselves
  - SUPERADMIN can create for any user

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Space created successfully",
  "data": {
    "id": "clxxx...",
    "name": "My Project Space",
    "methodology": "SCRUM",
    "ownerId": "user_id",
    "createdAt": "2026-02-06T10:30:00.000Z",
    "owner": {
      "id": "user_id",
      "name": "Owner Name",
      "email": "owner@example.com"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields or invalid methodology
- `403 Forbidden` - ADMIN trying to create for another user
- `401 Unauthorized` - Invalid or missing token

---

### 2. Get All Spaces

Retrieve all spaces with pagination.

**Endpoint:** `GET /api/spaces`

**Authorization:** SUPERADMIN or ADMIN

**Headers:**
```
Authorization: Bearer <your_access_token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Example:** `GET /api/spaces?page=1&limit=10`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "spaces": [
      {
        "id": "clxxx...",
        "name": "Project Alpha",
        "methodology": "SCRUM",
        "ownerId": "user_id",
        "createdAt": "2026-02-06T10:30:00.000Z",
        "owner": {
          "id": "user_id",
          "name": "Owner Name",
          "email": "owner@example.com"
        }
      }
    ],
    "total": 15,
    "page": 1,
    "totalPages": 2
  }
}
```

---

### 3. Get My Spaces

Get all spaces owned by or accessible to the current user.

**Endpoint:** `GET /api/spaces/my`

**Authorization:** Any authenticated user

**Headers:**
```
Authorization: Bearer <your_access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "name": "My Space",
      "methodology": "KANBAN",
      "ownerId": "user_id",
      "createdAt": "2026-02-06T10:30:00.000Z",
      "owner": {
        "id": "user_id",
        "name": "My Name",
        "email": "me@example.com"
      }
    }
  ]
}
```

---

### 4. Get Space by ID

Retrieve a specific space by its ID.

**Endpoint:** `GET /api/spaces/:id`

**Authorization:** Any authenticated user

**Headers:**
```
Authorization: Bearer <your_access_token>
```

**Example:** `GET /api/spaces/clxxx123`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "name": "Project Space",
    "methodology": "SCRUM",
    "ownerId": "user_id",
    "createdAt": "2026-02-06T10:30:00.000Z",
    "owner": {
      "id": "user_id",
      "name": "Owner Name",
      "email": "owner@example.com"
    }
  }
}
```

**Error Responses:**
- `404 Not Found` - Space not found
- `401 Unauthorized` - Invalid or missing token

---

### 5. Update Space

Update space name or methodology.

**Endpoint:** `PATCH /api/spaces/:id`

**Authorization:** SUPERADMIN or Space Owner

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <your_access_token>
```

**Request Body:**
```json
{
  "name": "Updated Space Name",
  "methodology": "KANBAN"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Space updated successfully",
  "data": {
    "id": "clxxx...",
    "name": "Updated Space Name",
    "methodology": "KANBAN",
    "ownerId": "user_id",
    "createdAt": "2026-02-06T10:30:00.000Z",
    "owner": {
      "id": "user_id",
      "name": "Owner Name",
      "email": "owner@example.com"
    }
  }
}
```

**Error Responses:**
- `403 Forbidden` - Not space owner or SUPERADMIN
- `404 Not Found` - Space not found

---

### 6. Delete Space

Permanently delete a space.

**Endpoint:** `DELETE /api/spaces/:id`

**Authorization:** SUPERADMIN or Space Owner

**Headers:**
```
Authorization: Bearer <your_access_token>
```

**Example:** `DELETE /api/spaces/clxxx123`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Space deleted successfully"
}
```

**Error Responses:**
- `403 Forbidden` - Not space owner or SUPERADMIN
- `404 Not Found` - Space not found

---

## 👥 Space Member Management Endpoints

> **Note:** Manage team members in spaces with proper role assignments for SCRUM methodology.

---

### 1. Add Member to Space

Add a user as a member of a space.

**Endpoint:** `POST /api/spaces/:spaceId/members`

**Authorization:** SUPERADMIN, ADMIN, or Space Owner

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <your_access_token>
```

**Request Body (KANBAN Space):**
```json
{
  "userId": "user_id_here"
}
```

**Request Body (SCRUM Space):**
```json
{
  "userId": "user_id_here",
  "scrumRole": "DEVELOPER"
}
```

**Scrum Roles:**
- `PRODUCT_OWNER` - Product Owner
- `SCRUM_MASTER` - Scrum Master
- `DEVELOPER` - Development Team Member

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Member added successfully",
  "data": {
    "id": "member_id",
    "spaceId": "space_id",
    "userId": "user_id",
    "scrumRole": "DEVELOPER",
    "joinedAt": "2026-02-06T10:30:00.000Z",
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "USER"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - User already a member or invalid scrumRole
- `403 Forbidden` - Not authorized to add members
- `404 Not Found` - Space or user not found

---

### 2. Get Space Members

Retrieve all members of a space.

**Endpoint:** `GET /api/spaces/:spaceId/members`

**Authorization:** Any authenticated user

**Headers:**
```
Authorization: Bearer <your_access_token>
```

**Example:** `GET /api/spaces/clxxx123/members`

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "member_id_1",
      "spaceId": "space_id",
      "userId": "user_id_1",
      "scrumRole": "PRODUCT_OWNER",
      "joinedAt": "2026-02-06T10:00:00.000Z",
      "user": {
        "id": "user_id_1",
        "name": "Alice Smith",
        "email": "alice@example.com",
        "role": "ADMIN"
      }
    },
    {
      "id": "member_id_2",
      "spaceId": "space_id",
      "userId": "user_id_2",
      "scrumRole": "DEVELOPER",
      "joinedAt": "2026-02-06T10:15:00.000Z",
      "user": {
        "id": "user_id_2",
        "name": "Bob Jones",
        "email": "bob@example.com",
        "role": "USER"
      }
    }
  ]
}
```

---

### 3. Update Member Scrum Role

Update a member's Scrum role (SCRUM spaces only).

**Endpoint:** `PATCH /api/spaces/:spaceId/members/:userId`

**Authorization:** SUPERADMIN, ADMIN, or Space Owner

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <your_access_token>
```

**Request Body:**
```json
{
  "scrumRole": "SCRUM_MASTER"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Member role updated successfully",
  "data": {
    "id": "member_id",
    "spaceId": "space_id",
    "userId": "user_id",
    "scrumRole": "SCRUM_MASTER",
    "joinedAt": "2026-02-06T10:30:00.000Z",
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "USER"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid scrumRole or KANBAN space
- `403 Forbidden` - Not authorized
- `404 Not Found` - Space or member not found

---

### 4. Remove Member from Space

Remove a member from a space.

**Endpoint:** `DELETE /api/spaces/:spaceId/members/:userId`

**Authorization:** SUPERADMIN, ADMIN, or Space Owner

**Headers:**
```
Authorization: Bearer <your_access_token>
```

**Example:** `DELETE /api/spaces/clxxx123/members/user_456`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Member removed successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Attempting to remove space owner
- `403 Forbidden` - Not authorized
- `404 Not Found` - Space or member not found

---

## 🏃 Sprint Management (SCRUM) Endpoints

> **Note:** Sprints are only available in SCRUM spaces. Only Scrum Masters can create and manage sprints.

---

### 1. Create Sprint

Create a new sprint (only when no active/planning sprint exists).

**Endpoint:** `POST /api/spaces/:spaceId/sprints`

**Authorization:** Scrum Master only

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <your_access_token>
```

**Request Body:**
```json
{
  "name": "Sprint 1",
  "goal": "Implement user authentication",
  "startDate": "2026-02-10",
  "endDate": "2026-02-24"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Sprint created successfully",
  "data": {
    "id": "sprint_123",
    "spaceId": "space_456",
    "name": "Sprint 1",
    "goal": "Implement user authentication",
    "status": "PLANNING",
    "startDate": "2026-02-10",
    "endDate": "2026-02-24",
    "createdAt": "2026-02-06T12:00:00.000Z"
  }
}
```

---

### 2. Get All Sprints

Get all sprints for a space.

**Endpoint:** `GET /api/spaces/:spaceId/sprints`

**Authorization:** Space member

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "sprint_123",
      "spaceId": "space_456",
      "name": "Sprint 1",
      "goal": "Implement user authentication",
      "status": "ACTIVE",
      "startDate": "2026-02-10",
      "endDate": "2026-02-24",
      "createdAt": "2026-02-06T12:00:00.000Z"
    }
  ]
}
```

---

### 3. Get Active Sprint

Get the currently active sprint.

**Endpoint:** `GET /api/spaces/:spaceId/sprints/active`

**Authorization:** Space member

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "sprint_123",
    "spaceId": "space_456",
    "name": "Sprint 1",
    "goal": "Implement user authentication",
    "status": "ACTIVE",
    "startDate": "2026-02-10",
    "endDate": "2026-02-24",
    "createdAt": "2026-02-06T12:00:00.000Z"
  }
}
```

---

### 4. Get Sprint by ID

Get sprint details.

**Endpoint:** `GET /api/sprints/:id`

**Authorization:** Space member

---

### 5. Update Sprint

Update sprint details (cannot update completed sprints).

**Endpoint:** `PATCH /api/sprints/:id`

**Authorization:** Scrum Master only

**Request Body:**
```json
{
  "name": "Sprint 1 - Updated",
  "goal": "Updated goal",
  "endDate": "2026-02-25"
}
```

---

### 6. Update Sprint Status

Change sprint status (PLANNING → ACTIVE → COMPLETED).

**Endpoint:** `PATCH /api/sprints/:id/status`

**Authorization:** Scrum Master only

**Request Body:**
```json
{
  "status": "ACTIVE"
}
```

**Valid Transitions:**
- PLANNING → ACTIVE
- ACTIVE → COMPLETED
- Cannot change status of COMPLETED sprint

---

### 7. Delete Sprint

Delete a sprint (only in PLANNING status).

**Endpoint:** `DELETE /api/sprints/:id`

**Authorization:** Scrum Master only

---

## 📅 Meeting Management (Scrum Master) Endpoints

> **Note:** Meetings can only be created in SCRUM spaces by Scrum Masters.

---

### 1. Create Meeting

Schedule a meeting for the team.

**Endpoint:** `POST /api/spaces/:spaceId/meetings`

**Authorization:** Scrum Master only

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <your_access_token>
```

**Request Body:**
```json
{
  "title": "Daily Standup",
  "description": "Daily synchronization meeting",
  "type": "DAILY_STANDUP",
  "scheduledAt": "2026-02-07T09:00:00Z",
  "duration": 15,
  "sprintId": "sprint_123"
}
```

**Meeting Types:**
- `DAILY_STANDUP` - Daily standup meeting
- `SPRINT_PLANNING` - Sprint planning session
- `SPRINT_REVIEW` - Sprint review/demo
- `SPRINT_RETROSPECTIVE` - Sprint retrospective
- `BACKLOG_REFINEMENT` - Backlog grooming
- `CUSTOM` - Custom meeting

**Duration:** 5-480 minutes

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Meeting created successfully",
  "data": {
    "id": "meeting_123",
    "spaceId": "space_456",
    "sprintId": "sprint_123",
    "title": "Daily Standup",
    "description": "Daily synchronization meeting",
    "type": "DAILY_STANDUP",
    "scheduledAt": "2026-02-07T09:00:00.000Z",
    "duration": 15,
    "createdById": "user_789",
    "createdBy": {
      "id": "user_789",
      "name": "Scrum Master",
      "email": "scrummaster@example.com"
    },
    "createdAt": "2026-02-06T12:00:00.000Z",
    "updatedAt": "2026-02-06T12:00:00.000Z"
  }
}
```

---

### 2. Get All Meetings

Get all meetings for a space.

**Endpoint:** `GET /api/spaces/:spaceId/meetings`

**Authorization:** Space member

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "meeting_123",
      "spaceId": "space_456",
      "title": "Daily Standup",
      "type": "DAILY_STANDUP",
      "scheduledAt": "2026-02-07T09:00:00.000Z",
      "duration": 15,
      "createdBy": {
        "id": "user_789",
        "name": "Scrum Master",
        "email": "scrummaster@example.com"
      }
    }
  ]
}
```

---

### 3. Get Meeting by ID

Get meeting details.

**Endpoint:** `GET /api/meetings/:id`

**Authorization:** Space member

---

### 4. Update Meeting

Update meeting details or reschedule.

**Endpoint:** `PATCH /api/meetings/:id`

**Authorization:** Scrum Master only

**Request Body:**
```json
{
  "scheduledAt": "2026-02-07T10:00:00Z",
  "duration": 30
}
```

---

### 5. Delete Meeting

Delete a meeting.

**Endpoint:** `DELETE /api/meetings/:id`

**Authorization:** Scrum Master only

---

## 🔑 Permission Matrix

### Authentication

| Action | SUPERADMIN | ADMIN | USER | Public |
|--------|:----------:|:-----:|:----:|:------:|
| Login | ✅ | ✅ | ✅ | ✅ |
| Refresh Token | ✅ | ✅ | ✅ | ✅ |
| Logout | ✅ | ✅ | ✅ | ❌ |

### User Management

| Action | SUPERADMIN | ADMIN | USER |
|--------|:----------:|:-----:|:----:|
| Create ADMIN | ✅ | ❌ | ❌ |
| Create USER | ✅ | ✅ | ❌ |
| View All Users | ✅ | ✅ | ❌ |
| View User by ID | ✅ | ✅ | ❌ |
| View Own Profile | ✅ | ✅ | ✅ |
| Update User Details | ✅ | ✅ (USER only) | ❌ |
| Update User Role | ✅ | ❌ | ❌ |
| Delete ADMIN | ✅ | ❌ | ❌ |
| Delete USER | ✅ | ✅ | ❌ |

### Invitation System

| Action | SUPERADMIN | ADMIN | USER | Public |
|--------|:----------:|:-----:|:----:|:------:|
| Create Invitation (USER) | ✅ | ✅ | ❌ | ❌ |
| Create Invitation (ADMIN) | ✅ | ❌ | ❌ | ❌ |
| View All Invitations | ✅ | Own only | ❌ | ❌ |
| Check Invitations by Email | ✅ | ✅ | ✅ | ✅ |
| Accept Invitation | N/A | N/A | N/A | ✅ |
| Deny Invitation | N/A | N/A | N/A | ✅ |
| Cancel Invitation | ✅ | Own only | ❌ | ❌ |

### Space Management

| Action | SUPERADMIN | ADMIN | USER | Space Owner |
|--------|:----------:|:-----:|:----:|:-----------:|
| Create Space | ✅ | ✅ (own) | ❌ | - |
| View All Spaces | ✅ | ✅ | ❌ | - |
| View My Spaces | ✅ | ✅ | ✅ | - |
| View Space by ID | ✅ | ✅ | ✅ | ✅ |
| Update Space | ✅ | ❌ | ❌ | ✅ |
| Delete Space | ✅ | ❌ | ❌ | ✅ |

### Space Member Management

| Action | SUPERADMIN | ADMIN | USER | Space Owner |
|--------|:----------:|:-----:|:----:|:-----------:|
| Add Member | ✅ | ✅ | ❌ | ✅ |
| View Members | ✅ | ✅ | ✅ | ✅ |
| Update Member Role | ✅ | ✅ | ❌ | ✅ |
| Remove Member | ✅ | ✅ | ❌ | ✅ |

### Sprint Management (SCRUM Only)

| Action | SUPERADMIN | ADMIN | USER | Scrum Master |
|--------|:----------:|:-----:|:----:|:------------:|
| Create Sprint | ❌ | ❌ | ❌ | ✅ |
| View All Sprints | ✅ | ✅ | ✅ | ✅ |
| View Active Sprint | ✅ | ✅ | ✅ | ✅ |
| View Sprint by ID | ✅ | ✅ | ✅ | ✅ |
| Update Sprint | ❌ | ❌ | ❌ | ✅ |
| Update Sprint Status | ❌ | ❌ | ❌ | ✅ |
| Delete Sprint (PLANNING) | ❌ | ❌ | ❌ | ✅ |

### Meeting Management (SCRUM Only)

| Action | SUPERADMIN | ADMIN | USER | Scrum Master |
|--------|:----------:|:-----:|:----:|:------------:|
| Create Meeting | ❌ | ❌ | ❌ | ✅ |
| View All Meetings | ✅ | ✅ | ✅ | ✅ |
| View Meeting by ID | ✅ | ✅ | ✅ | ✅ |
| Update Meeting | ❌ | ❌ | ❌ | ✅ |
| Delete Meeting | ❌ | ❌ | ❌ | ✅ |

---

## ❌ Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Email and password are required"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "No token provided"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "User not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## 🔔 Notification System Endpoints

### POST `/api/notifications/register-token`
Register a user's FCM token for push notifications.

**Authentication:** Required

**Request Body:**
```json
{
  "fcmToken": "string",
  "platform": "web" | "ios" | "android"
}
```

**Response:**
```json
{
  "message": "Token registered successfully",
  "token": {
    "id": "string",
    "platform": "web",
    "createdAt": "timestamp"
  }
}
```

### GET `/api/notifications/tokens`
Get all registered FCM tokens for the authenticated user.

**Authentication:** Required

**Response:**
```json
{
  "tokens": [
    {
      "id": "string",
      "platform": "web",
      "createdAt": "timestamp"
    }
  ]
}
```

### DELETE `/api/notifications/tokens/:token`
Delete a specific FCM token.

**Authentication:** Required

**Response:**
```json
{
  "message": "Token deleted successfully"
}
```

### POST `/api/notifications/send`
Send a notification to a specific user (admin only).

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "userId": "string",
  "title": "string",
  "body": "string",
  "data": {
    "key": "value"
  }
}
```

**Response:**
```json
{
  "message": "Notification queued successfully",
  "jobId": "string"
}
```

### POST `/api/notifications/send-bulk`
Send notifications to multiple users (admin only).

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "userIds": ["string", "string"],
  "title": "string",
  "body": "string",
  "data": {
    "key": "value"
  }
}
```

**Response:**
```json
{
  "message": "Bulk notifications queued successfully",
  "jobCount": 2
}
```

---

## 🧪 Testing Workflow

### 1. Start the Server
```bash
npm run dev
```

### 2. Login as SuperAdmin
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "apcsSuperAdmin@gmail.com",
    "password": "superAdmin123"
  }'
```

Save the `accessToken` from the response.

### 3. Create an Admin User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_superadmin_token>" \
  -d '{
    "email": "admin@test.com",
    "password": "admin12345",
    "name": "Test Admin",
    "role": "ADMIN"
  }'
```

### 4. Get All Users
```bash
curl -X GET http://localhost:3000/api/users?page=1&limit=10 \
  -H "Authorization: Bearer <your_token>"
```

### 5. Create a Space
```bash
curl -X POST http://localhost:3000/api/spaces \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_admin_token>" \
  -d '{
    "name": "Project Alpha",
    "methodology": "SCRUM"
  }'
```

### 6. Add Member to Space
```bash
curl -X POST http://localhost:3000/api/spaces/<space_id>/members \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d '{
    "userId": "<user_id>",
    "scrumRole": "DEVELOPER"
  }'
```

### 7. Create and Use Invitation
```bash
# Create invitation (as SUPERADMIN or ADMIN)
curl -X POST http://localhost:3000/api/invitations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d '{
    "email": "invited@example.com",
    "role": "USER"
  }'

# Check invitation (public - no auth needed)
curl -X GET http://localhost:3000/api/invitations/check/invited@example.com

# Accept invitation (public - creates account)
curl -X POST http://localhost:3000/api/invitations/<invitation_id>/accept \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invited@example.com",
    "password": "newPassword123",
    "name": "Invited User"
  }'
```

### 8. Logout
```bash
# Logout to revoke token
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer <your_token>"

# Try to use the same token (should fail with "Token has been revoked")
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer <revoked_token>"
```

---

## 📁 Project Structure

```
apcs_server/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Database migrations
│   └── seed.ts               # Database seeding script
├── src/
│   ├── config/
│   │   └── auth.ts           # Auth configuration
│   ├── controllers/
│   │   ├── auth.controller.ts       # Auth handlers
│   │   ├── user.controller.ts       # User handlers
│   │   ├── invitation.controller.ts # Invitation handlers
│   │   ├── space.controller.ts      # Space handlers
│   │   └── spaceMember.controller.ts # Space member handlers
│   ├── middleware/
│   │   └── auth.middleware.ts       # JWT verification & RBAC
│   ├── services/
│   │   ├── auth.service.ts          # Token revocation logic
│   │   ├── invitation.service.ts    # Invitation business logic
│   │   ├── user.service.ts          # User business logic
│   │   └── space.service.ts         # Space business logic
│   ├── routes/
│   │   ├── auth.routes.ts           # Auth endpoints
│   │   ├── invitation.routes.ts     # Invitation endpoints
│   │   ├── user.routes.ts           # User endpoints
│   │   └── space.routes.ts          # Space & member endpoints
│   └── lib/
│       ├── prisma.ts                # Prisma client
│       └── auth.ts                  # JWT & password utilities
├── app.ts                     # Express app setup
├── server.ts                  # Server entry point
├── package.json
└── tsconfig.json
```

---

## 🔐 Security Notes

- JWT tokens expire after 30 minutes (access token)
- Refresh tokens expire after 7 days
- Revoked tokens are stored in database and checked on every request
- Passwords are hashed using bcrypt with 10 rounds
- Password minimum length: 6 characters
- SUPERADMIN accounts cannot be created through API
- SUPERADMIN accounts cannot be deleted through API
- Invitations require email validation
- Only one pending invitation per email allowed
- Change `JWT_SECRET` in production environment
- Use HTTPS in production

---

## 🛠️ Development

### Format Code
```bash
npm run format
```

### View Database
```bash
npx prisma studio
```

### Reset Database
```bash
npx prisma migrate reset --force
npm run seed
```

---

## 📝 License

MIT

---

## 👥 Contributors

APCS Team

---

## 📞 Support

For questions or issues, please contact the development team.
