-- Create saved_spots table for user's travel map
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS saved_spots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Spot info from video analysis
  spot_name VARCHAR(255) NOT NULL,
  activity VARCHAR(255) NOT NULL,
  location_full TEXT NOT NULL, -- "Flores Island, Azores, Portugal"
  country VARCHAR(100),
  region VARCHAR(100),
  
  -- Geographic data
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  
  -- Original video
  instagram_url TEXT,
  thumbnail_url TEXT,
  
  -- AI-generated activities (JSONB array)
  activities JSONB NOT NULL DEFAULT '[]',
  -- Example: [
  --   {
  --     "title": "Hike Poço da Alagoinha",
  --     "description": "...",
  --     "category": "adventure",
  --     "difficulty": "moderate",
  --     "duration": "2-3 hours",
  --     "why_not_boring": "..."
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

-- Index for fast map queries (bounding box)
CREATE INDEX idx_saved_spots_coordinates ON saved_spots(latitude, longitude);
CREATE INDEX idx_saved_spots_user ON saved_spots(user_id);
CREATE INDEX idx_saved_spots_country ON saved_spots(country);

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
COMMENT ON TABLE saved_spots IS 'User-saved travel spots from Instagram/TikTok videos';
COMMENT ON COLUMN saved_spots.activities IS 'AI-generated cool activities for this spot (JSONB array)';
COMMENT ON COLUMN saved_spots.visit_status IS 'want_to_go, visited, or currently_here';
