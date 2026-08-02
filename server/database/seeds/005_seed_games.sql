-- 005_seed_games.sql
-- Minimal, active game catalog so a fresh clone has something a
-- Player can actually play, without any admin catalog-management
-- endpoint (out of scope for P06 — see docs/04_API_SPEC.md Game Module).
-- Depends on 004_seed_game_categories.sql having already run.

INSERT INTO games (category_id, name, description, point_cost, is_active)
SELECT c.id, v.name, v.description, v.point_cost, true
FROM (VALUES
    ('Block Blitz',   'Clear falling blocks before the stack reaches the top.', 10, 'Arcade'),
    ('Number Chain',  'Connect adjacent numbers into the longest valid chain.', 15, 'Puzzle'),
    ('Quick Draw',    'Draw and discard to build the best hand before time runs out.', 20, 'Card')
) AS v(name, description, point_cost, category_name)
JOIN game_categories c ON c.name = v.category_name
ON CONFLICT (name) DO NOTHING;
