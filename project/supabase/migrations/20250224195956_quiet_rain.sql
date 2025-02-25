/*
  # Final schema fix for posts table

  1. Changes
    - Drop and recreate posts table with all required columns
    - Add proper indexes and constraints
    - Create anonymous user function
    - Set up RLS policies
    - Force schema cache refresh

  2. Security
    - Enable RLS
    - Add policies for both authenticated and anonymous users
    - Secure anonymous user context
*/

-- First, drop all related objects to ensure a clean slate
DROP TABLE IF EXISTS posts CASCADE;
DROP FUNCTION IF EXISTS set_anonymous_user(UUID);

-- Create the posts table with all required columns
CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) > 0 AND char_length(title) <= 100),
  body text NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 500),
  user_id uuid NOT NULL,
  is_anonymous boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX posts_user_id_idx ON posts(user_id);
CREATE INDEX posts_created_at_idx ON posts(created_at DESC);
CREATE INDEX posts_is_anonymous_idx ON posts(is_anonymous);

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create function to handle anonymous user context
CREATE OR REPLACE FUNCTION set_anonymous_user(anonymous_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Set the anonymous user ID in the current transaction
  PERFORM set_config('app.current_anonymous_user', anonymous_user_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies
CREATE POLICY "Anyone can read posts"
  ON posts FOR SELECT
  USING (true);

CREATE POLICY "Users can create posts"
  ON posts FOR INSERT
  WITH CHECK (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN 
        auth.uid() = user_id AND NOT is_anonymous
      WHEN current_setting('app.current_anonymous_user', true) IS NOT NULL THEN 
        user_id::text = current_setting('app.current_anonymous_user', true) AND is_anonymous
      ELSE 
        false
    END
  );

CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE
  USING (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN 
        auth.uid() = user_id AND NOT is_anonymous
      WHEN current_setting('app.current_anonymous_user', true) IS NOT NULL THEN 
        user_id::text = current_setting('app.current_anonymous_user', true) AND is_anonymous
      ELSE 
        false
    END
  );

CREATE POLICY "Users can delete their own posts"
  ON posts FOR DELETE
  USING (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN 
        auth.uid() = user_id AND NOT is_anonymous
      WHEN current_setting('app.current_anonymous_user', true) IS NOT NULL THEN 
        user_id::text = current_setting('app.current_anonymous_user', true) AND is_anonymous
      ELSE 
        false
    END
  );

-- Force schema cache refresh
DO $$ 
BEGIN
  -- Notify PostgREST to reload its schema cache
  PERFORM pg_notify('pgrst', 'reload schema');
  
  -- Wait a moment to ensure the notification is processed
  PERFORM pg_sleep(1);
  
  -- Verify the column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'posts' 
    AND column_name = 'is_anonymous'
  ) THEN
    RAISE EXCEPTION 'is_anonymous column was not created successfully';
  END IF;
END $$;