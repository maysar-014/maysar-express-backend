# Database Schema Fix - Route Duration Fields

## Problem
The routes table had `estimated_duration` and `actual_duration` columns defined as `INTEGER`, but the route optimization service was calculating durations as floating-point numbers (e.g., "13.233333333333333"). This caused PostgreSQL errors when trying to save route data.

## Solution
Changed the duration columns from `INTEGER` to `DECIMAL(8,2)` to allow fractional minutes.

## Files Modified
- `route-tables.sql` - Updated schema definition for new tables
- `fix-route-schema-migration.sql` - Migration script for existing tables

## How to Apply the Fix

### Option 1: For New Databases
If you're setting up a new database, just run the updated `route-tables.sql` script in Supabase SQL Editor.

### Option 2: For Existing Databases (with data)
If you have existing route data, run the migration script:

1. **Open Supabase Dashboard**
2. **Go to SQL Editor**
3. **Run the migration script:**

```sql
-- Copy and paste this into Supabase SQL Editor
ALTER TABLE routes
ALTER COLUMN estimated_duration TYPE DECIMAL(8,2);

ALTER TABLE routes
ALTER COLUMN actual_duration TYPE DECIMAL(8,2);
```

4. **Verify the changes:**

```sql
-- Check column types
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'routes'
  AND column_name IN ('estimated_duration', 'actual_duration');
```

## Expected Result
After running the migration, route creation should work without the "invalid input syntax for type integer" error. The saga tests should now complete successfully with route persistence.

## Testing
Run the saga tests again to confirm route creation works:

```bash
# Start the logistics service
npm run dev

# Run the saga tests in Postman
# Use: logistics-saga-tests-only.postman_collection.json
```

## Impact
- ✅ Route creation will succeed
- ✅ Saga orchestration will complete fully
- ✅ All test steps will pass
- ✅ No data loss (existing integer values convert cleanly to decimal)

## Rollback (if needed)
If you need to rollback:

```sql
ALTER TABLE routes
ALTER COLUMN estimated_duration TYPE INTEGER;

ALTER TABLE routes
ALTER COLUMN actual_duration TYPE INTEGER;
```

But note: This will fail if you have decimal values in the table.
