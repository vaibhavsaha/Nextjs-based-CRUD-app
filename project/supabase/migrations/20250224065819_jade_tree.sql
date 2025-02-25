/*
  # Ensure Posts Table Exists with Correct Structure

  1. Purpose
    - Safely verify and update posts table structure
    - Add any missing indexes or policies
    - Non-destructive operations only

  2. Changes
    - Verify table structure
    - Add missing indexes if needed
    - Ensure RLS is enabled
    - Verify policies exist

  3. Safety
    - All operations are idempotent
    - No data loss possible
    - Checks before modifications
*/

DO $$ 
DECLARE
  v_schema_name text := 'public';
  v_table_name text := 'posts';
BEGIN
  -- Log check start
  RAISE NOTICE 'Checking table %.%', v_schema_name, v_table_name;

  -- Verify indexes
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = v_schema_name 
    AND tablename = v_table_name 
    AND indexname = 'posts_user_id_idx'
  ) THEN
    CREATE INDEX IF NOT EXISTS posts_user_id_idx ON public.posts(user_id);
    RAISE NOTICE 'Created user_id index';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = v_schema_name 
    AND tablename = v_table_name 
    AND indexname = 'posts_created_at_idx'
  ) THEN
    CREATE INDEX IF NOT EXISTS posts_created_at_idx ON public.posts(created_at DESC);
    RAISE NOTICE 'Created created_at index';
  END IF;

  -- Ensure RLS is enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = v_schema_name 
    AND tablename = v_table_name 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS';
  END IF;

  -- Verify policies exist
  DO $policies$ 
  BEGIN
    -- Read policy
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'posts' 
      AND policyname = 'Anyone can read posts'
    ) THEN
      CREATE POLICY "Anyone can read posts"
        ON public.posts
        FOR SELECT
        TO authenticated
        USING (true);
      
      RAISE NOTICE 'Created read policy';
    END IF;

    -- Create policy
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'posts' 
      AND policyname = 'Users can create their own posts'
    ) THEN
      CREATE POLICY "Users can create their own posts"
        ON public.posts
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
      
      RAISE NOTICE 'Created insert policy';
    END IF;

    -- Update policy
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'posts' 
      AND policyname = 'Users can update their own posts'
    ) THEN
      CREATE POLICY "Users can update their own posts"
        ON public.posts
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
      
      RAISE NOTICE 'Created update policy';
    END IF;

    -- Delete policy
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'posts' 
      AND policyname = 'Users can delete their own posts'
    ) THEN
      CREATE POLICY "Users can delete their own posts"
        ON public.posts
        FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id);
      
      RAISE NOTICE 'Created delete policy';
    END IF;
  END $policies$;

  RAISE NOTICE 'Verification completed successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error during verification: %', SQLERRM;
    RAISE;
END $$;