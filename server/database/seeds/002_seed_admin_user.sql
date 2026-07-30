-- 002_seed_admin_user.sql
-- Bootstraps the single initial Super Admin account so the hierarchy
-- has a root to create Level 1 accounts from.
--
-- password_hash is a real bcrypt hash (cost factor 10) of the
-- documented default password "Admin@123" — see README.md /
-- "Authentication Setup". The plaintext password is never stored;
-- only this hash is. Rotate this account's password immediately in
-- any real deployment (see docs/09_DEPLOYMENT.md production checklist).

INSERT INTO users (role_id, created_by, username, email, password_hash, status)
SELECT
    r.id,
    NULL,
    'super_admin',
    'super_admin@example.com',
    '$2b$10$NezIMoTMWzTKOr0TRlnmQ.0KP03P5kP5VwWYzZLy.RqewVMsEm2Ea',
    'active'
FROM roles r
WHERE r.name = 'super_admin'
ON CONFLICT (username) DO NOTHING;
