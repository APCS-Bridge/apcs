--
-- APCS Database Seed Data
-- Password for all users: password123
--

SET search_path = public;

-- ═══════════════════════════════════════════════════════════════
-- USERS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO users (id, email, password_hash, name, role, avatar_url, created_at) VALUES
('clxxx1111111111111111', 'admin@apcs.com', '$2b$10$GqkwxFx7Sij0ZwfWpR45Ce4oyhfe0.RMHtcQ.EI2rLY38K5IT4LT.', 'Super Admin', 'SUPERADMIN', NULL, '2026-02-01 10:00:00'),
('clxxx2222222222222222', 'alice@apcs.com', '$2b$10$GqkwxFx7Sij0ZwfWpR45Ce4oyhfe0.RMHtcQ.EI2rLY38K5IT4LT.', 'Alice Johnson', 'ADMIN', NULL, '2026-02-01 10:15:00'),
('clxxx3333333333333333', 'bob@apcs.com', '$2b$10$GqkwxFx7Sij0ZwfWpR45Ce4oyhfe0.RMHtcQ.EI2rLY38K5IT4LT.', 'Bob Smith', 'USER', NULL, '2026-02-01 10:30:00'),
('clxxx4444444444444444', 'charlie@apcs.com', '$2b$10$GqkwxFx7Sij0ZwfWpR45Ce4oyhfe0.RMHtcQ.EI2rLY38K5IT4LT.', 'Charlie Brown', 'USER', NULL, '2026-02-01 10:45:00'),
('clxxx5555555555555555', 'diana@apcs.com', '$2b$10$GqkwxFx7Sij0ZwfWpR45Ce4oyhfe0.RMHtcQ.EI2rLY38K5IT4LT.', 'Diana Prince', 'USER', NULL, '2026-02-01 11:00:00');

-- ═══════════════════════════════════════════════════════════════
-- WORKSPACES (SPACES)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO spaces (id, name, methodology, owner_id, created_at) VALUES
('clxxx6666666666666666', 'Development Team', 'KANBAN', 'clxxx2222222222222222', '2026-02-02 09:00:00'),
('clxxx7777777777777777', 'Marketing Project', 'SCRUM', 'clxxx2222222222222222', '2026-02-02 09:30:00');

-- ═══════════════════════════════════════════════════════════════
-- SPACE MEMBERS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO space_members (id, space_id, user_id, scrum_role, joined_at) VALUES
('clxxx8888888888888888', 'clxxx6666666666666666', 'clxxx2222222222222222', NULL, '2026-02-02 09:00:00'),
('clxxx9999999999999999', 'clxxx6666666666666666', 'clxxx3333333333333333', NULL, '2026-02-02 09:05:00'),
('clxxxaaaaaaaaaaaaaaaa', 'clxxx6666666666666666', 'clxxx4444444444444444', NULL, '2026-02-02 09:10:00'),
('clxxxbbbbbbbbbbbbbbbb', 'clxxx7777777777777777', 'clxxx2222222222222222', 'PRODUCT_OWNER', '2026-02-02 09:30:00'),
('clxxxcccccccccccccccc', 'clxxx7777777777777777', 'clxxx4444444444444444', 'SCRUM_MASTER', '2026-02-02 09:35:00'),
('clxxxdddddddddddddddd', 'clxxx7777777777777777', 'clxxx5555555555555555', 'DEVELOPER', '2026-02-02 09:40:00');

-- ═══════════════════════════════════════════════════════════════
-- SESSIONS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO sessions (id, user_id, space_id, sprint_id, created_at, updated_at) VALUES
('clxxxeeeeeeeeeeeeeeee', 'clxxx2222222222222222', 'clxxx6666666666666666', NULL, '2026-02-07 08:00:00', '2026-02-07 08:00:00'),
('clxxxffffffffffffff', 'clxxx3333333333333333', 'clxxx6666666666666666', NULL, '2026-02-07 08:15:00', '2026-02-07 08:15:00');

