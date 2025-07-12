/*
  # Create check_in_challenge RPC function

  1. New Functions
    - `check_in_challenge(challenge_id_param, note_text)`
      - Handles daily check-ins for challenge participants
      - Updates progress, streak, and check-in status
      - Prevents multiple check-ins per day
      - Returns success status and updated participation data

  2. Function Logic
    - Validates user participation in the challenge
    - Checks if user already checked in today
    - Updates progress based on challenge duration
    - Manages check-in streaks
    - Stores optional check-in notes
    - Marks challenge as completed when progress reaches 100%

  3. Return Format
    - Returns JSON object with success boolean
    - Includes updated participation data on success
    - Returns error message if already checked in or other issues
*/

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
  check_in_notes := participant_record.check_in_notes;
  IF note_text IS NOT NULL THEN
    check_in_notes := check_in_notes || jsonb_build_array(
      jsonb_build_object(
        'date', today_date,
        'note', note_text,
        'progress', new_progress
      )
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
  WHERE id = participant_record.id;
  
  -- If challenge is completed, update profile stats
  IF new_progress >= 100 AND participant_record.progress < 100 THEN
    UPDATE profiles
    SET 
      challenges_completed = challenges_completed + 1,
      total_points = total_points + COALESCE(challenge_record.points_reward, 0),
      current_streak = CASE 
        WHEN current_streak > current_streak THEN current_streak
        ELSE current_streak
      END,
      longest_streak = CASE 
        WHEN current_streak > longest_streak THEN current_streak
        ELSE longest_streak
      END
    WHERE user_id = auth.uid();
  END IF;
  
  -- Build result
  result := json_build_object(
    'success', true,
    'participation', json_build_object(
      'progress', new_progress,
      'status', CASE WHEN new_progress >= 100 THEN 'completed' ELSE 'active' END,
      'last_check_in', NOW(),
      'check_in_streak', current_streak
    )
  );
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_in_challenge(UUID, TEXT) TO authenticated;