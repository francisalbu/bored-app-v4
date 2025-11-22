-- Reset PostgreSQL Sequences for Supabase
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/hnivuisqktlrusyqywaz/sql

-- Reset users sequence
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users) + 1);

-- Reset bookings sequence
SELECT setval('bookings_id_seq', (SELECT COALESCE(MAX(id), 0) FROM bookings) + 1);

-- Reset experiences sequence
SELECT setval('experiences_id_seq', (SELECT MAX(id) FROM experiences) + 1);

-- Reset availability_slots sequence
SELECT setval('availability_slots_id_seq', (SELECT MAX(id) FROM availability_slots) + 1);

-- Reset reviews sequence  
SELECT setval('reviews_id_seq', (SELECT MAX(id) FROM reviews) + 1);

-- Reset operators sequence
SELECT setval('operators_id_seq', (SELECT MAX(id) FROM operators) + 1);

-- Reset favorites sequence (if exists)
SELECT setval('favorites_id_seq', (SELECT COALESCE(MAX(id), 0) FROM favorites) + 1);

-- Verify sequences are correct
SELECT 'users_id_seq' as sequence_name, last_value FROM users_id_seq
UNION ALL
SELECT 'bookings_id_seq', last_value FROM bookings_id_seq
UNION ALL
SELECT 'experiences_id_seq', last_value FROM experiences_id_seq
UNION ALL  
SELECT 'availability_slots_id_seq', last_value FROM availability_slots_id_seq
UNION ALL
SELECT 'reviews_id_seq', last_value FROM reviews_id_seq
UNION ALL
SELECT 'operators_id_seq', last_value FROM operators_id_seq;
