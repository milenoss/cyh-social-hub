/*
  # Add Challenge System

  1. New Tables
    - `challenges` - Challenge definitions and metadata
    - `challenge_participants` - User participation tracking

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Add policies for challenge creators

  3. Relationships
    - Challenges created by profiles
    - Challenge participants linked to profiles and challenges
*/

-- Create challenges table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'extreme')),
  category TEXT NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 30,
  points_reward INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}'::TEXT[],
  created_by UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on challenges
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Create challenge participants table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

-- Enable RLS on challenge participants
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_challenges_created_by ON public.challenges(created_by);
CREATE INDEX IF NOT EXISTS idx_challenges_category ON public.challenges(category);
CREATE INDEX IF NOT EXISTS idx_challenges_difficulty ON public.challenges(difficulty);
CREATE INDEX IF NOT EXISTS idx_challenges_is_public ON public.challenges(is_public);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge_id ON public.challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user_id ON public.challenge_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_status ON public.challenge_participants(status);

-- Create trigger for automatic timestamp updates on challenges
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'update_challenges_updated_at') THEN
    CREATE TRIGGER update_challenges_updated_at
      BEFORE UPDATE ON public.challenges
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Create RLS policies for challenges
CREATE POLICY "Public challenges are viewable by everyone" 
ON public.challenges 
FOR SELECT 
USING ((is_public = true) OR (created_by = auth.uid()));

CREATE POLICY "Users can create challenges" 
ON public.challenges 
FOR INSERT 
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own challenges" 
ON public.challenges 
FOR UPDATE 
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own challenges" 
ON public.challenges 
FOR DELETE 
TO authenticated
USING (created_by = auth.uid());

-- Create RLS policies for challenge participants
CREATE POLICY "Users can view their own participations" 
ON public.challenge_participants 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can join challenges" 
ON public.challenge_participants 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own participation" 
ON public.challenge_participants 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave challenges" 
ON public.challenge_participants 
FOR DELETE 
TO authenticated
USING (user_id = auth.uid());