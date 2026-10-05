-- 006_seed_casino_games.sql
-- Adds the casino categories and games to databases that already applied the
-- original 004/005 seeds (setup-db never re-runs an applied seed, so editing
-- those files had no effect on existing deployments). Idempotent.

INSERT INTO game_categories (name, description) VALUES
    ('Casino', 'Wheel, Roulette and classic casino chance games.'),
    ('Slots', 'Multi-reel slot machines with payout lines.'),
    ('Quick Games', 'Mines, Crash multiplier and high-speed betting games.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO games (category_id, name, description, point_cost, is_active)
SELECT c.id, v.name, v.description, v.point_cost, true
FROM (VALUES
    ('Lucky Wheel',  'Spin the wheel of fortune to hit mega multipliers up to 100x.', 10, 'Casino'),
    ('Slot Machine', '3-reel slot machine with gems, sevens and jackpot payouts.', 25, 'Slots'),
    ('Mines Field',  'Uncover safe tiles on a 5x5 grid and cash out before hitting a mine.', 20, 'Quick Games'),
    ('Crash Rocket', 'Watch the multiplier rocket rise and cash out before it crashes!', 50, 'Quick Games')
) AS v(name, description, point_cost, category_name)
JOIN game_categories c ON c.name = v.category_name
ON CONFLICT (name) DO NOTHING;
