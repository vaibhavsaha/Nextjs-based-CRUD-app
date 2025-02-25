/*
  # Fix anonymous posts and schema cache

  1. Changes
    - Drop and recreate is_anonymous column
    - Update RLS policies for anonymous users
    - Add function for setting anonymous user context
    - Force schema cache refresh

  2. Security
    - Maintain RLS policies for both authenticated and anonymous users
    - Add proper checks for anonymous user ownership
*/

-- First, recreate the is_anonymous column
DO $$ 
BEGIN
  -- Drop the column if it exists
  ALTER TABLE posts DROP COLUMN IF EXISTS is_anonymous;

  -- Recreate the column with NOT NULL constraint and default
  ALTER TABLE posts ADD COLUMN is_anonymous BOOLEAN NOT NULL DEFAULT false;
END $$;

-- Create or replace the function to set anonymous user context
CREATE OR REPLACE FUNCTION set_anonymous_user(anonymous_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Set the anonymous user ID in the current transaction
  PERFORM set_config('app.current_anonymous_user', anonymous_user_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read posts" ON posts;
DROP POLICY IF EXISTS "Users can create posts" ON posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;

-- Recreate policies with proper anonymous handling
CREATE POLICY "Anyone can read posts"
  ON posts FOR SELECT
  USING (true);

CREATE POLICY "Users can create posts"
  ON posts FOR INSERT
  WITH CHECK (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN 
        auth.uid() = user_id
      WHEN current_setting('app.current_anonymous_user', true) IS NOT NULL THEN 
        user_id::text = current_setting('app.current_anonymous_user', true)
      ELSE 
        false
    END
  );

CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE
  USING (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN 
        auth.uid() = user_id
      WHEN current_setting('app.current_anonymous_user', true) IS NOT NULL THEN 
        user_id::text = current_setting('app.current_anonymous_user', true)
      ELSE 
        false
    END
  );

CREATE POLICY "Users can delete their own posts"
  ON posts FOR DELETE
  USING (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN 
        auth.uid() = user_id
      WHEN current_setting('app.current_anonymous_user', true) IS NOT NULL THEN 
        user_id::text = current_setting('app.current_anonymous_user', true)
      ELSE 
        false
    END
  );

-- Force a schema cache refresh
SELECT pg_notify('pgrst', 'reload schema');