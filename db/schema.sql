--
-- PostgreSQL database schema
-- Database: apcs_db
-- Generated from schema.prisma
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET search_path = public;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Drop existing database objects
--

DROP TABLE IF EXISTS document_activities CASCADE;
DROP TABLE IF EXISTS document_versions CASCADE;
DROP TABLE IF EXISTS document_comments CASCADE;
DROP TABLE IF EXISTS document_permissions CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS room_members CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS notification_tokens CASCADE;
DROP TABLE IF EXISTS meetings CASCADE;
DROP TABLE IF EXISTS columns_tasks CASCADE;
DROP TABLE IF EXISTS columns CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS sprint_backlog_items CASCADE;
DROP TABLE IF EXISTS sprints CASCADE;
DROP TABLE IF EXISTS backlog_items CASCADE;
DROP TABLE IF EXISTS space_members CASCADE;
DROP TABLE IF EXISTS spaces CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS revoked_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;

--
-- Drop existing types
--

DROP TYPE IF EXISTS "UserRole" CASCADE;
DROP TYPE IF EXISTS "Methodology" CASCADE;
DROP TYPE IF EXISTS "ScrumRole" CASCADE;
DROP TYPE IF EXISTS "SprintStatus" CASCADE;
DROP TYPE IF EXISTS "InvitationStatus" CASCADE;
DROP TYPE IF EXISTS "MeetingType" CASCADE;
DROP TYPE IF EXISTS "DocumentType" CASCADE;
DROP TYPE IF EXISTS "DocumentRole" CASCADE;
DROP TYPE IF EXISTS "DocumentVisibility" CASCADE;

-- ═══════════════════════════════════════════════════════════════
-- ENUMS
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPERADMIN');
CREATE TYPE "Methodology" AS ENUM ('KANBAN', 'SCRUM');
CREATE TYPE "ScrumRole" AS ENUM ('PRODUCT_OWNER', 'SCRUM_MASTER', 'DEVELOPER');
CREATE TYPE "SprintStatus" AS ENUM ('PLANNING', 'ACTIVE', 'COMPLETED');
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DENIED');
CREATE TYPE "MeetingType" AS ENUM ('DAILY_STANDUP', 'SPRINT_PLANNING', 'SPRINT_REVIEW', 'SPRINT_RETROSPECTIVE', 'BACKLOG_REFINEMENT', 'CUSTOM');
CREATE TYPE "DocumentType" AS ENUM ('FOLDER', 'FILE');
CREATE TYPE "DocumentRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');
CREATE TYPE "DocumentVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- ═══════════════════════════════════════════════════════════════
-- TABLE STRUCTURES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE users (
    id TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role "UserRole" DEFAULT 'USER'::"UserRole" NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email)
);
CREATE INDEX users_email_idx ON users USING btree (email);

CREATE TABLE sessions (
    id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    space_id TEXT,
    sprint_id TEXT,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP(3) NOT NULL,
    CONSTRAINT sessions_pkey PRIMARY KEY (id),
    CONSTRAINT sessions_user_id_key UNIQUE (user_id)
);
CREATE INDEX sessions_user_id_idx ON sessions USING btree (user_id);
CREATE INDEX sessions_space_id_idx ON sessions USING btree (space_id);
CREATE INDEX sessions_sprint_id_idx ON sessions USING btree (sprint_id);

CREATE TABLE revoked_tokens (
    id TEXT NOT NULL,
    token TEXT NOT NULL,
    user_id TEXT NOT NULL,
    revoked_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMP(3) NOT NULL,
    CONSTRAINT revoked_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT revoked_tokens_token_key UNIQUE (token)
);
CREATE INDEX revoked_tokens_token_idx ON revoked_tokens USING btree (token);
CREATE INDEX revoked_tokens_user_id_idx ON revoked_tokens USING btree (user_id);

CREATE TABLE invitations (
    id TEXT NOT NULL,
    email TEXT NOT NULL,
    role "UserRole" DEFAULT 'USER'::"UserRole" NOT NULL,
    status "InvitationStatus" DEFAULT 'PENDING'::"InvitationStatus" NOT NULL,
    sender_id TEXT NOT NULL,
    receiver_id TEXT,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    responded_at TIMESTAMP(3),
    CONSTRAINT invitations_pkey PRIMARY KEY (id)
);
CREATE INDEX invitations_sender_id_idx ON invitations USING btree (sender_id);
CREATE INDEX invitations_receiver_id_idx ON invitations USING btree (receiver_id);
CREATE INDEX invitations_email_idx ON invitations USING btree (email);

