# Complete Deployment Guide

> Production-ready deployment instructions for the APCS platform

## Overview

This guide provides comprehensive instructions for deploying all three components of the APCS platform: the frontend application, backend API server, and AI agent system. It covers both local development and production deployment scenarios.

## Prerequisites

### System Requirements

**For Local Development:**
- **CPU**: 4 cores minimum (8 cores recommended)
- **RAM**: 8GB minimum (16GB recommended)
- **Storage**: 20GB free space
- **OS**: Windows 10/11, macOS 10.15+, or Linux (Ubuntu 20.04+)

**For Production:**
- **CPU**: 8 cores minimum
- **RAM**: 16GB minimum (32GB recommended)
- **Storage**: 100GB SSD
- **OS**: Linux (Ubuntu 22.04 LTS recommended)

### Software Requirements

- **Node.js 18+** and npm/pnpm
- **Python 3.11+**
- **PostgreSQL 16+**
- **Redis 6+**
- **Docker & Docker Compose** (optional but recommended)
- **Git**

### External Services

- **Mistral AI API Key** (for agent system)
- **Firebase Project** (for push notifications)
- **Domain Name** (for production)
- **SSL Certificate** (for production)

## Quick Start (Local Development)

### 1. Clone Repository

```bash
git clone https://github.com/your-org/apcs-platform.git
cd apcs-platform
```

### 2. Start Database

```powershell
# Using Docker Compose
cd apcs_agent_system
docker-compose up -d

# Wait for PostgreSQL to be ready
Start-Sleep -Seconds 5

# Initialize database
Get-Content db\schema.sql | docker exec -i microhack-db psql -U microhack -d collaboration_platform
Get-Content db\seed.sql | docker exec -i microhack-db psql -U microhack -d collaboration_platform
```

### 3. Start Backend Server

```powershell
cd ..\apcs_server

# Install dependencies
npm install

# Create .env file
@"
DATABASE_URL="postgresql://microhack:securepassword@localhost:5432/collaboration_platform"
JWT_SECRET="apcs_super_secret_key_change_in_production_2026"
PORT=3000
NODE_ENV=development
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
"@ | Out-File -FilePath .env -Encoding UTF8

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start server
npm run dev
```

Server runs on `http://localhost:3000`

### 4. Start Agent System

```powershell
cd ..\apcs_agent_system

# Create virtual environment
python -m venv venv
.\venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Create .env file
@"
DB_HOST=localhost
DB_PORT=5432
DB_USER=microhack
DB_PASSWORD=securepassword
DB_NAME=collaboration_platform
MISTRAL_API_KEY=your_api_key_here
EXTERNAL_BACKEND_URL=http://localhost:3000
PORT=8000
"@ | Out-File -FilePath .env -Encoding UTF8

# Start server
uvicorn api.main:app --reload --port 8000
```

Agent system runs on `http://localhost:8000`

### 5. Start Frontend

```powershell
cd ..\MicroHack

# Install dependencies
pnpm install

# Create .env.local file
@"
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_AGENT_API_URL=http://localhost:8000
"@ | Out-File -FilePath .env.local -Encoding UTF8

# Start development server
pnpm dev
```

Frontend runs on `http://localhost:3001`

### 6. Access Application

Open browser to `http://localhost:3001` and login with:
- **Email**: `superadmin@example.com`
- **Password**: `SuperAdmin123!`

## Production Deployment

### Architecture

```
                    ┌───────────────┐
                    │   Internet    │
                    └───────┬───────┘
                            │
                    ┌───────┴───────┐
                    │  Load Balancer│
                    │   (Nginx)     │
                    └───────┬───────┘
                            │
        ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┼┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
        ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   Frontend    │  │  Backend API  │  │ Agent System  │
│   (Static)    │  │   (Node.js)   │  │   (Python)    │
│   Nginx       │  │               │  │               │
│   Port 80/443 │  │   Port 3000   │  │   Port 8000   │
└───────────────┘  └───────┬───────┘  └───────┬───────┘
                           │                   │
                           └─────────┬─────────┘
                                     │
                          ┌──────────┴──────────┐
                          │    PostgreSQL 16    │
                          │    Port 5432        │
                          └─────────────────────┘
                                     │
                          ┌──────────┴──────────┐
                          │      Redis 6        │
                          │    Port 6379        │
                          └─────────────────────┘
```

### 1. Server Setup

#### Ubuntu 22.04 Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose -y

# Install Nginx
sudo apt install nginx -y

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Environment Configuration

#### Backend (.env)

```env
# Database
DATABASE_URL="postgresql://apcs_user:STRONG_PASSWORD_HERE@localhost:5432/apcs_production"

# JWT
JWT_SECRET="GENERATE_STRONG_SECRET_HERE_64_CHARS_MIN"
JWT_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

#### Agent System (.env)

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=apcs_user
DB_PASSWORD=STRONG_PASSWORD_HERE
DB_NAME=apcs_production

# Mistral
MISTRAL_API_KEY=your_production_api_key

# Backend
EXTERNAL_BACKEND_URL=http://localhost:3000

# Server
PORT=8000
LOG_LEVEL=INFO
```

