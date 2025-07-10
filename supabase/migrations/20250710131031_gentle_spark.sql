/*
  # Fix ambiguous column reference in check_in_challenge function

  1. Function Updates
    - Fix ambiguous reference to `check_in_notes` column
    - Properly qualify column references with table aliases
    - Ensure function works correctly with challenge participation

  2. Security
    - Maintain existing RLS policies
    - Preserve function security context
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS check_in_challenge(uuid, text);

-- Recreate the function with proper column qualification
CREATE OR REPLACE FUNCTION check_in_challenge(
  p_challenge_id uuid,
  p_note text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participant_record challenge_participants%ROWTYPE;
  v_new_notes jsonb;
  v_today date;
  v_last_check_in_date date;
  v_new_streak integer;
BEGIN
  -- Get current date
  v_today := CURRENT_DATE;
  
  -- Get the participant record
  SELECT cp.* INTO v_participant_record
  FROM challenge_participants cp
  WHERE cp.challenge_id = p_challenge_id 
    AND cp.user_id = auth.uid()
    AND cp.status = 'active';
  
  -- Check if participant exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You are not an active participant in this challenge'
    );
  END IF;
  
  -- Check if already checked in today
  IF v_participant_record.last_check_in::date = v_today THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You have already checked in today'
    );
  END IF;
  
  -- Calculate new streak
  v_last_check_in_date := v_participant_record.last_check_in::date;
  
  IF v_last_check_in_date IS NULL THEN
    -- First check-in
    v_new_streak := 1;
  ELSIF v_last_check_in_date = v_today - INTERVAL '1 day' THEN
    -- Consecutive day
    v_new_streak := COALESCE(v_participant_record.check_in_streak, 0) + 1;
  ELSE
    -- Streak broken
    v_new_streak := 1;
  END IF;
  
  -- Prepare new notes array (qualify with table alias to avoid ambiguity)
  v_new_notes := COALESCE(v_participant_record.check_in_notes, '[]'::jsonb);
  
  -- Add new note if provided
  IF p_note IS NOT NULL AND p_note != '' THEN
    v_new_notes := v_new_notes || jsonb_build_array(
      jsonb_build_object(
        'date', v_today,
        'note', p_note,
        'created_at', NOW()
      )
    );
  END IF;
  
  -- Update the participant record
  UPDATE challenge_participants cp
  SET 
    last_check_in = NOW(),
    check_in_streak = v_new_streak,
    check_in_notes = v_new_notes,
    progress = LEAST(100, GREATEST(cp.progress, 
      ROUND((v_new_streak::float / 
        (SELECT duration_days FROM challenges WHERE id = p_challenge_id)) * 100)
    ))
  WHERE cp.challenge_id = p_challenge_id 
    AND cp.user_id = auth.uid();
  
  -- Update profile stats if this is a new streak record
  IF v_new_streak > (
    SELECT COALESCE(current_streak, 0) 
    FROM profiles 
    WHERE user_id = auth.uid()
  ) THEN
    UPDATE profiles 
    SET 
      current_streak = v_new_streak,
      longest_streak = GREATEST(COALESCE(longest_streak, 0), v_new_streak)
    WHERE user_id = auth.uid();
  END IF;
  
  -- Return success response
  RETURN json_build_object(
    'success', true,
    'streak', v_new_streak,
    'progress', (
      SELECT progress 
      FROM challenge_participants cp
      WHERE cp.challenge_id = p_challenge_id 
        AND cp.user_id = auth.uid()
    )
  );
END;
$$;