-- 001_seed_roles.sql
-- Default set of hierarchy roles. Must run before any other seed file.

INSERT INTO roles (name, hierarchy_level, description) VALUES
    ('super_admin', 0, 'Unrestricted platform access; creates Level 1 accounts and owns configuration, reporting, and security.'),
    ('level_1',     1, 'Creates Level 2 accounts; transfers points downward; monitors assigned Level 2 users.'),
    ('level_2',     2, 'Creates Level 3 accounts; transfers points downward; manages assigned Level 3 users.'),
    ('level_3',     3, 'Creates Player accounts; allocates points; monitors player activity.'),
    ('player',      4, 'Logs in, views wallet, accesses games, and views gameplay history.')
ON CONFLICT (name) DO NOTHING;