#### Frontend (.env.production)

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_AGENT_API_URL=https://agents.yourdomain.com

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key
```

### 3. Database Setup

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql <<EOF
CREATE USER apcs_user WITH PASSWORD 'STRONG_PASSWORD_HERE';
CREATE DATABASE apcs_production OWNER apcs_user;
GRANT ALL PRIVILEGES ON DATABASE apcs_production TO apcs_user;
\q
EOF

# Initialize schema
psql -U apcs_user -d apcs_production -f apcs_agent_system/db/schema.sql
```

### 4. Redis Setup

```bash
# Install Redis
sudo apt install redis-server -y

# Configure Redis for production
sudo nano /etc/redis/redis.conf
# Set: maxmemory 256mb
# Set: maxmemory-policy allkeys-lru

# Restart Redis
sudo systemctl restart redis
sudo systemctl enable redis
```

### 5. Backend Deployment

#### Option A: Docker (Recommended)

```bash
cd apcs_server

# Build Docker image
docker build -t apcs-backend:latest .

# Run container
docker run -d \
  --name apcs-backend \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  apcs-backend:latest
```

#### Option B: PM2

```bash
cd apcs_server

# Install dependencies
npm ci --only=production

# Build TypeScript
npm run build

# Install PM2
npm install -g pm2

# Start with PM2
pm2 start dist/server.js --name apcs-backend

# Save PM2 process list
pm2 save

# Setup PM2 startup
pm2 startup
```

### 6. Agent System Deployment

```bash
cd apcs_agent_system

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install Gunicorn
pip install gunicorn

# Create systemd service
sudo tee /etc/systemd/system/apcs-agents.service > /dev/null <<EOF
[Unit]
Description=APCS Agent System
After=network.target

[Service]
Type=notify
User=$USER
WorkingDirectory=$(pwd)
Environment="PATH=$(pwd)/venv/bin"
ExecStart=$(pwd)/venv/bin/gunicorn api.main:app \\
    --workers 4 \\
    --worker-class uvicorn.workers.UvicornWorker \\
    --bind 0.0.0.0:8000 \\
    --timeout 120
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Start service
sudo systemctl daemon-reload
sudo systemctl start apcs-agents
sudo systemctl enable apcs-agents
```

### 7. Frontend Deployment

```bash
cd MicroHack

# Install dependencies
pnpm install

# Build for production
pnpm build

# Copy build to web server
sudo cp -r .next /var/www/apcs-frontend/
sudo cp -r public /var/www/apcs-frontend/
sudo cp package.json /var/www/apcs-frontend/
sudo cp -r node_modules /var/www/apcs-frontend/ # Or run npm ci in target

# Alternative: Use PM2
pm2 start npm --name "apcs-frontend" -- start
pm2 save
```

### 8. Nginx Configuration

```nginx
# Frontend (yourdomain.com)
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API (api.yourdomain.com)
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_read_timeout 86400;
    }
}

# Agent System (agents.yourdomain.com)
server {
    listen 80;
    server_name agents.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name agents.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/agents.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/agents.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # SSE support
        proxy_buffering off;
        proxy_cache off;
    }
}
```

Save configuration and test:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 9. SSL Certificates

```bash
# Get SSL certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
sudo certbot --nginx -d api.yourdomain.com
sudo certbot --nginx -d agents.yourdomain.com

# Auto-renewal is configured by certbot
# Test renewal
sudo certbot renew --dry-run
```

### 10. Firewall Configuration

```bash
# Allow SSH
sudo ufw allow OpenSSH

# Allow HTTP/HTTPS
sudo ufw allow 'Nginx Full'

# Enable firewall
sudo ufw enable
```

## Docker Compose Deployment (Alternative)

### Complete Stack

**File**: `docker-compose.production.yml`

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:16-alpine
    container_name: apcs-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: apcs_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: apcs_production
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./apcs_agent_system/db/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U apcs_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis
  redis:
    image: redis:7-alpine
    container_name: apcs-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru

  # Backend API
  backend:
    build: ./apcs_server
    container_name: apcs-backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    environment:
      DATABASE_URL: postgresql://apcs_user:${DB_PASSWORD}@postgres:5432/apcs_production
      JWT_SECRET: ${JWT_SECRET}
      REDIS_HOST: redis
      NODE_ENV: production
    ports:
      - "3000:3000"
    volumes:
      - ./apcs_server:/app
      - /app/node_modules

  # Agent System
  agents:
    build: ./apcs_agent_system
    container_name: apcs-agents
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      backend:
        condition: service_started
    environment:
      DB_HOST: postgres
      DB_USER: apcs_user
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: apcs_production
      MISTRAL_API_KEY: ${MISTRAL_API_KEY}
      EXTERNAL_BACKEND_URL: http://backend:3000
    ports:
      - "8000:8000"

  # Frontend
  frontend:
    build: ./MicroHack
    container_name: apcs-frontend
    restart: unless-stopped
    depends_on:
      - backend
      - agents
    environment:
      NEXT_PUBLIC_API_URL: https://api.yourdomain.com/api
      NEXT_PUBLIC_AGENT_API_URL: https://agents.yourdomain.com
    ports:
      - "3001:3000"

