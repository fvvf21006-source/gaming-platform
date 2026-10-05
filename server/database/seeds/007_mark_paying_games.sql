-- 007_mark_paying_games.sql
-- On a fresh database the casino games are inserted by seeds 005/006, which run
-- after migration 021, so flag them here. (Databases that already had the games
-- are covered by the UPDATE in migration 021.) Idempotent.

UPDATE games
   SET pays_out = true
 WHERE name IN ('Lucky Wheel', 'Slot Machine', 'Mines Field', 'Crash Rocket');
