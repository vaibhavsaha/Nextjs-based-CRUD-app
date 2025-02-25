/*
  # Allow anonymous posts

  This migration will:
  1. Drop the foreign key constraint on user_id
  2. Add a new column to track if a post is from an anonymous user
  3. Update RLS policies to handle anonymous posts
*/

-- Drop the foreign key constraint
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;

-- Add column to track anonymous posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

-- Drop the existing trigger
DROP TRIGGER IF EXISTS ensure_user_exists ON posts;
DROP FUNCTION IF EXISTS check_user_exists();

-- Update RLS policies
DROP POLICY IF EXISTS "Anyone can read posts" ON posts;
DROP POLICY IF EXISTS "Users can create their own posts" ON posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;

-- Create new policies that handle both authenticated and anonymous posts
CREATE POLICY "Anyone can read posts"
  ON posts FOR SELECT
  USING (true);

CREATE POLICY "Users can create posts"
  ON posts FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    (is_anonymous = true)
  );

CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    (is_anonymous = true AND user_id = current_setting('app.current_anonymous_user', true)::uuid)
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    (is_anonymous = true AND user_id = current_setting('app.current_anonymous_user', true)::uuid)
  );

CREATE POLICY "Users can delete their own posts"
  ON posts FOR DELETE
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    (is_anonymous = true AND user_id = current_setting('app.current_anonymous_user', true)::uuid)
  );