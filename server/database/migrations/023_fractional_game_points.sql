-- Keep historical balances and ledger entries while allowing fractional stakes/payouts.
ALTER TABLE games ALTER COLUMN point_cost TYPE NUMERIC(21,2);
ALTER TABLE game_sessions
  ALTER COLUMN points_spent TYPE NUMERIC(21,2),
  ALTER COLUMN score TYPE NUMERIC(21,2),
  ALTER COLUMN forced_score TYPE NUMERIC(21,2);
ALTER TABLE player_next_outcomes ALTER COLUMN score TYPE NUMERIC(21,2);
ALTER TABLE wallets ALTER COLUMN balance TYPE NUMERIC(21,2);
ALTER TABLE wallet_transactions
  ALTER COLUMN amount TYPE NUMERIC(21,2),
  ALTER COLUMN sender_balance_before TYPE NUMERIC(21,2),
  ALTER COLUMN sender_balance_after TYPE NUMERIC(21,2),
  ALTER COLUMN recipient_balance_before TYPE NUMERIC(21,2),
  ALTER COLUMN recipient_balance_after TYPE NUMERIC(21,2);
UPDATE games SET point_cost = 0.5;
UPDATE games SET pays_out = TRUE WHERE name IN ('Lucky Wheel', 'Slot Machine', 'Mines Field', 'Crash Rocket');
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
