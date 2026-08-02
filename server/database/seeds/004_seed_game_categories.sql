-- 004_seed_game_categories.sql
-- Minimal set of catalog categories, sufficient for the games seeded
-- alongside them in 005_seed_games.sql.

INSERT INTO game_categories (name, description) VALUES
    ('Arcade', 'Fast, simple score-chasing games.'),
    ('Puzzle', 'Logic and pattern-based games.'),
    ('Card', 'Simple card-based games.')
ON CONFLICT (name) DO NOTHING;