-- ═══════════════════════════════════════════════════════════════
-- KANBAN COLUMNS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO columns (id, space_id, sprint_id, name, wip_limit, position, created_at) VALUES
('clxxxgggggggggggggggg', 'clxxx6666666666666666', NULL, 'To Do', NULL, 0, '2026-02-02 09:00:00'),
('clxxxhhhhhhhhhhhhhhhh', 'clxxx6666666666666666', NULL, 'In Progress', 3, 1, '2026-02-02 09:00:00'),
('clxxxiiiiiiiiiiiiiiii', 'clxxx6666666666666666', NULL, 'Review', 2, 2, '2026-02-02 09:00:00'),
('clxxxjjjjjjjjjjjjjjjj', 'clxxx6666666666666666', NULL, 'Done', NULL, 3, '2026-02-02 09:00:00');

-- ═══════════════════════════════════════════════════════════════
-- BACKLOG ITEMS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO backlog_items (id, space_id, title, description, sequence_number, position, assignee_id, created_by_id, created_at) VALUES
('clxxxkkkkkkkkkkkkkkkk', 'clxxx6666666666666666', 'Implement JWT Authentication', 'Add JWT token-based authentication to secure API endpoints', 1, 0, 'clxxx3333333333333333', 'clxxx2222222222222222', '2026-02-03 10:00:00'),
('clxxxllllllllllllllll', 'clxxx6666666666666666', 'Create Kanban Board UI', 'Build drag-and-drop interface for Kanban board', 2, 1, 'clxxx4444444444444444', 'clxxx2222222222222222', '2026-02-03 10:15:00'),
('clxxxmmmmmmmmmmmmmmmm', 'clxxx6666666666666666', 'Database Query Optimization', 'Add indexes and optimize slow queries', 3, 2, 'clxxx3333333333333333', 'clxxx2222222222222222', '2026-02-03 10:30:00'),
('clxxxnnnnnnnnnnnnnnnn', 'clxxx6666666666666666', 'API Documentation', 'Generate complete OpenAPI documentation', 4, 3, 'clxxx5555555555555555', 'clxxx2222222222222222', '2026-02-03 10:45:00'),
('clxxxoooooooooooooooo', 'clxxx6666666666666666', 'Unit Tests', 'Write unit tests for all endpoints', 5, 4, NULL, 'clxxx2222222222222222', '2026-02-03 11:00:00');

-- ═══════════════════════════════════════════════════════════════
-- TASKS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO tasks (id, backlog_item_id, sprint_backlog_item_id, assignee_id, created_at) VALUES
('clxxxpppppppppppppppp', 'clxxxkkkkkkkkkkkkkkkk', NULL, 'clxxx3333333333333333', '2026-02-03 11:00:00'),
('clxxxqqqqqqqqqqqqqqqq', 'clxxxkkkkkkkkkkkkkkkk', NULL, 'clxxx3333333333333333', '2026-02-03 11:05:00'),
('clxxxrrrrrrrrrrrrrrrr', 'clxxxllllllllllllllll', NULL, 'clxxx4444444444444444', '2026-02-03 11:10:00'),
('clxxxssssssssssssssss', 'clxxxllllllllllllllll', NULL, 'clxxx4444444444444444', '2026-02-03 11:15:00'),
('clxxxtttttttttttttttt', 'clxxxmmmmmmmmmmmmmmmm', NULL, 'clxxx3333333333333333', '2026-02-03 11:20:00'),
('clxxxuuuuuuuuuuuuuuuu', 'clxxxnnnnnnnnnnnnnnnn', NULL, 'clxxx5555555555555555', '2026-02-03 11:25:00');

-- ═══════════════════════════════════════════════════════════════
-- COLUMNS TASKS (Task positions on Kanban)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO columns_tasks (id, column_id, task_id, position, moved_at) VALUES
('clxxxvvvvvvvvvvvvvvvv', 'clxxxgggggggggggggggg', 'clxxxuuuuuuuuuuuuuuuu', 0, '2026-02-03 11:30:00'),
('clxxxwwwwwwwwwwwwwwww', 'clxxxhhhhhhhhhhhhhhhh', 'clxxxpppppppppppppppp', 0, '2026-02-03 11:35:00'),
('clxxxyyyyyyyyyyyyyyyy', 'clxxxhhhhhhhhhhhhhhhh', 'clxxxrrrrrrrrrrrrrrrr', 1, '2026-02-03 11:40:00'),
('clxxxzzzzzzzzzzzzzzzz', 'clxxxhhhhhhhhhhhhhhhh', 'clxxxtttttttttttttttt', 2, '2026-02-03 11:45:00'),
('clxxx00000000000000000', 'clxxxiiiiiiiiiiiiiiii', 'clxxxssssssssssssssss', 0, '2026-02-03 11:50:00'),
('clxxx00000000000000001', 'clxxxiiiiiiiiiiiiiiii', 'clxxxqqqqqqqqqqqqqqqq', 1, '2026-02-03 11:55:00');

