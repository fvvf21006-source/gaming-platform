-- 013_alter_users_must_change_password.sql
-- P08 Part 5: mandatory password change after an administrative
-- reset (Part 4). Additive, backward-compatible — every existing
-- row defaults to false (no forced change for anyone already in
-- the system), and login/authorization behavior is otherwise
-- unaffected (a user with this flag set can still log in; only the
-- response indicates a change is required, per the task spec —
-- enforcement of an actual redirect is a frontend concern, out of
-- scope here).

ALTER TABLE users
    ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN users.must_change_password IS 'Set true by an administrative password reset (Part 4); cleared by the user successfully changing their own password (Part 3). Does not block login by itself.';
