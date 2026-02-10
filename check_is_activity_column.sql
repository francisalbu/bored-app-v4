-- Check if is_activity column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'analyzed_suggestions'
ORDER BY ordinal_position;