volumes:
  postgres_data:
```

Deploy:

```bash
# Create .env file with secrets
cat > .env <<EOF
DB_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret
MISTRAL_API_KEY=your_mistral_key
EOF

# Start services
docker-compose -f docker-compose.production.yml up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

## Monitoring & Logging

### 1. Application Logs

```bash
# Backend logs (PM2)
pm2 logs apcs-backend

# Agent system logs (systemd)
sudo journalctl -u apcs-agents -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 2. Health Checks

```bash
# Backend health
curl https://api.yourdomain.com/health

# Agent system health
curl https://agents.yourdomain.com/health

# Database
psql -U apcs_user -d apcs_production -c "SELECT 1"

# Redis
redis-cli ping
```

### 3. Monitoring Tools (Optional)

```bash
# Install Prometheus
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v /path/to/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

# Install Grafana
docker run -d \
  --name grafana \
  -p 3002:3000 \
  grafana/grafana
```

## Backup & Restore

### Database Backup

```bash
# Create backup directory
mkdir -p /backups/apcs

# Automated daily backup script
cat > /usr/local/bin/backup-apcs-db.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/backups/apcs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/apcs_db_$TIMESTAMP.sql.gz"

pg_dump -U apcs_user apcs_production | gzip > "$BACKUP_FILE"

# Keep only last 30 days
find "$BACKUP_DIR" -name "apcs_db_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
EOF

chmod +x /usr/local/bin/backup-apcs-db.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-apcs-db.sh") | crontab -
```

### Restore Database

```bash
# Restore from backup
gunzip < /backups/apcs/apcs_db_20260207_020000.sql.gz | psql -U apcs_user apcs_production
```

## Scaling

### Horizontal Scaling

```
                    Load Balancer
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   Backend #1        Backend #2        Backend #3
        │                 │                 │
        └─────────────────┴─────────────────┘
                          │
                   Redis (Shared)
                          │
                   PostgreSQL (Shared)
```

### Redis Clustering

```yaml
# Redis Sentinel for high availability
sentinel:
  image: redis:7-alpine
  command: redis-sentinel /etc/redis/sentinel.conf
  volumes:
    - ./sentinel.conf:/etc/redis/sentinel.conf
```

### Database Read Replicas

```sql
-- Configure PostgreSQL streaming replication
-- On primary server
CREATE USER replicator REPLICATION LOGIN PASSWORD 'strong_password';
```

## Troubleshooting

### Common Issues

**Issue**: Database connection refused
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection
psql -U apcs_user -h localhost -d apcs_production
```

**Issue**: Backend won't start
```bash
# Check logs
pm2 logs apcs-backend --lines 100

# Check environment variables
pm2 env apcs-backend
```

**Issue**: Agents timeout
```bash
# Increase timeout in Nginx
proxy_read_timeout 300;
proxy_connect_timeout 300;
proxy_send_timeout 300;
```

**Issue**: WebSocket connections fail
```bash
# Ensure Nginx has WebSocket support
# Check: proxy_set_header Upgrade $http_upgrade;
# Check: proxy_set_header Connection 'upgrade';
```

## Security Checklist

- [ ] Strong passwords for database users
- [ ] JWT secret at least 64 characters
- [ ] SSL certificates installed and auto-renewing
- [ ] Firewall configured (UFW)
- [ ] Regular security updates: `sudo apt update && sudo apt upgrade`
- [ ] Backup system in place
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Environment variables secured (not in source control)
- [ ] Database connection uses SSL in production
- [ ] Redis password protected (if exposed)
- [ ] File upload size limits set
- [ ] SQL injection prevention (using Prisma/parameterized queries)
- [ ] XSS protection enabled

## Performance Optimization

### Backend

```javascript
// Enable gzip compression
app.use(compression());

// Connection pooling
prisma.$connect();

// Query optimization
const data = await prisma.task.findMany({
  select: { id: true, title: true }, // Only needed fields
  take: 50, // Pagination
});
```

### Frontend

```javascript
// next.config.ts
module.exports = {
  compress: true,
  images: {
    domains: ['your-cdn.com'],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizeCss: true,
  },
};
```

### Database

```sql
-- Create indexes
CREATE INDEX idx_tasks_space_id ON tasks(space_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_backlog_items_space_id ON backlog_items(space_id);

-- Analyze tables
ANALYZE tasks;
ANALYZE backlog_items;
```

---

**A well-deployed system is a reliable system** 🚀
