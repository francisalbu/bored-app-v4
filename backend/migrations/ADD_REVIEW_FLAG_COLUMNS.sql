-- Add flagged columns to reviews table for moderation
-- Allows operators/admins to flag inappropriate reviews

ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT false;

ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS flag_reason TEXT;

-- Add index for faster flagged reviews lookup
CREATE INDEX IF NOT EXISTS idx_reviews_flagged ON reviews(flagged) WHERE flagged = true;

-- Comment for documentation
COMMENT ON COLUMN reviews.flagged IS 'Whether the review has been flagged as inappropriate';
COMMENT ON COLUMN reviews.flag_reason IS 'Reason for flagging the review';
