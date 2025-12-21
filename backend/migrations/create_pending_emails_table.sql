-- Create pending_emails table for email fallback/retry system
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS pending_emails (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id),
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),
  booking_reference VARCHAR(50),
  experience_title VARCHAR(500),
  error_message TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_pending_emails_status ON pending_emails(status);
CREATE INDEX IF NOT EXISTS idx_pending_emails_booking ON pending_emails(booking_id);

-- Enable RLS
ALTER TABLE pending_emails ENABLE ROW LEVEL SECURITY;

-- Policy for service role to manage
CREATE POLICY "Service role can manage pending_emails" ON pending_emails
  FOR ALL USING (true);

-- Comment
COMMENT ON TABLE pending_emails IS 'Fallback table for emails that failed to send. Used for retry mechanism.';
