/*
  # Fix check_in_challenge function

  1. Changes
     - Fix ambiguous column reference for user_id in check_in_challenge function
     - Properly qualify user_id with table alias to resolve ambiguity
     - Ensure check-in notes are properly stored and retrieved

  2. Security
     - Maintains existing security model
     - Function can only be executed by authenticated users
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS check_in_challenge;

-- Create the updated function with fixed column references
CREATE OR REPLACE FUNCTION check_in_challenge(
  challenge_id_param UUID,
  note_text TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  participant_record RECORD;
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

  -- Get the participant record
  SELECT * INTO participant_record
  FROM challenge_participants
  WHERE challenge_id = challenge_id_param
  AND challenge_participants.user_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You are not participating in this challenge'
    );
  END IF;

  -- Check if already checked in today
  IF participant_record.last_check_in IS NOT NULL AND 
     DATE(participant_record.last_check_in) = today_date THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Already checked in today',
      'participation', participant_record
    );
  END IF;

  -- Calculate progress increment based on challenge duration
  progress_increment := LEAST(100.0 / challenge_record.duration_days, 100.0);
  
  -- Calculate new progress
  new_progress := LEAST(participant_record.progress + progress_increment, 100.0);
  
  -- Determine if challenge is now completed
  IF new_progress >= 100.0 THEN
    new_status := 'completed';
  ELSE
    new_status := participant_record.status;
  END IF;

  -- Prepare check-in notes
  IF participant_record.check_in_notes IS NULL THEN
    check_in_notes := '[]'::jsonb;
  ELSE
    check_in_notes := participant_record.check_in_notes;
  END IF;

  -- Add new check-in note if provided
  IF note_text IS NOT NULL THEN
    check_in_notes := check_in_notes || jsonb_build_object(
      'date', CURRENT_TIMESTAMP,
      'note', note_text
    );
  END IF;

  -- Update the participant record
  UPDATE challenge_participants
  SET 
    progress = new_progress,
    status = new_status,
    last_check_in = CURRENT_TIMESTAMP,
    check_in_streak = COALESCE(participant_record.check_in_streak, 0) + 1,
    check_in_notes = check_in_notes,
    completed_at = CASE WHEN new_status = 'completed' AND participant_record.completed_at IS NULL 
                        THEN CURRENT_TIMESTAMP 
                        ELSE participant_record.completed_at 
                   END
  WHERE challenge_id = challenge_id_param
  AND challenge_participants.user_id = auth.uid()
  RETURNING * INTO participant_record;

  -- If challenge is completed, update user stats
  IF new_status = 'completed' AND participant_record.status = 'completed' THEN
    -- Update profile stats
    UPDATE profiles
    SET 
      challenges_completed = COALESCE(challenges_completed, 0) + 1,
      total_points = COALESCE(total_points, 0) + COALESCE(challenge_record.points_reward, 100)
    WHERE user_id = auth.uid();
  END IF;

  -- Return success response with updated participation record
  RETURN jsonb_build_object(
    'success', true,
    'message', CASE 
                WHEN new_status = 'completed' THEN 'Challenge completed! Congratulations!'
                ELSE 'Check-in successful'
               END,
    'participation', participant_record
  );
END;
$$;