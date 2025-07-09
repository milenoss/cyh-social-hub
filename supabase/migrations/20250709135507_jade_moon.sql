/*
  # Challenge System

  1. New Tables
    - `challenges` - Challenge definitions and metadata
    - `challenge_participants` - User participation in challenges
  
  2. Security
    - Enable RLS on all tables
    - Add policies for proper data access
*/

-- Create challenges table
CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty = ANY (ARRAY['easy', 'medium', 'hard', 'extreme'])),
  category text NOT NULL,
  duration_days integer NOT NULL DEFAULT 30,
  points_reward integer DEFAULT 0,
  tags text[] DEFAULT '{}'::text[],
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
  status text NOT NULL DEFAULT 'active' CHECK (status = ANY (ARRAY['active', 'completed', 'abandoned'])),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

-- Enable RLS on challenges
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Enable RLS on challenge_participants
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;

-- Create challenges update trigger
CREATE TRIGGER update_challenges_updated_at
BEFORE UPDATE ON challenges
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies for challenges
CREATE POLICY "Public challenges are viewable by everyone" 
ON challenges 
FOR SELECT 
TO public 
USING ((is_public = true) OR (created_by = auth.uid()));

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

-- Create RLS policies for challenge_participants
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

CREATE POLICY "Users can view their own participations" 
ON challenge_participants 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_challenges_created_by ON challenges(created_by);
CREATE INDEX idx_challenges_category ON challenges(category);
CREATE INDEX idx_challenges_difficulty ON challenges(difficulty);
CREATE INDEX idx_challenges_is_public ON challenges(is_public);

CREATE INDEX idx_challenge_participants_user_id ON challenge_participants(user_id);
CREATE INDEX idx_challenge_participants_challenge_id ON challenge_participants(challenge_id);
CREATE INDEX idx_challenge_participants_status ON challenge_participants(status);