-- 012_alter_wallet_transactions_admin_support.sql
-- P08: Super Admin transfers unlimited points (no wallet, so no
-- real "balance after" to record) and administrative point
-- adjustments (add/remove/set — not a peer-to-peer hierarchy
-- transfer) both need to write a wallet_transactions row that the
-- existing schema can't quite express as-is. Two small, additive,
-- backward-compatible changes:
--
-- 1. sender_balance_after becomes nullable. Existing rows are
--    untouched (all currently NOT NULL); NULL now means "the sender
--    side of this row isn't a real, balance-constrained wallet."
--    The existing non-negative CHECK constraint already treats NULL
--    as satisfying the check (SQL NULL comparisons never fail a
--    CHECK), so it needs no change.
--
-- 2. transaction_type distinguishes what kind of row this is.
--    Defaults every existing and future ordinary transfer to
--    'transfer' (zero impact on anything already written or already
--    reading this table, including the P07 reporting module, which
--    was explicitly built with a placeholder 'transfer' literal in
--    reportService.js in anticipation of exactly this column).

ALTER TABLE wallet_transactions
    ALTER COLUMN sender_balance_after DROP NOT NULL;

ALTER TABLE wallet_transactions
    ADD COLUMN transaction_type VARCHAR(20) NOT NULL DEFAULT 'transfer';

ALTER TABLE wallet_transactions
    ADD CONSTRAINT chk_wallet_transactions_type
    CHECK (transaction_type IN ('transfer', 'admin_add', 'admin_remove', 'admin_set'));

COMMENT ON COLUMN wallet_transactions.sender_balance_after IS 'NULL when the sender has no real wallet balance to report (Super Admin unlimited transfers, administrative adjustments).';
COMMENT ON COLUMN wallet_transactions.transaction_type IS '''transfer'' for ordinary hierarchy transfers (including Super Admin''s unlimited-source ones); ''admin_add''/''admin_remove''/''admin_set'' for administrative point-management adjustments.';
