-- ═══════════════════════════════════════════════════════════════
-- 🗄️ SCHEMA SQL - PLATEFORME COLLABORATION KANBAN/SCRUM + IA
-- ═══════════════════════════════════════════════════════════════
-- Base de données: collaboration_platform
-- PostgreSQL 16+ | Structure simplifiée et progressive
-- ═══════════════════════════════════════════════════════════════

-- ─── Extensions ──────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Enums (Types simples et essentiels) ─────────────────────────

-- Rôles des utilisateurs
CREATE TYPE user_role_type AS ENUM ('USER', 'ADMIN', 'SUPERADMIN');

-- Méthodologie du workspace
CREATE TYPE methodology_type AS ENUM ('KANBAN', 'SCRUM');

-- Rôles Scrum (uniquement si méthodologie = SCRUM)
CREATE TYPE scrum_role_type AS ENUM ('PRODUCT_OWNER', 'SCRUM_MASTER', 'DEVELOPER');

-- Statut d'une tâche dans le kanban
CREATE TYPE task_status_type AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- Statut d'un sprint
CREATE TYPE sprint_status_type AS ENUM ('PLANNING', 'ACTIVE', 'COMPLETED');

-- Statut d'une invitation
CREATE TYPE invitation_status_type AS ENUM ('PENDING', 'ACCEPTED', 'DENIED');

-- Type de meeting
CREATE TYPE meeting_type AS ENUM ('DAILY_STANDUP', 'SPRINT_PLANNING', 'SPRINT_REVIEW', 'SPRINT_RETROSPECTIVE', 'BACKLOG_REFINEMENT', 'CUSTOM');

