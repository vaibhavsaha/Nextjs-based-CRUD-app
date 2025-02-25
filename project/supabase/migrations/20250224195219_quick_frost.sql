/*
  # Add is_anonymous column to posts table

  1. Changes
    - Add `is_anonymous` boolean column to posts table with default value of false
    - Update RLS policies to handle anonymous posts

  2. Security
    - Maintain existing RLS policies
    - Add support for anonymous post management
*/

-- Add is_anonymous column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' 
    AND column_name = 'is_anonymous'
  ) THEN
    ALTER TABLE posts ADD COLUMN is_anonymous BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Update RLS policies to handle anonymous posts
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