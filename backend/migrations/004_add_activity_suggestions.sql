-- Migration: 004_add_activity_suggestions
-- Create table for user-submitted activity suggestions

CREATE TABLE IF NOT EXISTS activity_suggestions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  instagram_handle VARCHAR(255),
  website TEXT,
  description TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_suggestions_user_id ON activity_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_suggestions_status ON activity_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_activity_suggestions_created_at ON activity_suggestions(created_at DESC);

-- Add RLS policies
ALTER TABLE activity_suggestions ENABLE ROW LEVEL SECURITY;

-- Users can insert their own suggestions
CREATE POLICY "Users can insert their own suggestions"
  ON activity_suggestions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own suggestions
CREATE POLICY "Users can view their own suggestions"
  ON activity_suggestions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all suggestions (you'll need to add admin role logic)
CREATE POLICY "Admins can view all suggestions"
  ON activity_suggestions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.supabase_uid = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can update suggestions
CREATE POLICY "Admins can update suggestions"
  ON activity_suggestions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.supabase_uid = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.supabase_uid = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_activity_suggestions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_activity_suggestions_updated_at
  BEFORE UPDATE ON activity_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_activity_suggestions_updated_at();

-- Add comments for documentation
COMMENT ON TABLE activity_suggestions IS 'User-submitted suggestions for new activities';
COMMENT ON COLUMN activity_suggestions.status IS 'Status: pending, approved, rejected, implemented';
COMMENT ON COLUMN activity_suggestions.instagram_handle IS 'Instagram handle of the suggested activity';
COMMENT ON COLUMN activity_suggestions.website IS 'Website URL of the suggested activity';
