/*
  # Cleanup orphaned posts

  This migration will:
  1. List all posts and their user IDs
  2. Remove any posts that don't have a corresponding user in auth.users
  3. Add a trigger to prevent orphaned posts in the future
*/

-- First, let's see what posts we have
DO $$ 
BEGIN
  RAISE NOTICE 'Current posts in database:';
  FOR r IN (
    SELECT p.id, p.title, p.user_id, 
           EXISTS(SELECT 1 FROM auth.users u WHERE u.id = p.user_id) as has_valid_user
    FROM posts p
  ) LOOP
    RAISE NOTICE 'Post ID: %, Title: %, User ID: %, Valid User: %', 
      r.id, r.title, r.user_id, r.has_valid_user;
  END LOOP;
END $$;

-- Remove posts without valid users
DELETE FROM posts
WHERE user_id NOT IN (
  SELECT id FROM auth.users
);

-- Create a trigger to prevent future orphaned posts
CREATE OR REPLACE FUNCTION check_user_exists()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'User ID % does not exist in auth.users', NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_user_exists ON posts;
CREATE TRIGGER ensure_user_exists
  BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION check_user_exists();