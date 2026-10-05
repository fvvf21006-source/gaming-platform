-- 004_seed_game_categories.sql
-- Minimal set of catalog categories, sufficient for the games seeded
-- alongside them in 005_seed_games.sql.

INSERT INTO game_categories (name, description) VALUES
    ('Arcade', 'Fast, simple score-chasing games.'),
    ('Puzzle', 'Logic and pattern-based games.'),
    ('Card', 'Simple card-based games.'),
    ('Casino', 'Wheel, Roulette and classic casino chance games.'),
    ('Slots', 'Multi-reel slot machines with payout lines.'),
    ('Quick Games', 'Mines, Crash multiplier and high-speed betting games.')
ON CONFLICT (name) DO NOTHING;

