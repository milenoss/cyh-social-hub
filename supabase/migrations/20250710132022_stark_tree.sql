/*
# Fix Check-in Notes Display

1. Changes
   - Standardize check_in_notes format to ensure consistent structure
   - Add function to properly format check-in notes for display
   - Fix ambiguous column references in check_in_challenge function

2. Security
   - Maintain existing RLS policies
   - Functions use SECURITY DEFINER to ensure proper access control
*/

-- Function to standardize check-in notes format
CREATE OR REPLACE FUNCTION format_check_in_notes(
  notes_param JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result JSONB := '[]'::jsonb;
  note_item JSONB;
  formatted_item JSONB;
BEGIN
  -- If null, return empty array
  IF notes_param IS NULL THEN
    RETURN result;
  END IF;
  
  -- If not an array, try to convert or return empty array
  IF jsonb_typeof(notes_param) != 'array' THEN
    -- If it's an object, wrap it in an array
    IF jsonb_typeof(notes_param) = 'object' THEN
      RETURN jsonb_build_array(notes_param);
    ELSE
      RETURN result;
    END IF;
  END IF;
  
  -- Process each note in the array
  FOR note_item IN SELECT * FROM jsonb_array_elements(notes_param)
  LOOP
    -- Create a standardized note object
    formatted_item := jsonb_build_object(
      'date', COALESCE(note_item->>'date', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
      'note', COALESCE(note_item->>'note', note_item->>'notes', note_item->>'content', '')
    );
    
    -- Add to result array
    result := result || formatted_item;
  END LOOP;
  
  RETURN result;
END;
$$;

-- Drop existing function to recreate with fixes
DROP FUNCTION IF EXISTS check_in_challenge(UUID, TEXT);

-- Recreate check_in_challenge function with fixes for ambiguous column references
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
  participant_notes JSONB;
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
  
  -- Prepare check-in notes - use a separate variable to avoid ambiguous column reference
  participant_notes := COALESCE(participant_record.check_in_notes, '[]'::jsonb);
  
  IF note_text IS NOT NULL THEN
    participant_notes := participant_notes || jsonb_build_object(
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
    check_in_notes = participant_notes,
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
      challenges_completed = COALESCE(challenges_completed, 0) + 1,
      total_points = COALESCE(total_points, 0) + COALESCE(challenge_record.points_reward, 0),
      current_streak = GREATEST(COALESCE(current_streak, 0), current_streak),
      longest_streak = GREATEST(COALESCE(longest_streak, 0), current_streak)
    WHERE user_id = auth.uid();
  END IF;
  
  -- Build result
  result := json_build_object(
    'success', true,
    'participation', json_build_object(
      'progress', new_progress,
      'status', CASE WHEN new_progress >= 100 THEN 'completed' ELSE 'active' END,
      'last_check_in', NOW(),
      'check_in_streak', current_streak,
      'check_in_notes', participant_notes
    )
  );
  
  RETURN result;
END;
$$;

-- Drop existing function to recreate with fixes
DROP FUNCTION IF EXISTS get_challenge_history(UUID);

-- Recreate get_challenge_history function with improved notes handling
CREATE OR REPLACE FUNCTION get_challenge_history(
  challenge_id_param UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  participation_record RECORD;
  formatted_notes JSONB;
  result JSON;
BEGIN
  -- Get the participant record
  SELECT * INTO participation_record
  FROM challenge_participants
  WHERE challenge_id = challenge_id_param 
    AND user_id = auth.uid();

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User is not participating in this challenge'
    );
  END IF;

  -- Format check-in notes for consistent display
  formatted_notes := format_check_in_notes(participation_record.check_in_notes);

  -- Build result
  result := json_build_object(
    'success', true,
    'participation', row_to_json(participation_record),
    'history', formatted_notes
  );

  RETURN result;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION check_in_challenge(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_challenge_history(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION format_check_in_notes(JSONB) TO authenticated;

-- Update existing check-in notes to ensure consistent format
UPDATE challenge_participants
SET check_in_notes = format_check_in_notes(check_in_notes)
WHERE check_in_notes IS NOT NULL;