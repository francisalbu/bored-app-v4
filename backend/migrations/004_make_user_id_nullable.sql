-- Make user_id nullable for external reviews (Google, TripAdvisor, etc.)
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table

-- Step 1: Rename old table
ALTER TABLE reviews RENAME TO reviews_old;

-- Step 2: Create new table with user_id as nullable
CREATE TABLE reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER, -- NOW NULLABLE for external reviews
    experience_id INTEGER NOT NULL,
    booking_id INTEGER,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    operator_response TEXT,
    response_date DATETIME,
    source VARCHAR(50) DEFAULT 'internal',
    author_name VARCHAR(255),
    author_avatar TEXT,
    verified_purchase BOOLEAN DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (experience_id) REFERENCES experiences(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);

-- Step 3: Copy data from old table
INSERT INTO reviews SELECT * FROM reviews_old;

-- Step 4: Drop old table
DROP TABLE reviews_old;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_reviews_experience_source ON reviews(experience_id, source);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(experience_id, rating);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