-- ═══════════════════════════════════════════════════════════════
-- SPRINTS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO sprints (id, space_id, name, goal, status, start_date, end_date, created_at) VALUES
('clxxx00000000000000002', 'clxxx7777777777777777', 'Sprint 1', 'Complete marketing website redesign', 'ACTIVE', '2026-02-03', '2026-02-17', '2026-02-03 09:00:00');

-- ═══════════════════════════════════════════════════════════════
-- SPRINT BACKLOG ITEMS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO sprint_backlog_items (id, sprint_id, backlog_item_id, story_points, position, added_at) VALUES
('clxxx00000000000000003', 'clxxx00000000000000002', 'clxxxkkkkkkkkkkkkkkkk', 8, 0, '2026-02-03 09:30:00'),
('clxxx00000000000000004', 'clxxx00000000000000002', 'clxxxllllllllllllllll', 13, 1, '2026-02-03 09:35:00');

-- ═══════════════════════════════════════════════════════════════
-- MEETINGS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO meetings (id, space_id, sprint_id, title, description, type, scheduled_at, duration, created_by_id, created_at, updated_at) VALUES
('clxxx00000000000000005', 'clxxx7777777777777777', 'clxxx00000000000000002', 'Sprint Planning', 'Plan tasks for Sprint 1', 'SPRINT_PLANNING', '2026-02-03 09:00:00', 120, 'clxxx4444444444444444', '2026-02-02 16:00:00', '2026-02-02 16:00:00'),
('clxxx00000000000000006', 'clxxx7777777777777777', 'clxxx00000000000000002', 'Daily Standup', 'Daily team sync', 'DAILY_STANDUP', '2026-02-07 09:00:00', 15, 'clxxx4444444444444444', '2026-02-06 17:00:00', '2026-02-06 17:00:00');

-- ═══════════════════════════════════════════════════════════════
-- CHAT ROOMS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO rooms (id, name, is_group, created_at, updated_at) VALUES
('clxxx00000000000000007', NULL, false, '2026-02-04 10:00:00', '2026-02-07 14:30:00'),
('clxxx00000000000000008', 'Dev Team Chat', true, '2026-02-04 10:30:00', '2026-02-07 15:45:00');

-- ═══════════════════════════════════════════════════════════════
-- ROOM MEMBERS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO room_members (id, room_id, user_id, joined_at) VALUES
('clxxx00000000000000009', 'clxxx00000000000000007', 'clxxx2222222222222222', '2026-02-04 10:00:00'),
('clxxx0000000000000000a', 'clxxx00000000000000007', 'clxxx3333333333333333', '2026-02-04 10:00:00'),
('clxxx0000000000000000b', 'clxxx00000000000000008', 'clxxx2222222222222222', '2026-02-04 10:30:00'),
('clxxx0000000000000000c', 'clxxx00000000000000008', 'clxxx3333333333333333', '2026-02-04 10:30:00'),
('clxxx0000000000000000d', 'clxxx00000000000000008', 'clxxx4444444444444444', '2026-02-04 10:30:00');

-- ═══════════════════════════════════════════════════════════════
-- MESSAGES
-- ═══════════════════════════════════════════════════════════════

INSERT INTO messages (id, room_id, sender_id, content, created_at, updated_at) VALUES
('clxxx0000000000000000e', 'clxxx00000000000000007', 'clxxx2222222222222222', 'Hey Bob, can you review the authentication PR?', '2026-02-07 14:30:00', '2026-02-07 14:30:00'),
('clxxx0000000000000000f', 'clxxx00000000000000007', 'clxxx3333333333333333', 'Sure, I''ll take a look this afternoon', '2026-02-07 14:32:00', '2026-02-07 14:32:00'),
('clxxx00000000000000010', 'clxxx00000000000000008', 'clxxx2222222222222222', 'Team, great progress on Sprint 1!', '2026-02-07 15:45:00', '2026-02-07 15:45:00');