-- ═══════════════════════════════════════════════════════════════
-- 🧑 ÉTAPE 1: UTILISATEURS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE users (
    id VARCHAR(30) PRIMARY KEY DEFAULT ('user_' || encode(gen_random_bytes(10), 'hex')),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role_type DEFAULT 'USER' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════
-- 🔐 ÉTAPE 1b: REVOKED TOKENS (pour logout)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE revoked_tokens (
    id VARCHAR(30) PRIMARY KEY DEFAULT ('rt_' || encode(gen_random_bytes(10), 'hex')),
    token VARCHAR(500) UNIQUE NOT NULL,
    user_id VARCHAR(30) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- ═══════════════════════════════════════════════════════════════
-- 📱 ÉTAPE 1c: NOTIFICATION TOKENS (pour Firebase)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE notification_tokens (
    id VARCHAR(30) PRIMARY KEY DEFAULT ('nt_' || encode(gen_random_bytes(10), 'hex')),
    user_id VARCHAR(30) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    device_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, token)
);

-- ═══════════════════════════════════════════════════════════════
-- 🏢 ÉTAPE 2: WORKSPACES (SPACES)
-- ═══════════════════════════════════════════════════════════════

-- ─── Spaces (Workspaces isolés) ──────────────────────────────────

CREATE TABLE spaces (
    id VARCHAR(30) PRIMARY KEY DEFAULT ('space_' || encode(gen_random_bytes(10), 'hex')),
    name VARCHAR(255) NOT NULL,
    methodology methodology_type DEFAULT 'KANBAN',  -- KANBAN ou SCRUM
    owner_id VARCHAR(30) NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════
-- 👥 ÉTAPE 3: MEMBRES DES WORKSPACES
-- ═══════════════════════════════════════════════════════════════
-- Règles:
--   - Si methodology = SCRUM → 1 membre avec scrum_role = 'PRODUCT_OWNER'
--                           → 1 membre avec scrum_role = 'SCRUM_MASTER'  
--                           → autres avec scrum_role = 'DEVELOPER'
--   - Si methodology = KANBAN → scrum_role = NULL pour tous
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE space_members (
    id VARCHAR(30) PRIMARY KEY DEFAULT ('member_' || encode(gen_random_bytes(10), 'hex')),
    space_id VARCHAR(30) NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id VARCHAR(30) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scrum_role scrum_role_type,  -- NULL si KANBAN, sinon PRODUCT_OWNER/SCRUM_MASTER/DEVELOPER
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(space_id, user_id)
);

-- ═══════════════════════════════════════════════════════════════
-- 📧 ÉTAPE 3b: INVITATIONS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE invitations (
    id VARCHAR(30) PRIMARY KEY DEFAULT ('inv_' || encode(gen_random_bytes(10), 'hex')),
    space_id VARCHAR(30) NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    sender_id VARCHAR(30) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id VARCHAR(30) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status invitation_status_type DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP
);
-- ═══════════════════════════════════════════════════════════════
-- Product Backlog = Liste de toutes les user stories/tâches du projet
-- Comme dans Jira, chaque item peut être assigné à un sprint ou rester dans le backlog
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE backlog_items (
    id VARCHAR(30) PRIMARY KEY DEFAULT ('item_' || encode(gen_random_bytes(10), 'hex')),
    space_id VARCHAR(30) NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    sequence_number SERIAL,  -- Numéro de référence unique (#1, #2, #3...) comme JIRA
    position INTEGER DEFAULT 0,  -- Ordre de priorité dans le Product Backlog (modifiable)
    assignee_id VARCHAR(30) REFERENCES users(id),  -- Assigné à (optionnel)
    created_by_id VARCHAR(30) NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════
-- 🏃 ÉTAPE 5: SPRINTS (uniquement pour SCRUM)
-- ═══════════════════════════════════════════════════════════════
-- Un sprint = une itération de travail avec des tâches assignées
-- Chaque sprint a son propre kanban
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE sprints (
    id VARCHAR(30) PRIMARY KEY DEFAULT ('sprint_' || encode(gen_random_bytes(10), 'hex')),
    space_id VARCHAR(30) NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    goal TEXT,  -- Objectif du sprint
    status sprint_status_type DEFAULT 'PLANNING',
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════
-- 📅 ÉTAPE 5b: MEETINGS (Daily, Planning, Review, Retro)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE meetings (
    id VARCHAR(30) PRIMARY KEY DEFAULT ('meet_' || encode(gen_random_bytes(10), 'hex')),
    space_id VARCHAR(30) NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    sprint_id VARCHAR(30) REFERENCES sprints(id) ON DELETE CASCADE,
    type meeting_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMP NOT NULL,
    duration_minutes INTEGER,
    created_by_id VARCHAR(30) NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════
-- � ÉTAPE 5b: SPRINT BACKLOG (SCRUM uniquement)
-- ═══════════════════════════════════════════════════════════════
-- Sprint Backlog = Items du Product Backlog sélectionnés pour un sprint
-- C'est ici qu'on met les story points (estimation finale pour le sprint)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE sprint_backlog_items (
    id VARCHAR(30) PRIMARY KEY DEFAULT ('sbi_' || encode(gen_random_bytes(10), 'hex')),
    sprint_id VARCHAR(30) NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    backlog_item_id VARCHAR(30) NOT NULL REFERENCES backlog_items(id) ON DELETE CASCADE,
    story_points INTEGER,  -- Estimation pour ce sprint
    position INTEGER DEFAULT 0,  -- Ordre dans le sprint backlog
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sprint_id, backlog_item_id)  -- Un item ne peut être qu'une fois dans un sprint
);

CREATE INDEX idx_sprint_backlog_sprint ON sprint_backlog_items(sprint_id);
CREATE INDEX idx_sprint_backlog_item ON sprint_backlog_items(backlog_item_id);

-- ═══════════════════════════════════════════════════════════════
-- �📊 ÉTAPE 6: TÂCHES KANBAN
-- ═══════════════════════════════════════════════════════════════
-- Une tâche = décomposition technique d'un item
-- 
-- Logique:
--   - Si SCRUM: tâche liée à un sprint_backlog_item (sprint_backlog_item_id NOT NULL)
--               → Affichée dans le kanban du sprint
--   - Si KANBAN: tâche liée directement au backlog_item (backlog_item_id NOT NULL)
--               → Affichée dans le kanban général du workspace
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE tasks (
    id VARCHAR(30) PRIMARY KEY DEFAULT ('task_' || encode(gen_random_bytes(10), 'hex')),
    backlog_item_id VARCHAR(30) REFERENCES backlog_items(id) ON DELETE CASCADE,  -- Pour KANBAN
    sprint_backlog_item_id VARCHAR(30) REFERENCES sprint_backlog_items(id) ON DELETE CASCADE,  -- Pour SCRUM
    assignee_id VARCHAR(30) REFERENCES users(id),  -- Assigné à (optionnel)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_task_source CHECK (
        (backlog_item_id IS NOT NULL AND sprint_backlog_item_id IS NULL) OR
        (backlog_item_id IS NULL AND sprint_backlog_item_id IS NOT NULL)
    )
);

-- ═══════════════════════════════════════════════════════════════
-- 📋 ÉTAPE 7: COLONNES KANBAN
-- ═══════════════════════════════════════════════════════════════
-- Colonnes du kanban (TODO, IN_PROGRESS, DONE, ou personnalisées)
-- WIP = Work In Progress Limit (optionnel)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE columns (
    id VARCHAR(30) PRIMARY KEY DEFAULT ('col_' || encode(gen_random_bytes(10), 'hex')),
    space_id VARCHAR(30) REFERENCES spaces(id) ON DELETE CASCADE,  -- NULL pour colonnes de sprint
    sprint_id VARCHAR(30) REFERENCES sprints(id) ON DELETE CASCADE,  -- NULL pour colonnes de space
    name VARCHAR(100) NOT NULL,  -- Nom de la colonne (ex: "À faire", "En cours", "Terminé")
    wip_limit INTEGER,  -- Limite WIP (Work In Progress), NULL = illimité
    position INTEGER DEFAULT 0,  -- Ordre d'affichage des colonnes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_column_owner CHECK (
        (space_id IS NOT NULL AND sprint_id IS NULL) OR 
        (space_id IS NULL AND sprint_id IS NOT NULL)
    )
);

-- ═══════════════════════════════════════════════════════════════
-- 🔗 ÉTAPE 8: RELATION COLONNES ↔ TÂCHES
-- ═══════════════════════════════════════════════════════════════
-- Table de jonction pour gérer le déplacement des tâches entre colonnes
-- Une tâche est dans UNE seule colonne à la fois
-- position = ordre dans la colonne (pour drag & drop)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE columns_tasks (
    id VARCHAR(30) PRIMARY KEY DEFAULT ('ct_' || encode(gen_random_bytes(10), 'hex')),
    column_id VARCHAR(30) NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
    task_id VARCHAR(30) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,  -- Position dans la colonne (drag & drop)
    moved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id)  -- Une tâche ne peut être que dans UNE colonne à la fois
);

CREATE INDEX idx_columns_tasks_column ON columns_tasks(column_id);
CREATE INDEX idx_columns_tasks_task ON columns_tasks(task_id);

-- ═══════════════════════════════════════════════════════════════
-- � SESSIONS UTILISATEURS
-- ═══════════════════════════════════════════════════════════════
-- Stocke le contexte de l'utilisateur (workspace et sprint actifs)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE sessions (
    id VARCHAR(30) PRIMARY KEY DEFAULT ('session_' || encode(gen_random_bytes(10), 'hex')),
    user_id VARCHAR(30) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    space_id VARCHAR(30) REFERENCES spaces(id) ON DELETE SET NULL,
    sprint_id VARCHAR(30) REFERENCES sprints(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_space ON sessions(space_id);
CREATE INDEX idx_sessions_sprint ON sessions(sprint_id);

-- ═══════════════════════════════════════════════════════════════
-- �📝 RÉSUMÉ DE LA STRUCTURE
-- ═══════════════════════════════════════════════════════════════
--
-- 📌 SCRUM (méthodologie = 'SCRUM'):
--    1. Créer workspace SCRUM
--    2. Ajouter membres avec rôles: 1 PRODUCT_OWNER, 1 SCRUM_MASTER, N DEVELOPER
--    3. Créer items dans backlog_items (Product Backlog global)
--    4. Créer un sprint
--    5. Sélectionner items du Product Backlog pour le sprint → sprint_backlog_items (avec story_points)
--    6. Créer colonnes pour le sprint (TODO, IN_PROGRESS, DONE avec WIP optionnel)
--    7. Créer des tasks liées aux sprint_backlog_items
--    8. Placer les tasks dans les colonnes via columns_tasks
--    → Chaque sprint a son propre backlog + kanban avec colonnes personnalisables
--
-- 📌 KANBAN (méthodologie = 'KANBAN'):
--    1. Créer workspace KANBAN
--    2. Ajouter membres (tous au même niveau, scrum_role = NULL)
--    3. Créer colonnes pour le workspace (ex: TODO, IN_PROGRESS, DONE avec WIP)
--    4. Créer items dans backlog_items
--    5. Créer des tasks liées directement aux backlog_items (sans sprint)
--    6. Placer les tasks dans les colonnes via columns_tasks
--    → Un seul kanban général avec colonnes personnalisables et limites WIP
--
-- ═══════════════════════════════════════════════════════════════