-- Create experience_interests table to store user interest in upcoming experiences

CREATE TABLE IF NOT EXISTS experience_interests (
  id SERIAL PRIMARY KEY,
  experience_id INTEGER NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  notes TEXT,
  notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  notified_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_experience_interests_experience_id ON experience_interests(experience_id);
CREATE INDEX IF NOT EXISTS idx_experience_interests_email ON experience_interests(email);
CREATE INDEX IF NOT EXISTS idx_experience_interests_created_at ON experience_interests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_experience_interests_notified ON experience_interests(notified);

-- Add comment
COMMENT ON TABLE experience_interests IS 'Stores user interest submissions for experiences that are coming soon';
COMMENT ON COLUMN experience_interests.notified IS 'Whether the user has been notified when the experience became available';
