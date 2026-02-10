-- Create analyzed_suggestions table for AI-powered Instagram/TikTok video analysis
-- This table stores suggestions that have been analyzed with AI for activity and location detection

CREATE TABLE IF NOT EXISTS analyzed_suggestions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Source information
  source_url TEXT NOT NULL,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('instagram', 'tiktok')),
  description TEXT,
  
  -- AI Analysis results
  detected_activity VARCHAR(100),
  detected_location VARCHAR(200),
  confidence DECIMAL(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Detailed AI response
  ai_response JSONB,
  landmarks TEXT[],
  features TEXT[],
  
  -- Performance metrics
  processing_time_ms INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_analyzed_suggestions_user_id ON analyzed_suggestions(user_id);
CREATE INDEX idx_analyzed_suggestions_platform ON analyzed_suggestions(platform);
CREATE INDEX idx_analyzed_suggestions_activity ON analyzed_suggestions(detected_activity);
CREATE INDEX idx_analyzed_suggestions_location ON analyzed_suggestions(detected_location);
CREATE INDEX idx_analyzed_suggestions_created_at ON analyzed_suggestions(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_analyzed_suggestions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_analyzed_suggestions_updated_at
  BEFORE UPDATE ON analyzed_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_analyzed_suggestions_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE analyzed_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own analyzed suggestions
CREATE POLICY "Users can view their own analyzed suggestions"
  ON analyzed_suggestions
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own analyzed suggestions
CREATE POLICY "Users can create their own analyzed suggestions"
  ON analyzed_suggestions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own analyzed suggestions
CREATE POLICY "Users can update their own analyzed suggestions"
  ON analyzed_suggestions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policy: Users can delete their own analyzed suggestions
CREATE POLICY "Users can delete their own analyzed suggestions"
  ON analyzed_suggestions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Comments for documentation
COMMENT ON TABLE analyzed_suggestions IS 'Stores AI-analyzed Instagram/TikTok video suggestions with activity and location detection';
COMMENT ON COLUMN analyzed_suggestions.source_url IS 'Original Instagram or TikTok URL';
COMMENT ON COLUMN analyzed_suggestions.platform IS 'Social media platform (instagram or tiktok)';
COMMENT ON COLUMN analyzed_suggestions.detected_activity IS 'AI-detected activity type (e.g., surfing, diving)';
COMMENT ON COLUMN analyzed_suggestions.detected_location IS 'AI-detected location (city, country)';
COMMENT ON COLUMN analyzed_suggestions.confidence IS 'AI confidence score from 0.0 to 1.0';
COMMENT ON COLUMN analyzed_suggestions.ai_response IS 'Full AI analysis response as JSON';
COMMENT ON COLUMN analyzed_suggestions.landmarks IS 'Array of detected landmarks';
COMMENT ON COLUMN analyzed_suggestions.features IS 'Array of detected features/characteristics';
COMMENT ON COLUMN analyzed_suggestions.processing_time_ms IS 'Time taken to process video in milliseconds';