CREATE TABLE spaces (
    id TEXT NOT NULL,
    name TEXT NOT NULL,
    methodology "Methodology" DEFAULT 'KANBAN'::"Methodology" NOT NULL,
    owner_id TEXT NOT NULL,
    git_repo_url TEXT,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT spaces_pkey PRIMARY KEY (id)
);
CREATE INDEX spaces_owner_id_idx ON spaces USING btree (owner_id);

CREATE TABLE space_members (
    id TEXT NOT NULL,
    space_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    scrum_role "ScrumRole",
    joined_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT space_members_pkey PRIMARY KEY (id),
    CONSTRAINT space_members_space_id_user_id_key UNIQUE (space_id, user_id)
);
CREATE INDEX space_members_space_id_idx ON space_members USING btree (space_id);
CREATE INDEX space_members_user_id_idx ON space_members USING btree (user_id);

CREATE TABLE backlog_items (
    id TEXT NOT NULL,
    space_id TEXT NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    sequence_number SERIAL NOT NULL,
    position INTEGER DEFAULT 0 NOT NULL,
    assignee_id TEXT,
    created_by_id TEXT NOT NULL,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT backlog_items_pkey PRIMARY KEY (id)
);
CREATE INDEX backlog_items_space_id_idx ON backlog_items USING btree (space_id);
CREATE INDEX backlog_items_assignee_id_idx ON backlog_items USING btree (assignee_id);
CREATE INDEX backlog_items_created_by_id_idx ON backlog_items USING btree (created_by_id);

CREATE TABLE sprints (
    id TEXT NOT NULL,
    space_id TEXT NOT NULL,
    name TEXT NOT NULL,
    goal TEXT,
    status "SprintStatus" DEFAULT 'PLANNING'::"SprintStatus" NOT NULL,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT sprints_pkey PRIMARY KEY (id)
);
CREATE INDEX sprints_space_id_idx ON sprints USING btree (space_id);

CREATE TABLE sprint_backlog_items (
    id TEXT NOT NULL,
    sprint_id TEXT NOT NULL,
    backlog_item_id TEXT NOT NULL,
    story_points INTEGER,
    position INTEGER DEFAULT 0 NOT NULL,
    added_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT sprint_backlog_items_pkey PRIMARY KEY (id),
    CONSTRAINT sprint_backlog_items_sprint_id_backlog_item_id_key UNIQUE (sprint_id, backlog_item_id)
);
CREATE INDEX sprint_backlog_items_sprint_id_idx ON sprint_backlog_items USING btree (sprint_id);
CREATE INDEX sprint_backlog_items_backlog_item_id_idx ON sprint_backlog_items USING btree (backlog_item_id);

CREATE TABLE tasks (
    id TEXT NOT NULL,
    backlog_item_id TEXT,
    sprint_backlog_item_id TEXT,
    assignee_id TEXT,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT tasks_pkey PRIMARY KEY (id)
);
CREATE INDEX tasks_backlog_item_id_idx ON tasks USING btree (backlog_item_id);
CREATE INDEX tasks_sprint_backlog_item_id_idx ON tasks USING btree (sprint_backlog_item_id);
CREATE INDEX tasks_assignee_id_idx ON tasks USING btree (assignee_id);

CREATE TABLE columns (
    id TEXT NOT NULL,
    space_id TEXT,
    sprint_id TEXT,
    name VARCHAR(100) NOT NULL,
    wip_limit INTEGER,
    position INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT columns_pkey PRIMARY KEY (id)
);
CREATE INDEX columns_space_id_idx ON columns USING btree (space_id);
CREATE INDEX columns_sprint_id_idx ON columns USING btree (sprint_id);

CREATE TABLE columns_tasks (
    id TEXT NOT NULL,
    column_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    position INTEGER DEFAULT 0 NOT NULL,
    moved_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT columns_tasks_pkey PRIMARY KEY (id),
    CONSTRAINT columns_tasks_task_id_key UNIQUE (task_id)
);
CREATE INDEX columns_tasks_column_id_idx ON columns_tasks USING btree (column_id);
CREATE INDEX columns_tasks_task_id_idx ON columns_tasks USING btree (task_id);

