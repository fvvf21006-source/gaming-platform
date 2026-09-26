-- 015_alter_wallet_transactions_recipient_nullable.sql
-- Administrative removals now move points UP to the administrator
-- (target -> admin). Super Admin has no wallet, so when Super Admin
-- is the receiving side there is no real balance to report; mirror
-- the sender_balance_after change from 012. Existing rows untouched.

ALTER TABLE wallet_transactions
    ALTER COLUMN recipient_balance_after DROP NOT NULL;

COMMENT ON COLUMN wallet_transactions.recipient_balance_after IS 'NULL when the recipient has no real wallet (Super Admin receiving points back from an administrative removal).';
