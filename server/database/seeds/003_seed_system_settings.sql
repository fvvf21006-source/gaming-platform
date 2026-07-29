-- 003_seed_system_settings.sql
-- Baseline platform configuration values.

INSERT INTO system_settings (key, value, description) VALUES
    ('platform_name', 'Gaming Platform', 'Display name shown throughout the application.'),
    ('maintenance_mode', 'false', 'When "true", non-Super-Admin logins are disabled.'),
    ('default_game_point_cost', '10', 'Fallback point cost used when a game does not specify its own.')
ON CONFLICT (key) DO NOTHING;
