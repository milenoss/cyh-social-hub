/*
  # Create Challenge Management Functions

  1. Functions
    - `check_in_challenge` - Handle daily check-ins for challenges
    - `get_challenge_history` - Get challenge participation history

  2. Security
    - Functions use RLS policies for data access
    - Only authenticated users can call functions
*/

-- Function to handle challenge check-ins
CREATE OR REPLACE FUNCTION public.check_in_challenge(
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

  -- Update the participation record
  UPDATE challenge_participants
  SET 
    progress = new_progress,
    status = new_status,
    last_check_in = NOW(),
    check_in_streak = new_streak,
    check_in_notes = CASE 
      WHEN note_text IS NOT NULL THEN
        COALESCE(check_in_notes, '[]'::jsonb) || 
        json_build_object('date', today_date, 'note', note_text)::jsonb
      ELSE
        check_in_notes
    END,
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
CREATE OR REPLACE FUNCTION public.get_challenge_history(
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