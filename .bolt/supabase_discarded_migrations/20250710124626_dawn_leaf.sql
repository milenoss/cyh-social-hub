/*
  # Fix Challenge Participation Tracking

  1. Changes
     - Fix the check_in_challenge function to properly handle user check-ins
     - Ensure proper progress calculation based on challenge duration
     - Store check-in notes correctly as JSONB
     - Update participant status when challenge is completed
     - Update user profile stats when challenges are completed

  2. Security
     - Maintain security by using auth.uid() for user identification
     - Ensure proper error handling and validation
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.check_in_challenge;

-- Create the fixed function with proper column references
CREATE OR REPLACE FUNCTION public.check_in_challenge(
  challenge_id_param UUID,
  note_text TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  participation_record RECORD;
  challenge_record RECORD;
  progress_increment NUMERIC;
  new_progress NUMERIC;
  new_status TEXT;
  today_date DATE := CURRENT_DATE;
  check_in_notes JSONB;
  result JSONB;
BEGIN
  -- Verify the user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Authentication required'
    );
  END IF;

  -- Get the challenge details
  SELECT * INTO challenge_record
  FROM challenges
  WHERE id = challenge_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Challenge not found'
    );
  END IF;
  
  -- Get the participation record with explicit table alias
  SELECT cp.* INTO participation_record
  FROM challenge_participants cp
  WHERE cp.challenge_id = challenge_id_param
  AND cp.user_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You are not participating in this challenge'
    );
  END IF;
  
  -- Check if already checked in today
  IF participation_record.last_check_in IS NOT NULL AND 
     DATE(participation_record.last_check_in) = today_date THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Already checked in today',
      'participation', to_jsonb(participation_record)
    );
  END IF;
  
  -- Calculate progress increment based on challenge duration
  progress_increment := LEAST(100.0 / challenge_record.duration_days, 100.0);
  
  -- Calculate new progress
  new_progress := LEAST(participation_record.progress + progress_increment, 100.0);
  
  -- Determine if challenge is completed
  IF new_progress >= 100.0 THEN
    new_status := 'completed';
  ELSE
    new_status := participation_record.status;
  END IF;
  
  -- Prepare check-in note
  IF note_text IS NOT NULL THEN
    -- Get existing notes or initialize empty array
    check_in_notes := COALESCE(participation_record.check_in_notes, '[]'::jsonb);
    
    -- Add new note
    check_in_notes := check_in_notes || jsonb_build_object(
      'date', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'note', note_text
    );
  ELSE
    check_in_notes := participation_record.check_in_notes;
  END IF;
  
  -- Update the participation record with explicit table alias
  UPDATE challenge_participants cp
  SET 
    progress = new_progress,
    status = new_status,
    last_check_in = now(),
    check_in_streak = COALESCE(cp.check_in_streak, 0) + 1,
    check_in_notes = check_in_notes,
    completed_at = CASE WHEN new_status = 'completed' AND cp.completed_at IS NULL 
                        THEN now() 
                        ELSE cp.completed_at 
                   END
  WHERE cp.challenge_id = challenge_id_param
  AND cp.user_id = auth.uid()
  RETURNING * INTO participation_record;
  
  -- If challenge is completed, update user stats
  IF new_status = 'completed' AND participation_record.status = 'completed' THEN
    -- Update profile stats
    UPDATE profiles p
    SET 
      challenges_completed = COALESCE(p.challenges_completed, 0) + 1,
      total_points = COALESCE(p.total_points, 0) + COALESCE(challenge_record.points_reward, 100),
      current_streak = COALESCE(p.current_streak, 0) + 1,
      longest_streak = GREATEST(COALESCE(p.longest_streak, 0), COALESCE(p.current_streak, 0) + 1)
    WHERE p.user_id = auth.uid();
  END IF;
  
  -- Return success response with updated participation
  RETURN jsonb_build_object(
    'success', true,
    'message', CASE 
                WHEN new_status = 'completed' THEN 'Challenge completed! Congratulations!'
                ELSE 'Check-in successful'
               END,
    'participation', to_jsonb(participation_record)
  );
END;
$$;

-- Ensure the challenge_participants table has the necessary columns
DO $$ 
BEGIN
  -- Add check_in_notes column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'challenge_participants' AND column_name = 'check_in_notes'
  ) THEN
    ALTER TABLE challenge_participants ADD COLUMN check_in_notes JSONB DEFAULT '[]'::jsonb;
  END IF;
  
  -- Add check_in_streak column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'challenge_participants' AND column_name = 'check_in_streak'
  ) THEN
    ALTER TABLE challenge_participants ADD COLUMN check_in_streak INTEGER DEFAULT 0;
  END IF;
  
  -- Add last_check_in column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'challenge_participants' AND column_name = 'last_check_in'
  ) THEN
    ALTER TABLE challenge_participants ADD COLUMN last_check_in TIMESTAMPTZ;
  END IF;
END $$;