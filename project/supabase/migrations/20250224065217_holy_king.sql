/*
  # Create Posts Table with Enhanced Error Handling and Logging

  1. New Tables
    - `posts`
      - `id` (uuid, primary key, auto-generated)
      - `title` (text, required)
      - `body` (text, required)
      - `user_id` (uuid, required, references auth.users)
      - `created_at` (timestamptz, auto-generated)

  2. Security
    - Enable Row Level Security (RLS)
    - Policies for CRUD operations
    - All operations require authentication

  3. Notes
    - Enhanced error handling and logging
    - Safe migration with rollback capability
    - Proper constraints and checks
*/

DO $$ 
DECLARE
  table_exists boolean;
  v_schema_name text := 'public';
  v_table_name text := 'posts';
BEGIN
  -- Log migration start
  RAISE NOTICE 'Starting migration for table %.%', v_schema_name, v_table_name;

  -- Check if schema exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = v_schema_name
  ) THEN
    RAISE NOTICE 'Schema % does not exist. Creating...', v_schema_name;
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', v_schema_name);
  END IF;

  -- Check if table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = v_schema_name 
    AND table_name = v_table_name
  ) INTO table_exists;

  IF table_exists THEN
    RAISE NOTICE 'Table %.% already exists', v_schema_name, v_table_name;
  ELSE
    RAISE NOTICE 'Creating table %.%', v_schema_name, v_table_name;

    -- Create the posts table
    CREATE TABLE public.posts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL CHECK (char_length(title) > 0 AND char_length(title) <= 100),
      body text NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 500),
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    RAISE NOTICE 'Table %.% created successfully', v_schema_name, v_table_name;

    -- Create indexes
    CREATE INDEX IF NOT EXISTS posts_user_id_idx ON public.posts(user_id);
    CREATE INDEX IF NOT EXISTS posts_created_at_idx ON public.posts(created_at DESC);

    RAISE NOTICE 'Indexes created successfully';

    -- Enable RLS
    ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

    RAISE NOTICE 'RLS enabled successfully';

    -- Create policies
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
        
        RAISE NOTICE 'Read policy created';
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
        
        RAISE NOTICE 'Create policy created';
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
        
        RAISE NOTICE 'Update policy created';
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
        
        RAISE NOTICE 'Delete policy created';
      END IF;
    END $policies$;

    -- Verify table creation
    IF EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = v_schema_name 
      AND table_name = v_table_name
    ) THEN
      RAISE NOTICE 'Migration completed successfully';
    ELSE
      RAISE EXCEPTION 'Table creation failed';
    END IF;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error during migration: %', SQLERRM;
    RAISE;
END $$;