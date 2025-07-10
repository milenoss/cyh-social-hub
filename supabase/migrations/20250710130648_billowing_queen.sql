/*
  # Fix check_in_challenge function return type

  1. Changes
    - Drop existing check_in_challenge function
    - Recreate check_in_challenge function with JSON return type
    - Grant execute permission to authenticated users
*/

-- Drop the existing function first to avoid the return type error
DROP FUNCTION IF EXISTS check_in_challenge(UUID, TEXT);

-- Recreate the function with the correct return type
CREATE OR REPLACE FUNCTION check_in_challenge(
  challenge_id_param UUID,
  note_text TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  participant_record RECORD;
  challenge_record RECORD;
  days_since_start INTEGER;
  new_progress INTEGER;
  current_streak INTEGER;
  last_check_in_date DATE;
  today_date DATE;
  check_in_notes JSONB;
  result JSON;
BEGIN
  -- Get current date
  today_date := CURRENT_DATE;
  
  -- Get the participant record
  SELECT * INTO participant_record
  FROM challenge_participants
  WHERE challenge_id = challenge_id_param 
    AND user_id = auth.uid()
    AND status = 'active';
  
  -- Check if participant exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'You are not an active participant in this challenge'
    );
  END IF;
  
  -- Get challenge details
  SELECT * INTO challenge_record
  FROM challenges
  WHERE id = challenge_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Challenge not found'
    );
  END IF;
  
  -- Check if already checked in today
  IF participant_record.last_check_in IS NOT NULL THEN
    last_check_in_date := DATE(participant_record.last_check_in);
    IF last_check_in_date = today_date THEN
      RETURN json_build_object(
        'success', false,
        'message', 'Already checked in today'
      );
    END IF;
  END IF;
  
  -- Calculate days since start
  days_since_start := DATE(NOW()) - DATE(participant_record.started_at) + 1;
  
  -- Calculate new progress (percentage based on days completed vs total duration)
  new_progress := LEAST(100, ROUND((days_since_start::FLOAT / challenge_record.duration_days::FLOAT) * 100));
  
  -- Calculate streak
  IF participant_record.last_check_in IS NULL THEN
    -- First check-in
    current_streak := 1;
  ELSIF last_check_in_date = today_date - INTERVAL '1 day' THEN
    -- Consecutive day
    current_streak := participant_record.check_in_streak + 1;
  ELSE
    -- Streak broken, reset to 1
    current_streak := 1;
  END IF;
  
  -- Prepare check-in notes
  check_in_notes := COALESCE(participant_record.check_in_notes, '[]'::jsonb);
  IF note_text IS NOT NULL THEN
    check_in_notes := check_in_notes || jsonb_build_object(
      'date', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'note', note_text,
      'progress', new_progress
    );
  END IF;
  
  -- Update the participant record
  UPDATE challenge_participants
  SET 
    progress = new_progress,
    last_check_in = NOW(),
    check_in_streak = current_streak,
    check_in_notes = check_in_notes,
    status = CASE 
      WHEN new_progress >= 100 THEN 'completed'
      ELSE 'active'
    END,
    completed_at = CASE 
      WHEN new_progress >= 100 AND completed_at IS NULL THEN NOW()
      ELSE completed_at
    END
  WHERE id = participant_record.id
  RETURNING * INTO participant_record;
  
  -- If challenge is completed, update profile stats
  IF new_progress >= 100 AND participant_record.status = 'completed' THEN
    UPDATE profiles
    SET 
      challenges_completed = COALESCE(challenges_completed, 0) + 1,
      total_points = COALESCE(total_points, 0) + COALESCE(challenge_record.points_reward, 0),
      current_streak = COALESCE(current_streak, 0) + 1,
      longest_streak = GREATEST(COALESCE(longest_streak, 0), COALESCE(current_streak, 0) + 1)
    WHERE user_id = auth.uid();
  END IF;
  
  -- Build result
  result := json_build_object(
    'success', true,
    'message', CASE 
                WHEN new_progress >= 100 THEN 'Challenge completed! Congratulations!'
                ELSE 'Check-in successful'
               END,
    'participation', to_json(participant_record)
  );
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_in_challenge(UUID, TEXT) TO authenticated;