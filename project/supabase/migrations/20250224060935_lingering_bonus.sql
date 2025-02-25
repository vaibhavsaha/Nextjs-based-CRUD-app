/*
  # Create posts table

  1. New Tables
    - `posts`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `body` (text, required)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamp with timezone)

  2. Security
    - Enable RLS on `posts` table
    - Add policies for CRUD operations
*/

CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Allow users to read all posts
CREATE POLICY "Anyone can read posts"
  ON posts
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to create their own posts
CREATE POLICY "Users can create their own posts"
  ON posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own posts
CREATE POLICY "Users can update their own posts"
  ON posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own posts
CREATE POLICY "Users can delete their own posts"
  ON posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);