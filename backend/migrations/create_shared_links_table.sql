-- Create shared_links table to track all Share Intent activity
-- This helps analyze what experiences users are searching for

CREATE TABLE IF NOT EXISTS shared_links (
  id SERIAL PRIMARY KEY,
  
  -- Link info
  shared_url TEXT NOT NULL,
  platform VARCHAR(50), -- 'tiktok', 'instagram', 'other'
  
  -- Extracted metadata
  description TEXT,
  hashtags TEXT[], -- Array of hashtags
  username VARCHAR(255), -- Social media username if extracted
  
  -- Match results
  matched_experience_ids INTEGER[], -- Array of matched experience IDs
  match_method VARCHAR(50), -- 'ai', 'keywords', 'none'
  match_count INTEGER DEFAULT 0,
  
  -- User info (optional - if user is logged in)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  device_info TEXT, -- Optional device/platform info
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_shared_links_platform ON shared_links(platform);
CREATE INDEX IF NOT EXISTS idx_shared_links_created_at ON shared_links(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_links_match_method ON shared_links(match_method);
CREATE INDEX IF NOT EXISTS idx_shared_links_user_id ON shared_links(user_id);

-- Create index for searching by hashtags (GIN index for array)
CREATE INDEX IF NOT EXISTS idx_shared_links_hashtags ON shared_links USING GIN(hashtags);

-- Add comments
COMMENT ON TABLE shared_links IS 'Tracks all Share Intent activity - helps analyze what experiences users are searching for';
COMMENT ON COLUMN shared_links.matched_experience_ids IS 'Array of experience IDs that were matched to this shared link';
COMMENT ON COLUMN shared_links.match_method IS 'How the match was made: ai (OpenAI), keywords (local), none (no match)';
