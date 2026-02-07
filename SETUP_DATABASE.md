# APCS - Setup Database Script

## 🚀 Quick Start for Hackathon Testers

This script will:
1. Build and start all Docker containers
2. **Automatically** apply the database schema (via backend container)
3. **Automatically** seed the database with initial data including a SUPERADMIN user (via backend container)

The backend container is configured to automatically run the schema and seed SQL scripts on startup!

## 📋 Prerequisites

- Docker Desktop installed and running
- Git (to clone the repository)

## 🎯 How to Use

### Option 1: Using the Batch Script (Windows) - RECOMMENDED

```bash
setup-database.bat
```

This single command will:
- Clean up old containers
- Build all Docker images
- Start all services
- The backend will automatically apply schema.sql and seed.sql

### Option 2: Manual Docker Compose

```bash
# Just run docker-compose - the backend handles the rest!
docker-compose up -d --build
```

The backend container's entrypoint script will automatically:
1. Wait for PostgreSQL to be ready
2. Apply `/db/schema.sql`
3. Apply `/db/seed.sql`  
4. Start the Express server

### Option 3: Reset Everything

```bash
# Complete reset and rebuild
docker-compose down -v
docker-compose up -d --build
```

## 🔑 Default Credentials

After running the script, you can login with:

### Super Admin Account
- **Email:** `admin@apcs.com`
- **Password:** `password123`
- **Role:** SUPERADMIN
- **Access:** Full system access

### Regular Admin Account  
- **Email:** `alice@apcs.com`
- **Password:** `password123`
- **Role:** ADMIN

### Regular User Accounts
- **Bob:** `bob@apcs.com` / `password123`
- **Charlie:** `charlie@apcs.com` / `password123`
- **Diana:** `diana@apcs.com` / `password123`

## 🌐 Application URLs

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **Agent API:** http://localhost:8000

## 🛠️ Troubleshooting

### Check Backend Logs (Schema/Seed Progress)
```bash
# View backend logs to see schema/seed execution
docker-compose logs -f backend

# You should see:
# 🔨 Applying database schema...
# ✅ Schema applied successfully!
# 🌱 Seeding database...
# ✅ Database seeded successfully!
```

### PostgreSQL connection refused
```bash
# Check if container is running
docker ps

# Check PostgreSQL logs
docker logs apcs_postgres

# Check backend logs
docker logs apcs_backend
```

### Schema/Seed errors
```bash
# Reset everything and try again
docker-compose down -v
docker-compose up -d --build

# Watch the backend logs
docker-compose logs -f backend
```

### Port already in use
```bash
# Check what's using the ports
netstat -ano | findstr :3000
netstat -ano | findstr :3001
netstat -ano | findstr :5432
```

## 📦 What's Included in Seed Data

- 5 users (1 SUPERADMIN, 1 ADMIN, 3 regular users)
- 2 workspaces (Development Team, Marketing Project)
- Sample Kanban board with columns and tasks
- Sample Sprint for Scrum methodology
- User sessions

## 🔄 Reset Database

To reset the database to initial state:

```bash
docker-compose down -v
setup-database.bat
```

## 📝 Notes for Hackathon Judges

- All passwords are set to `password123` for easy testing
- The SUPERADMIN account has full access to all features
- Sample data demonstrates both Kanban and Scrum methodologies
- PostgreSQL data is persisted in Docker volumes
