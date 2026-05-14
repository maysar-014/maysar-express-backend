SELECT table_name, column_name, data_type, udt_name, character_maximum_length
FROM information_schema.columns
WHERE table_name IN ('wallets', 'wallet_transactions', 'auth_users', 'users')
  AND column_name IN ('userId', 'id')
ORDER BY table_name, column_name;
