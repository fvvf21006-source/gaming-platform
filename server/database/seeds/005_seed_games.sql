-- 005_seed_games.sql
-- Minimal, active game catalog so a fresh clone has something a
-- Player can actually play, without any admin catalog-management
-- endpoint (out of scope for P06 — see docs/04_API_SPEC.md Game Module).
-- Depends on 004_seed_game_categories.sql having already run.

INSERT INTO games (category_id, name, description, point_cost, is_active)
SELECT c.id, v.name, v.description, v.point_cost, true
FROM (VALUES
    ('Lucky Wheel',   'Spin the wheel of fortune to hit mega multipliers up to 100x.', 10, 'Casino'),
    ('Slot Machine',  '3-reel & 5-reel slot machine with gems, sevens and jackpot payouts.', 25, 'Slots'),
    ('Mines Field',   'Uncover safe tiles on a 5x5 grid and cash out before hitting a mine.', 20, 'Quick Games'),
    ('Crash Rocket',  'Watch the multiplier rocket rise and cash out before it crashes!', 50, 'Quick Games'),
    ('Target Blitz',  'Fast-paced target shooting mini game.', 10, 'Arcade'),
    ('Reflex Speed',  'Test your reaction speed and reflexes.', 15, 'Arcade'),
    ('Number Chain',  'Connect adjacent numbers into the longest valid chain.', 15, 'Puzzle')
) AS v(name, description, point_cost, category_name)
JOIN game_categories c ON c.name = v.category_name
ON CONFLICT (name) DO NOTHING;