CREATE TABLE meetings (
    id TEXT NOT NULL,
    space_id TEXT NOT NULL,
    sprint_id TEXT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type "MeetingType" DEFAULT 'CUSTOM'::"MeetingType" NOT NULL,
    scheduled_at TIMESTAMP(3) NOT NULL,
    duration INTEGER DEFAULT 30 NOT NULL,
    created_by_id TEXT NOT NULL,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP(3) NOT NULL,
    CONSTRAINT meetings_pkey PRIMARY KEY (id)
);
CREATE INDEX meetings_space_id_idx ON meetings USING btree (space_id);
CREATE INDEX meetings_sprint_id_idx ON meetings USING btree (sprint_id);
CREATE INDEX meetings_created_by_id_idx ON meetings USING btree (created_by_id);
CREATE INDEX meetings_scheduled_at_idx ON meetings USING btree (scheduled_at);

CREATE TABLE notification_tokens (
    id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    fcm_token TEXT NOT NULL,
    platform VARCHAR(50),
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT notification_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT notification_tokens_fcm_token_key UNIQUE (fcm_token),
    CONSTRAINT notification_tokens_user_id_fcm_token_key UNIQUE (user_id, fcm_token)
);
CREATE INDEX notification_tokens_user_id_idx ON notification_tokens USING btree (user_id);

CREATE TABLE rooms (
    id TEXT NOT NULL,
    name VARCHAR(255),
    is_group BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP(3) NOT NULL,
    CONSTRAINT rooms_pkey PRIMARY KEY (id)
);
CREATE INDEX rooms_is_group_idx ON rooms USING btree (is_group);

CREATE TABLE room_members (
    id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    joined_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT room_members_pkey PRIMARY KEY (id),
    CONSTRAINT room_members_room_id_user_id_key UNIQUE (room_id, user_id)
);
CREATE INDEX room_members_user_id_idx ON room_members USING btree (user_id);
CREATE INDEX room_members_room_id_idx ON room_members USING btree (room_id);

CREATE TABLE messages (
    id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP(3) NOT NULL,
    CONSTRAINT messages_pkey PRIMARY KEY (id)
);
CREATE INDEX messages_room_id_idx ON messages USING btree (room_id);
CREATE INDEX messages_sender_id_idx ON messages USING btree (sender_id);
CREATE INDEX messages_created_at_idx ON messages USING btree (created_at);

CREATE TABLE documents (
    id TEXT NOT NULL,
    name TEXT NOT NULL,
    type "DocumentType" NOT NULL,
    file_url TEXT,
    file_name TEXT,
    file_size INTEGER,
    mime_type TEXT,
    space_id TEXT NOT NULL,
    parent_id TEXT,
    path TEXT NOT NULL,
    visibility "DocumentVisibility" DEFAULT 'PRIVATE'::"DocumentVisibility" NOT NULL,
    created_by TEXT NOT NULL,
    description TEXT,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP(3) NOT NULL,
    CONSTRAINT documents_pkey PRIMARY KEY (id)
);
CREATE INDEX documents_space_id_idx ON documents USING btree (space_id);
CREATE INDEX documents_parent_id_idx ON documents USING btree (parent_id);
CREATE INDEX documents_created_by_idx ON documents USING btree (created_by);
CREATE INDEX documents_path_idx ON documents USING btree (path);
CREATE INDEX documents_type_idx ON documents USING btree (type);

CREATE TABLE document_permissions (
    id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role "DocumentRole" NOT NULL,
    granted_by TEXT NOT NULL,
    granted_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT document_permissions_pkey PRIMARY KEY (id),
    CONSTRAINT document_permissions_document_id_user_id_key UNIQUE (document_id, user_id)
);
CREATE INDEX document_permissions_user_id_idx ON document_permissions USING btree (user_id);
CREATE INDEX document_permissions_document_id_idx ON document_permissions USING btree (document_id);

CREATE TABLE document_comments (
    id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    parent_id TEXT,
    is_resolved BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP(3) NOT NULL,
    CONSTRAINT document_comments_pkey PRIMARY KEY (id)
);
CREATE INDEX document_comments_document_id_idx ON document_comments USING btree (document_id);
CREATE INDEX document_comments_user_id_idx ON document_comments USING btree (user_id);
CREATE INDEX document_comments_parent_id_idx ON document_comments USING btree (parent_id);

CREATE TABLE document_versions (
    id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    uploaded_by TEXT NOT NULL,
    change_note TEXT,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT document_versions_pkey PRIMARY KEY (id),
    CONSTRAINT document_versions_document_id_version_number_key UNIQUE (document_id, version_number)
);
CREATE INDEX document_versions_document_id_idx ON document_versions USING btree (document_id);

