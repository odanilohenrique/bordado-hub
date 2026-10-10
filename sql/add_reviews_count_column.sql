-- Add reviews_count column to users table
-- This column tracks how many reviews a user (programmer) has received.
-- It is updated automatically by the approve API route after each review.

ALTER TABLE users ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0;

-- Backfill existing data: calculate reviews_count from the reviews table
UPDATE users u
SET reviews_count = COALESCE(sub.cnt, 0)
FROM (
    SELECT reviewee_id, COUNT(*) AS cnt
    FROM reviews
    GROUP BY reviewee_id
) sub
WHERE u.id = sub.reviewee_id;

-- Notify PostgREST to reload the schema cache so the new column is immediately available
NOTIFY pgrst, 'reload schema';
