-- Create saved_spots table for user's travel map
-- Run this in Supabase SQL Editor

-- ⚠️ Drop existing table if you want to start fresh
-- DROP TABLE IF EXISTS saved_spots CASCADE;

CREATE TABLE IF NOT EXISTS saved_spots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Spot info from video analysis
  spot_name VARCHAR(255) NOT NULL,
  activity VARCHAR(255) NOT NULL,
  location_full TEXT NOT NULL, -- "Trevi Fountain, Rome, Italy"
  country VARCHAR(100),
  city VARCHAR(100),
  
  -- Geographic data
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  
  -- Original video
  instagram_url TEXT,
  thumbnail_url TEXT, -- Instagram video thumbnail
  
  -- Google Places metadata
  place_id VARCHAR(255), -- Google Places unique ID
  google_photo_url TEXT, -- Google Places photo of the specific POI
  rating DECIMAL(2, 1), -- 4.7 (0.0-5.0)
  user_ratings_total INTEGER, -- 493382 reviews
  website TEXT, -- Official website
  phone VARCHAR(50), -- Contact phone
  description TEXT, -- Google Places description
  google_types JSONB, -- ["tourist_attraction", "point_of_interest"]
  opening_hours JSONB, -- Google Places opening hours data
  
  -- AI-generated activities (JSONB array)
  activities JSONB NOT NULL DEFAULT '[]',
  -- Example: [
  --   {
  --     "title": "Visit Trevi Fountain",
  --     "description": "Explore the iconic fountain",
  --     "category": "sightseeing",
  --     "difficulty": "easy",
  --     "duration": "1-2 hours",
  --     "why_not_boring": "Must-see attraction!"
  --   }
  -- ]
  
  -- Metadata
  confidence_score DECIMAL(3, 2),
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Analytics
  visit_status VARCHAR(50) DEFAULT 'want_to_go', -- want_to_go, visited, currently_here
  notes TEXT,
  
  CONSTRAINT unique_user_spot UNIQUE(user_id, spot_name, latitude, longitude)
);

-- Indexes for fast queries
CREATE INDEX idx_saved_spots_coordinates ON saved_spots(latitude, longitude);
CREATE INDEX idx_saved_spots_user ON saved_spots(user_id);
CREATE INDEX idx_saved_spots_country ON saved_spots(country);
CREATE INDEX idx_saved_spots_city ON saved_spots(city);
CREATE INDEX idx_saved_spots_place_id ON saved_spots(place_id);

-- RLS Policies
ALTER TABLE saved_spots ENABLE ROW LEVEL SECURITY;

-- Users can only see their own spots
CREATE POLICY "Users can view own spots" ON saved_spots
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own spots
CREATE POLICY "Users can insert own spots" ON saved_spots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own spots
CREATE POLICY "Users can update own spots" ON saved_spots
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own spots
CREATE POLICY "Users can delete own spots" ON saved_spots
  FOR DELETE USING (auth.uid() = user_id);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_saved_spots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_saved_spots_updated_at
  BEFORE UPDATE ON saved_spots
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_spots_updated_at();

-- Comments
COMMENT ON TABLE saved_spots IS 'User-saved travel spots from Instagram/TikTok videos with Google Places metadata';
COMMENT ON COLUMN saved_spots.activities IS 'AI-generated cool activities for this spot (JSONB array)';
COMMENT ON COLUMN saved_spots.visit_status IS 'want_to_go, visited, or currently_here';
COMMENT ON COLUMN saved_spots.place_id IS 'Google Places unique identifier';
COMMENT ON COLUMN saved_spots.rating IS 'Google Places rating (0.0-5.0)';
COMMENT ON COLUMN saved_spots.user_ratings_total IS 'Total number of Google reviews';
COMMENT ON COLUMN saved_spots.description IS 'Google Places description';
COMMENT ON COLUMN saved_spots.google_types IS 'Google Places types (e.g., ["tourist_attraction", "point_of_interest"])';
COMMENT ON COLUMN saved_spots.opening_hours IS 'Google Places opening hours data (JSONB)';
COMMENT ON COLUMN saved_spots.city IS 'City name for hierarchical map clustering';
COMMENT ON COLUMN saved_spots.thumbnail_url IS 'Instagram video thumbnail';
COMMENT ON COLUMN saved_spots.google_photo_url IS 'Google Places photo of the specific POI';
