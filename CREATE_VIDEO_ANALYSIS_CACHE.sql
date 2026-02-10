-- Table to cache Instagram video analyses
-- Avoids re-analyzing the same video multiple times (saves time & API costs)

CREATE TABLE IF NOT EXISTS video_analysis_cache (
  id SERIAL PRIMARY KEY,
  instagram_url TEXT NOT NULL UNIQUE,
  thumbnail_url TEXT,
  
  -- Analysis results
  analysis_type TEXT NOT NULL, -- 'activity' or 'landscape'
  activity TEXT,
  location TEXT,
  confidence DECIMAL(3,2),
  
  -- Recommended experiences (JSON array)
  experiences JSONB NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days', -- Cache for 30 days
  hit_count INTEGER DEFAULT 0 -- Track how many times this cache was used
);

-- Index for fast lookup by URL
CREATE INDEX IF NOT EXISTS idx_video_cache_url ON video_analysis_cache(instagram_url);

-- Index for cleanup of expired entries
CREATE INDEX IF NOT EXISTS idx_video_cache_expires ON video_analysis_cache(expires_at);

-- Auto-cleanup function to delete expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_video_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM video_analysis_cache
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Optional: Schedule auto-cleanup (run daily)
-- You can set this up manually or via a cron job
-- SELECT cleanup_expired_video_cache();

COMMENT ON TABLE video_analysis_cache IS 'Cache for Instagram video analysis results to avoid re-analyzing the same videos';
COMMENT ON COLUMN video_analysis_cache.hit_count IS 'Number of times this cached result was reused';
COMMENT ON COLUMN video_analysis_cache.expires_at IS 'Cache expires after 30 days to keep data fresh';
