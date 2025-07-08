/*
  # Create challenges system

  1. New Tables
    - `challenges`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `description` (text, required)
      - `difficulty` (text, enum-like)
      - `category` (text, required)
      - `duration_days` (integer, required)
      - `points_reward` (integer, default 0)
      - `tags` (text array)
      - `created_by` (uuid, foreign key to profiles)
      - `is_public` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `challenge_participants`
      - `id` (uuid, primary key)
      - `challenge_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key)
      - `status` (text, enum-like)
      - `progress` (integer, 0-100)
      - `started_at` (timestamp)
      - `completed_at` (timestamp, nullable)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for CRUD operations
    - Users can create, read, update their own challenges
    - Public challenges are readable by everyone
    - Users can join/leave challenges
*/

-- Create challenges table
CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'extreme')),
  category text NOT NULL,
  duration_days integer NOT NULL DEFAULT 30,
  points_reward integer DEFAULT 0,
  tags text[] DEFAULT '{}',
  created_by uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create challenge_participants table
CREATE TABLE IF NOT EXISTS challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

-- Enable RLS
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;

-- Challenges policies
CREATE POLICY "Public challenges are viewable by everyone"
  ON challenges
  FOR SELECT
  TO public
  USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create challenges"
  ON challenges
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own challenges"
  ON challenges
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own challenges"
  ON challenges
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Challenge participants policies
CREATE POLICY "Users can view their own participations"
  ON challenge_participants
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can join challenges"
  ON challenge_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own participation"
  ON challenge_participants
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave challenges"
  ON challenge_participants
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_challenges_created_by ON challenges(created_by);
CREATE INDEX IF NOT EXISTS idx_challenges_category ON challenges(category);
CREATE INDEX IF NOT EXISTS idx_challenges_difficulty ON challenges(difficulty);
CREATE INDEX IF NOT EXISTS idx_challenges_is_public ON challenges(is_public);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user_id ON challenge_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge_id ON challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_status ON challenge_participants(status);

-- Create updated_at trigger for challenges
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_challenges_updated_at
    BEFORE UPDATE ON challenges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();