-- ═══════════════════════════════════════════════════════════════
-- DOCUMENTS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO documents (id, name, type, file_url, file_name, file_size, mime_type, space_id, parent_id, path, visibility, created_by, description, is_deleted, created_at, updated_at) VALUES
('clxxx00000000000000011', 'Project Docs', 'FOLDER', NULL, NULL, NULL, NULL, 'clxxx6666666666666666', NULL, '/', 'PRIVATE', 'clxxx2222222222222222', 'Main documentation folder', false, '2026-02-05 10:00:00', '2026-02-05 10:00:00'),
('clxxx00000000000000012', 'Architecture.pdf', 'FILE', '/uploads/documents/architecture-v1.pdf', 'architecture-v1.pdf', 2048000, 'application/pdf', 'clxxx6666666666666666', 'clxxx00000000000000011', '/Project Docs/', 'PRIVATE', 'clxxx2222222222222222', 'System architecture document', false, '2026-02-05 10:15:00', '2026-02-05 10:15:00'),
('clxxx00000000000000013', 'API Specs', 'FOLDER', NULL, NULL, NULL, NULL, 'clxxx6666666666666666', 'clxxx00000000000000011', '/Project Docs/', 'PRIVATE', 'clxxx2222222222222222', 'API specifications', false, '2026-02-05 10:30:00', '2026-02-05 10:30:00');

-- ═══════════════════════════════════════════════════════════════
-- DOCUMENT PERMISSIONS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO document_permissions (id, document_id, user_id, role, granted_by, granted_at) VALUES
('clxxx00000000000000014', 'clxxx00000000000000012', 'clxxx3333333333333333', 'EDITOR', 'clxxx2222222222222222', '2026-02-05 10:20:00'),
('clxxx00000000000000015', 'clxxx00000000000000012', 'clxxx4444444444444444', 'VIEWER', 'clxxx2222222222222222', '2026-02-05 10:25:00');

-- ═══════════════════════════════════════════════════════════════
-- DOCUMENT COMMENTS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO document_comments (id, document_id, user_id, content, parent_id, is_resolved, created_at, updated_at) VALUES
('clxxx00000000000000016', 'clxxx00000000000000012', 'clxxx3333333333333333', 'Should we add more details about the microservices architecture?', NULL, false, '2026-02-06 11:00:00', '2026-02-06 11:00:00'),
('clxxx00000000000000017', 'clxxx00000000000000012', 'clxxx2222222222222222', 'Good idea! I''ll update it tomorrow.', 'clxxx00000000000000016', false, '2026-02-06 11:15:00', '2026-02-06 11:15:00');

-- ═══════════════════════════════════════════════════════════════
-- DOCUMENT VERSIONS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO document_versions (id, document_id, version_number, file_url, file_size, uploaded_by, change_note, created_at) VALUES
('clxxx00000000000000018', 'clxxx00000000000000012', 1, '/uploads/documents/architecture-v1.pdf', 2048000, 'clxxx2222222222222222', 'Initial version', '2026-02-05 10:15:00');

-- ═══════════════════════════════════════════════════════════════
-- DOCUMENT ACTIVITIES
-- ═══════════════════════════════════════════════════════════════

INSERT INTO document_activities (id, document_id, user_id, action, metadata, created_at) VALUES
('clxxx00000000000000019', 'clxxx00000000000000012', 'clxxx2222222222222222', 'created', '{"file_size": 2048000}', '2026-02-05 10:15:00'),
('clxxx0000000000000001a', 'clxxx00000000000000012', 'clxxx3333333333333333', 'viewed', '{}', '2026-02-06 09:30:00'),
('clxxx0000000000000001b', 'clxxx00000000000000012', 'clxxx4444444444444444', 'viewed', '{}', '2026-02-06 14:45:00');

-- ═══════════════════════════════════════════════════════════════
-- SUMMARY
-- ═══════════════════════════════════════════════════════════════
-- Sample users: 5 (1 superadmin, 1 admin, 3 users)
-- Workspaces: 2 (1 Kanban, 1 Scrum)
-- Default password for all users: password123
-- 
-- KANBAN Workspace: "Development Team"
--   - 4 columns (To Do, In Progress, Review, Done)
--   - 5 backlog items
--   - 6 tasks distributed across columns
-- 
-- SCRUM Workspace: "Marketing Project"
--   - 1 active sprint
--   - 2 meetings scheduled
--   - Team members with Scrum roles
-- ═══════════════════════════════════════════════════════════════

SELECT 'Seed data inserted successfully!' as status;
