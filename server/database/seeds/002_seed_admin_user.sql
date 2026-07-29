-- 002_seed_admin_user.sql
-- Bootstraps the single initial Super Admin account so the hierarchy
-- has a root to create Level 1 accounts from.
--
-- password_hash is a PLACEHOLDER, not a real hash — no hashing logic
-- is implemented in this milestone (see CLAUDE.md: "Never hash
-- passwords" is out of scope here). This value must be replaced with
-- a real bcrypt hash by the authentication milestone before this
-- account is usable, and rotated immediately in any real deployment
-- (see docs/09_DEPLOYMENT.md production checklist).

INSERT INTO users (role_id, created_by, username, email, password_hash, status)
SELECT
    r.id,
    NULL,
    'super_admin',
    'super_admin@example.com',
    'REPLACE_WITH_BCRYPT_HASH',
    'active'
FROM roles r
WHERE r.name = 'super_admin'
ON CONFLICT (username) DO NOTHING;
