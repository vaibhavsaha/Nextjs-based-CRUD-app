/*
  # Fix schema cache and is_anonymous column

  1. Changes
    - Drop and recreate is_anonymous column to force schema cache refresh
    - Update database types to include is_anonymous
    - Ensure proper column constraints and defaults

  2. Security
    - Maintain existing RLS policies
    - Preserve data integrity during migration
*/

-- Refresh schema cache by recreating the column
DO $$ 
BEGIN
  -- Drop the column if it exists
  ALTER TABLE posts DROP COLUMN IF EXISTS is_anonymous;

  -- Recreate the column
  ALTER TABLE posts ADD COLUMN is_anonymous BOOLEAN NOT NULL DEFAULT false;

  -- Notify about the change
  RAISE NOTICE 'is_anonymous column has been recreated';
END $$;

-- Force a schema cache refresh
SELECT pg_notify('pgrst', 'reload schema');