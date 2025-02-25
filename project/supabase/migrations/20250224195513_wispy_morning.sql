/*
  # Final schema fix for posts table

  1. Changes
    - Drop and recreate posts table with all columns
    - Recreate all policies
    - Force schema cache refresh
    - Add proper indexes

  2. Security
    - Maintain RLS policies
    - Add proper constraints
*/

-- Recreate the entire posts table to ensure clean schema
DROP TABLE IF EXISTS posts;

CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) > 0 AND char_length(title) <= 100),
  body text NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 500),
  user_id uuid NOT NULL,
  is_anonymous boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX posts_user_id_idx ON posts(user_id);
CREATE INDEX posts_created_at_idx ON posts(created_at DESC);

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create or replace the function to set anonymous user context
CREATE OR REPLACE FUNCTION set_anonymous_user(anonymous_user_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_anonymous_user', anonymous_user_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policies
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

-- Force schema cache refresh
SELECT pg_notify('pgrst', 'reload schema');