CREATE TABLE document_activities (
    id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT document_activities_pkey PRIMARY KEY (id)
);
CREATE INDEX document_activities_document_id_idx ON document_activities USING btree (document_id);
CREATE INDEX document_activities_user_id_idx ON document_activities USING btree (user_id);
CREATE INDEX document_activities_created_at_idx ON document_activities USING btree (created_at);

-- ═══════════════════════════════════════════════════════════════
-- FOREIGN KEY CONSTRAINTS
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE sessions ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE sessions ADD CONSTRAINT sessions_space_id_fkey FOREIGN KEY (space_id) REFERENCES spaces(id);
ALTER TABLE sessions ADD CONSTRAINT sessions_sprint_id_fkey FOREIGN KEY (sprint_id) REFERENCES sprints(id);

ALTER TABLE revoked_tokens ADD CONSTRAINT revoked_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE invitations ADD CONSTRAINT invitations_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE invitations ADD CONSTRAINT invitations_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE spaces ADD CONSTRAINT spaces_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES users(id);

ALTER TABLE space_members ADD CONSTRAINT space_members_space_id_fkey FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE;
ALTER TABLE space_members ADD CONSTRAINT space_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE backlog_items ADD CONSTRAINT backlog_items_space_id_fkey FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE;
ALTER TABLE backlog_items ADD CONSTRAINT backlog_items_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES users(id);
ALTER TABLE backlog_items ADD CONSTRAINT backlog_items_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES users(id);

ALTER TABLE sprints ADD CONSTRAINT sprints_space_id_fkey FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE;

ALTER TABLE sprint_backlog_items ADD CONSTRAINT sprint_backlog_items_sprint_id_fkey FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE CASCADE;
ALTER TABLE sprint_backlog_items ADD CONSTRAINT sprint_backlog_items_backlog_item_id_fkey FOREIGN KEY (backlog_item_id) REFERENCES backlog_items(id) ON DELETE CASCADE;

ALTER TABLE tasks ADD CONSTRAINT tasks_backlog_item_id_fkey FOREIGN KEY (backlog_item_id) REFERENCES backlog_items(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD CONSTRAINT tasks_sprint_backlog_item_id_fkey FOREIGN KEY (sprint_backlog_item_id) REFERENCES sprint_backlog_items(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES users(id);

ALTER TABLE columns ADD CONSTRAINT columns_space_id_fkey FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE;
ALTER TABLE columns ADD CONSTRAINT columns_sprint_id_fkey FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE CASCADE;

ALTER TABLE columns_tasks ADD CONSTRAINT columns_tasks_column_id_fkey FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE;
ALTER TABLE columns_tasks ADD CONSTRAINT columns_tasks_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE meetings ADD CONSTRAINT meetings_space_id_fkey FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE;
ALTER TABLE meetings ADD CONSTRAINT meetings_sprint_id_fkey FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE CASCADE;
ALTER TABLE meetings ADD CONSTRAINT meetings_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES users(id);

ALTER TABLE notification_tokens ADD CONSTRAINT notification_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE room_members ADD CONSTRAINT room_members_room_id_fkey FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;
ALTER TABLE room_members ADD CONSTRAINT room_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE messages ADD CONSTRAINT messages_room_id_fkey FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;
ALTER TABLE messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE documents ADD CONSTRAINT documents_space_id_fkey FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE;
ALTER TABLE documents ADD CONSTRAINT documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE documents ADD CONSTRAINT documents_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES documents(id) ON DELETE CASCADE;

ALTER TABLE document_permissions ADD CONSTRAINT document_permissions_document_id_fkey FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE document_permissions ADD CONSTRAINT document_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE document_permissions ADD CONSTRAINT document_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES users(id);

ALTER TABLE document_comments ADD CONSTRAINT document_comments_document_id_fkey FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE document_comments ADD CONSTRAINT document_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE document_comments ADD CONSTRAINT document_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES document_comments(id);

ALTER TABLE document_versions ADD CONSTRAINT document_versions_document_id_fkey FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE document_versions ADD CONSTRAINT document_versions_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES users(id);

ALTER TABLE document_activities ADD CONSTRAINT document_activities_document_id_fkey FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE document_activities ADD CONSTRAINT document_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

SELECT 'Schema created successfully!' as status;
