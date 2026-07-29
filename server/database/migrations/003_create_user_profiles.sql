-- 003_create_user_profiles.sql
-- Optional profile data, separated from the core auth-bearing users
-- table so profile edits never touch authentication-critical columns.

CREATE TABLE user_profiles (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name    VARCHAR(100),
    display_name VARCHAR(50),
    avatar_url   TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_user_profiles_user_id UNIQUE (user_id)
);

COMMENT ON TABLE user_profiles IS 'One-to-one profile data per user, separate from authentication fields on users.';
