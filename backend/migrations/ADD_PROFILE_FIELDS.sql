-- Add new profile fields to users table
-- Run this in Supabase SQL Editor

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS birthdate DATE,
ADD COLUMN IF NOT EXISTS location VARCHAR(255),
ADD COLUMN IF NOT EXISTS avatar_icon VARCHAR(50) DEFAULT '🧑‍🚀';

-- Comment: 
-- birthdate: User's date of birth
-- location: User's location/city
-- avatar_icon: Selected emoji icon (🧑‍🚀, 🏄‍♂️, 🧗‍♀️, 🚴‍♂️, 🏃‍♀️)
