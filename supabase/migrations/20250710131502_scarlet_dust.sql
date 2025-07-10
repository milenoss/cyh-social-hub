/*
  # Challenge Functions

  1. New Functions
    - `check_in_challenge` - Handles daily check-ins for challenges
    - `get_challenge_history` - Retrieves challenge history for a user

  2. Security
    - Both functions are SECURITY DEFINER
    - Permissions granted to authenticated users
*/

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.check_in_challenge(UUID, TEXT);
DROP FUNCTION IF EXISTS public.get_challenge_history(UUID);

-- Function to handle challenge check-ins
CREATE FUNCTION public.check_in_challenge(
  challenge_id_param UUID,
  note_text TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id_val UUID;
  participation_record RECORD;
  today_date DATE;
  last_check_in_date DATE;
  new_progress INTEGER;
  new_streak INTEGER;
  new_status TEXT;
  challenge_duration INTEGER;
  result JSON;
  participant_notes JSONB;
BEGIN
  -- Get the current user ID
  user_id_val := auth.uid();
  
  IF user_id_val IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not authenticated'
    );
  END IF;

  -- Get today's date
  today_date := CURRENT_DATE;

  -- Get the participation record
  SELECT * INTO participation_record
  FROM challenge_participants
  WHERE challenge_id = challenge_id_param 
    AND user_id = user_id_val;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User is not participating in this challenge'
    );
  END IF;

  -- Check if already checked in today
  IF participation_record.last_check_in IS NOT NULL THEN
    last_check_in_date := participation_record.last_check_in::DATE;
    IF last_check_in_date = today_date THEN
      RETURN json_build_object(
        'success', false,
        'message', 'Already checked in today'
      );
    END IF;
  END IF;

  -- Get challenge duration
  SELECT duration_days INTO challenge_duration
  FROM challenges
  WHERE id = challenge_id_param;

  -- Calculate new progress (assuming daily check-ins)
  new_progress := LEAST(
    participation_record.progress + (100.0 / COALESCE(challenge_duration, 30))::INTEGER,
    100
  );

  -- Calculate streak
  IF participation_record.last_check_in IS NULL THEN
    new_streak := 1;
  ELSIF last_check_in_date = today_date - INTERVAL '1 day' THEN
    new_streak := participation_record.check_in_streak + 1;
  ELSE
    new_streak := 1; -- Reset streak if not consecutive
  END IF;

  -- Determine new status
  IF new_progress >= 100 THEN
    new_status := 'completed';
  ELSE
    new_status := 'active';
  END IF;

  -- Prepare notes
  participant_notes := COALESCE(participation_record.check_in_notes, '[]'::jsonb);
  IF note_text IS NOT NULL THEN
    participant_notes := participant_notes || 
      jsonb_build_object('date', today_date, 'note', note_text)::jsonb;
  END IF;

  -- Update the participation record
  UPDATE challenge_participants
  SET 
    progress = new_progress,
    status = new_status,
    last_check_in = NOW(),
    check_in_streak = new_streak,
    check_in_notes = participant_notes,
    completed_at = CASE 
      WHEN new_progress >= 100 AND completed_at IS NULL THEN NOW()
      ELSE completed_at
    END
  WHERE challenge_id = challenge_id_param 
    AND user_id = user_id_val;

  -- Build result
  result := json_build_object(
    'success', true,
    'participation', json_build_object(
      'progress', new_progress,
      'status', new_status,
      'last_check_in', NOW(),
      'check_in_streak', new_streak
    )
  );

  RETURN result;
END;
$$;

-- Function to get challenge history
CREATE FUNCTION public.get_challenge_history(
  challenge_id_param UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id_val UUID;
  participation_record RECORD;
  result JSON;
BEGIN
  -- Get the current user ID
  user_id_val := auth.uid();
  
  IF user_id_val IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not authenticated'
    );
  END IF;

  -- Get the participation record
  SELECT * INTO participation_record
  FROM challenge_participants
  WHERE challenge_id = challenge_id_param 
    AND user_id = user_id_val;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User is not participating in this challenge'
    );
  END IF;

  -- Build result
  result := json_build_object(
    'success', true,
    'participation', row_to_json(participation_record),
    'history', COALESCE(participation_record.check_in_notes, '[]'::jsonb)
  );

  RETURN result;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.check_in_challenge(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_challenge_history(UUID) TO authenticated;