/*
  # Fix ambiguous column reference in check_in_challenge function

  1. Function Updates
    - Update `check_in_challenge` function to explicitly qualify column references
    - Resolve ambiguity between function parameters and table columns

  2. Changes Made
    - Explicitly reference `challenge_participants.check_in_notes` instead of just `check_in_notes`
    - Ensure all column references are properly qualified with table aliases
*/

-- Drop the existing function first
DROP FUNCTION IF EXISTS check_in_challenge(uuid, text);

-- Recreate the function with proper column qualification
CREATE OR REPLACE FUNCTION check_in_challenge(
  p_challenge_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_participant_record record;
  v_challenge_record record;
  v_new_streak integer;
  v_updated_notes jsonb;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get challenge details
  SELECT * INTO v_challenge_record
  FROM challenges c
  WHERE c.id = p_challenge_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;

  -- Get participant record
  SELECT * INTO v_participant_record
  FROM challenge_participants cp
  WHERE cp.challenge_id = p_challenge_id 
    AND cp.user_id = v_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User is not participating in this challenge';
  END IF;

  -- Check if user already checked in today
  IF v_participant_record.last_check_in IS NOT NULL 
     AND DATE(v_participant_record.last_check_in) = CURRENT_DATE THEN
    RAISE EXCEPTION 'Already checked in today';
  END IF;

  -- Calculate new streak
  IF v_participant_record.last_check_in IS NULL 
     OR DATE(v_participant_record.last_check_in) < CURRENT_DATE - INTERVAL '1 day' THEN
    -- First check-in or streak broken
    v_new_streak := 1;
  ELSIF DATE(v_participant_record.last_check_in) = CURRENT_DATE - INTERVAL '1 day' THEN
    -- Consecutive day
    v_new_streak := COALESCE(v_participant_record.check_in_streak, 0) + 1;
  ELSE
    -- Same day (shouldn't happen due to check above)
    v_new_streak := COALESCE(v_participant_record.check_in_streak, 0);
  END IF;

  -- Update notes array if notes provided
  IF p_notes IS NOT NULL THEN
    v_updated_notes := COALESCE(v_participant_record.check_in_notes, '[]'::jsonb) || 
                      jsonb_build_object(
                        'date', CURRENT_DATE,
                        'notes', p_notes,
                        'timestamp', NOW()
                      );
  ELSE
    v_updated_notes := v_participant_record.check_in_notes;
  END IF;

  -- Update participant record with explicit table qualification
  UPDATE challenge_participants cp
  SET 
    last_check_in = NOW(),
    check_in_streak = v_new_streak,
    check_in_notes = v_updated_notes,
    progress = LEAST(100, GREATEST(0, 
      ROUND((v_new_streak::float / v_challenge_record.duration_days::float) * 100)
    ))
  WHERE cp.challenge_id = p_challenge_id 
    AND cp.user_id = v_user_id;

  -- Update profile stats
  UPDATE profiles p
  SET 
    current_streak = (
      SELECT MAX(cp2.check_in_streak) 
      FROM challenge_participants cp2 
      WHERE cp2.user_id = v_user_id 
        AND cp2.status = 'active'
    ),
    longest_streak = GREATEST(
      COALESCE(p.longest_streak, 0), 
      v_new_streak
    )
  WHERE p.user_id = v_user_id;

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'streak', v_new_streak,
    'progress', LEAST(100, GREATEST(0, 
      ROUND((v_new_streak::float / v_challenge_record.duration_days::float) * 100)
    )),
    'message', 'Check-in successful!'
  );
END;
$$;