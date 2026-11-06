-- Runs after catalog seeds on fresh databases, once only.
UPDATE games SET point_cost = 0.5;
