/*
  # Fix anonymous posts functionality

  1. Changes
    - Ensure is_anonymous column exists with correct type and default
    - Drop and recreate RLS policies with proper anonymous access
    - Add function to handle anonymous user context

  2. Security
    - Maintain RLS for authenticated users
    - Add secure handling for anonymous posts
    - Ensure proper access control for both user types
*/

-- First verify and fix the is_anonymous column
DO $$ 
BEGIN
  -- Drop existing column if it exists with wrong type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' 
    AND column_name = 'is_anonymous'
    AND data_type != 'boolean'
  ) THEN
    ALTER TABLE posts DROP COLUMN is_anonymous;
  END IF;

  -- Add column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' 
    AND column_name = 'is_anonymous'
  ) THEN
    ALTER TABLE posts ADD COLUMN is_anonymous BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Create function to handle anonymous user context
CREATE OR REPLACE FUNCTION set_anonymous_user(anonymous_user_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_anonymous_user', anonymous_user_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate policies with proper anonymous handling
DROP POLICY IF EXISTS "Anyone can read posts" ON posts;
DROP POLICY IF EXISTS "Users can create posts" ON posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;

-- Allow anyone to read posts
CREATE POLICY "Anyone can read posts"
  ON posts FOR SELECT
  USING (true);

-- Allow both authenticated and anonymous users to create posts
CREATE POLICY "Users can create posts"
  ON posts FOR INSERT
  WITH CHECK (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN auth.uid() = user_id
      WHEN is_anonymous = true THEN true
      ELSE false
    END
  );

-- Allow users to update their own posts
CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE
  USING (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN auth.uid() = user_id
      WHEN is_anonymous = true THEN user_id::text = current_setting('app.current_anonymous_user', true)
      ELSE false
    END
  )
  WITH CHECK (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN auth.uid() = user_id
      WHEN is_anonymous = true THEN user_id::text = current_setting('app.current_anonymous_user', true)
      ELSE false
    END
  );

-- Allow users to delete their own posts
CREATE POLICY "Users can delete their own posts"
  ON posts FOR DELETE
  USING (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN auth.uid() = user_id
      WHEN is_anonymous = true THEN user_id::text = current_setting('app.current_anonymous_user', true)
      ELSE false
    END
  );