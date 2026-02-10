-- Migration: 005_add_discount_codes
-- Create tables for discount codes system

-- Table for discount codes
CREATE TABLE IF NOT EXISTS discount_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_percentage INTEGER NOT NULL CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  description TEXT,
  active BOOLEAN DEFAULT true,
  max_uses_per_user INTEGER DEFAULT 1,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track discount code usage by users
CREATE TABLE IF NOT EXISTS discount_code_usage (
  id SERIAL PRIMARY KEY,
  discount_code_id INTEGER NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  booking_id INTEGER,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(discount_code_id, user_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON discount_codes(active);
CREATE INDEX IF NOT EXISTS idx_discount_code_usage_user_id ON discount_code_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_discount_code_usage_discount_code_id ON discount_code_usage(discount_code_id);

-- Add RLS policies for discount_codes
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

-- Everyone can read active discount codes (for validation)
CREATE POLICY "Anyone can read active discount codes"
  ON discount_codes
  FOR SELECT
  TO authenticated
  USING (active = true);

-- Only admins can insert/update/delete discount codes
CREATE POLICY "Admins can manage discount codes"
  ON discount_codes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.supabase_uid = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Add RLS policies for discount_code_usage
ALTER TABLE discount_code_usage ENABLE ROW LEVEL SECURITY;

-- Users can see their own usage
CREATE POLICY "Users can view their own discount usage"
  ON discount_code_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own usage (through API)
CREATE POLICY "Users can insert their own discount usage"
  ON discount_code_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can see all usage
CREATE POLICY "Admins can view all discount usage"
  ON discount_code_usage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.supabase_uid = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_discount_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_discount_codes_updated_at
  BEFORE UPDATE ON discount_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_discount_codes_updated_at();

-- Insert the FORGETYOURGUIDE10 code
INSERT INTO discount_codes (code, discount_percentage, description, active, max_uses_per_user)
VALUES ('FORGETYOURGUIDE10', 10, 'Street campaign discount - 10% off for photo with van', true, 1)
ON CONFLICT (code) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE discount_codes IS 'Discount codes that can be applied to bookings';
COMMENT ON TABLE discount_code_usage IS 'Tracks which users have used which discount codes';
COMMENT ON COLUMN discount_codes.max_uses_per_user IS 'Maximum times a single user can use this code (default 1)';
COMMENT ON COLUMN discount_codes.discount_percentage IS 'Percentage discount (0-100)';
