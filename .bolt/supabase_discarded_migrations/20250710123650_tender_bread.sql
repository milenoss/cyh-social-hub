/*
  # Fix check_in_challenge function

  1. Changes
    - Fix ambiguous user_id column reference in check_in_challenge function
    - Qualify user_id references with table aliases to avoid ambiguity
    - Ensure proper progress calculation and status updates
  
  2. Details
    - The original function had an ambiguous user_id column reference
    - This migration creates an improved version that properly qualifies column references
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
  
  -- Get the participation record
  SELECT * INTO participation_record
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
      'message', 'Already checked in today'
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
  
  -- Update the participation record
  UPDATE challenge_participants
  SET 
    progress = new_progress,
    status = new_status,
    last_check_in = now(),
    check_in_streak = participation_record.check_in_streak + 1,
    check_in_notes = check_in_notes,
    completed_at = CASE WHEN new_status = 'completed' AND participation_record.completed_at IS NULL 
                        THEN now() 
                        ELSE participation_record.completed_at 
                   END
  WHERE challenge_id = challenge_id_param
  AND user_id = auth.uid()
  RETURNING * INTO participation_record;
  
  -- If challenge is completed, update user stats
  IF new_status = 'completed' AND participation_record.status = 'completed' THEN
    -- Update profile stats
    UPDATE profiles
    SET 
      challenges_completed = challenges_completed + 1,
      total_points = total_points + COALESCE(challenge_record.points_reward, 100)
    WHERE user_id = auth.uid();
  END IF;
  
  -- Return success response with updated participation
  RETURN jsonb_build_object(
    'success', true,
    'message', CASE 
                WHEN new_status = 'completed' THEN 'Challenge completed!'
                ELSE 'Check-in successful'
               END,
    'participation', to_jsonb(participation_record)
  );
END;
$$;