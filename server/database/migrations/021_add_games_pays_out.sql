-- 021_add_games_pays_out.sql
-- Casino games report "points won" as their score, so that score is paid to the
-- player at the end of a round. Arcade games report a plain game score that is
-- not a point amount, so they pay nothing back (the buy-in stays with the house).

ALTER TABLE games
    ADD COLUMN pays_out BOOLEAN NOT NULL DEFAULT false;

UPDATE games
   SET pays_out = true
 WHERE name IN ('Lucky Wheel', 'Slot Machine', 'Mines Field', 'Crash Rocket');

COMMENT ON COLUMN games.pays_out IS 'True when a completed session''s score is a number of points paid to the player (casino games); false when the score is just a score (arcade games).';
