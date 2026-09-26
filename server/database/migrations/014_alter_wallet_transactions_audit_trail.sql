-- 014_alter_wallet_transactions_audit_trail.sql
-- Every points movement must record the previous balance and the
-- authorized user who performed it, and the ledger must be immutable:
-- deleting/updating a transaction row must never be possible, so it
-- can never reverse or duplicate points. Balances live in wallets and
-- change only through the transfer/adjust code paths.
--
-- All additive: new columns are nullable (NULL = no real wallet on
-- that side, e.g. Super Admin), existing rows are backfilled where
-- the value is derivable.

ALTER TABLE wallet_transactions
    ADD COLUMN sender_balance_before    BIGINT,
    ADD COLUMN recipient_balance_before BIGINT,
    ADD COLUMN performed_by             UUID REFERENCES users(id) ON DELETE RESTRICT;

-- Historical rows: the performer of a transfer is its sender, and
-- for ordinary transfers the "before" balances follow from amount.
UPDATE wallet_transactions SET performed_by = sender_id WHERE performed_by IS NULL;
UPDATE wallet_transactions
   SET sender_balance_before = sender_balance_after + amount,
       recipient_balance_before = recipient_balance_after - amount
 WHERE transaction_type = 'transfer' AND sender_balance_after IS NOT NULL;

CREATE FUNCTION prevent_wallet_transaction_change() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'wallet_transactions is an immutable ledger; rows cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_wallet_transactions_immutable
    BEFORE UPDATE OR DELETE ON wallet_transactions
    FOR EACH ROW EXECUTE FUNCTION prevent_wallet_transaction_change();

COMMENT ON COLUMN wallet_transactions.performed_by IS 'The authorized user who performed the action (sender for transfers, the administrator for adjustments).';
