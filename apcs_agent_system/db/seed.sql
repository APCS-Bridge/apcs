-- ═══════════════════════════════════════════════════════════════
-- 🌱 SEED DATA - Données de test pour KANBAN
-- ═══════════════════════════════════════════════════════════════
-- Usage: psql -h localhost -U microhack -d collaboration_platform -f db/seed.sql
-- ═══════════════════════════════════════════════════════════════

-- Nettoyer les données existantes
TRUNCATE TABLE columns_tasks, tasks, columns, sprint_backlog_items, sprints, backlog_items, space_members, sessions, spaces, users RESTART IDENTITY CASCADE;

-- ─── Utilisateurs ────────────────────────────────────────────────
INSERT INTO users (id, email, password_hash, name, role) VALUES
('user_alice', 'alice@example.com', '$2b$12$dummy_hash_alice', 'Alice Dupont', 'ADMIN'),
('user_bob', 'bob@example.com', '$2b$12$dummy_hash_bob', 'Bob Martin', 'USER'),
('user_charlie', 'charlie@example.com', '$2b$12$dummy_hash_charlie', 'Charlie Leroux', 'USER'),
('user_diana', 'diana@example.com', '$2b$12$dummy_hash_diana', 'Diana Bernard', 'USER');

-- ─── Workspace KANBAN ────────────────────────────────────────────
INSERT INTO spaces (id, name, methodology, owner_id) VALUES
('space_dev', 'Équipe Développement', 'KANBAN', 'user_alice');

-- ─── Membres du workspace ────────────────────────────────────────
INSERT INTO space_members (space_id, user_id, scrum_role) VALUES
('space_dev', 'user_alice', NULL),
('space_dev', 'user_bob', NULL),
('space_dev', 'user_charlie', NULL),
('space_dev', 'user_diana', NULL);

-- ─── Sessions (contexte utilisateur) ─────────────────────────────
-- Alice est connectée et travaille dans space_dev
INSERT INTO sessions (id, user_id, space_id, sprint_id) VALUES
('session_alice', 'user_alice', 'space_dev', NULL),
('session_bob', 'user_bob', 'space_dev', NULL),
('session_charlie', 'user_charlie', 'space_dev', NULL);

-- ─── Colonnes Kanban ─────────────────────────────────────────────
INSERT INTO columns (id, space_id, name, wip_limit, position) VALUES
('col_todo', 'space_dev', 'À faire', NULL, 0),
('col_inprogress', 'space_dev', 'En cours', 3, 1),
('col_review', 'space_dev', 'En revue', 2, 2),
('col_done', 'space_dev', 'Terminé', NULL, 3);

-- ─── Product Backlog ─────────────────────────────────────────────
INSERT INTO backlog_items (id, space_id, title, description, assignee_id, created_by_id, position) VALUES
('item_1', 'space_dev', 'Implémenter authentification JWT', 'Ajouter JWT pour sécuriser les endpoints API', 'user_bob', 'user_alice', 0),
('item_2', 'space_dev', 'Créer interface utilisateur Kanban', 'Interface drag & drop pour le board kanban', 'user_charlie', 'user_alice', 1),
('item_3', 'space_dev', 'Optimiser requêtes base de données', 'Ajouter indexes et optimiser les queries lentes', 'user_bob', 'user_alice', 2),
('item_4', 'space_dev', 'Documentation API REST', 'Générer documentation OpenAPI complète', 'user_diana', 'user_alice', 3),
('item_5', 'space_dev', 'Tests unitaires backend', 'Écrire tests pour tous les endpoints', NULL, 'user_alice', 4),
('item_6', 'space_dev', 'Mise en place CI/CD', 'GitHub Actions pour tests et déploiement', NULL, 'user_alice', 5);

-- ─── Tasks ───────────────────────────────────────────────────────
-- Tasks pour item_1 (Authentification JWT)
INSERT INTO tasks (id, backlog_item_id, assignee_id) VALUES
('task_1_1', 'item_1', 'user_bob'),
('task_1_2', 'item_1', 'user_bob');

-- Tasks pour item_2 (Interface Kanban)
INSERT INTO tasks (id, backlog_item_id, assignee_id) VALUES
('task_2_1', 'item_2', 'user_charlie'),
('task_2_2', 'item_2', 'user_charlie');

-- Tasks pour item_3 (Optimisation DB)
INSERT INTO tasks (id, backlog_item_id, assignee_id) VALUES
('task_3_1', 'item_3', 'user_bob');

-- Tasks pour item_4 (Documentation)
INSERT INTO tasks (id, backlog_item_id, assignee_id) VALUES
('task_4_1', 'item_4', 'user_diana');

-- ─── Placement des tasks dans les colonnes ──────────────────────
-- Colonne "À faire"
INSERT INTO columns_tasks (column_id, task_id, position) VALUES
('col_todo', 'task_4_1', 0);

-- Colonne "En cours" (WIP limit: 3)
INSERT INTO columns_tasks (column_id, task_id, position) VALUES
('col_inprogress', 'task_1_1', 0),
('col_inprogress', 'task_2_1', 1),
('col_inprogress', 'task_3_1', 2);

-- Colonne "En revue" (WIP limit: 2)
INSERT INTO columns_tasks (column_id, task_id, position) VALUES
('col_review', 'task_2_2', 0),
('col_review', 'task_1_2', 1);

-- ═══════════════════════════════════════════════════════════════
-- 📊 RÉSUMÉ DES DONNÉES
-- ═══════════════════════════════════════════════════════════════
-- 4 utilisateurs: Alice (admin), Bob, Charlie, Diana
-- 3 sessions actives: Alice, Bob, Charlie (connectés sur space_dev)
-- 1 workspace KANBAN: "Équipe Développement"
-- 4 colonnes: À faire (0), En cours (3/3), En revue (2/2), Terminé (0)
-- 6 items dans le Product Backlog
-- 6 tasks créées et distribuées dans les colonnes
-- ═══════════════════════════════════════════════════════════════

SELECT 'Seed data inserted successfully!' as status;
