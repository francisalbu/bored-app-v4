-- Create user search history table to track all Instagram reel analyses
-- This replaces AsyncStorage for centralized data collection

CREATE TABLE IF NOT EXISTS user_search_history (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT, -- Can be null for anonymous users, will use device ID
  device_id TEXT NOT NULL, -- Unique device identifier
  
  -- Activity details
  activity TEXT NOT NULL,
  full_activity TEXT NOT NULL,
  location TEXT,
  
  -- Video details
  instagram_url TEXT NOT NULL,
  thumbnail_url TEXT, -- URL or base64
  
  -- Analysis metadata
  analysis_type TEXT, -- 'activity', 'landscape', 'boring'
  confidence DECIMAL(3,2),
  
  -- Experiences data (stored as JSON)
  experiences JSONB,
  analysis JSONB,
  
  -- Tracking
  search_count INTEGER DEFAULT 1,
  last_searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT unique_device_activity UNIQUE(device_id, activity)
);

-- Indexes for faster queries
CREATE INDEX idx_user_search_history_device ON user_search_history(device_id);
CREATE INDEX idx_user_search_history_user ON user_search_history(user_id);
CREATE INDEX idx_user_search_history_last_searched ON user_search_history(last_searched_at DESC);
CREATE INDEX idx_user_search_history_activity ON user_search_history(activity);

-- Enable Row Level Security
ALTER TABLE user_search_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own history (by device_id or user_id)
CREATE POLICY "Users can read own search history" 
ON user_search_history FOR SELECT 
USING (true); -- Allow all reads for now, can restrict later

-- Policy: Users can insert their own history
CREATE POLICY "Users can insert search history" 
ON user_search_history FOR INSERT 
WITH CHECK (true); -- Allow all inserts

-- Policy: Users can update their own history
CREATE POLICY "Users can update own search history" 
ON user_search_history FOR UPDATE 
USING (true); -- Allow all updates

-- Comment
COMMENT ON TABLE user_search_history IS 'Stores user search history from Instagram reel analyses for analytics and personalization';
