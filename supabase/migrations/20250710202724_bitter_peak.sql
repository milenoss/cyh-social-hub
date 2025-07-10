/*
  # Fix get_real_challenge_participants function

  1. Database Function Updates
    - Fix GROUP BY clause issue in get_real_challenge_participants function
    - Ensure all selected columns are properly grouped or aggregated
    - Return participant data with proper structure for the frontend

  2. Function Returns
    - success: boolean indicating if the operation was successful
    - participants: array of participant objects with user profile data
    - total_count: total number of participants
    - active_count: number of active participants  
    - completed_count: number of completed participants
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_real_challenge_participants(uuid);

-- Create the corrected function
CREATE OR REPLACE FUNCTION get_real_challenge_participants(challenge_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  participants_data jsonb[];
  total_participants integer;
  active_participants integer;
  completed_participants integer;
BEGIN
  -- Get participant data with proper joins and no GROUP BY issues
  SELECT array_agg(
    jsonb_build_object(
      'id', cp.id,
      'user_id', cp.user_id,
      'username', COALESCE(p.username, 'user_' || substr(cp.user_id::text, 1, 8)),
      'display_name', COALESCE(p.display_name, p.username, 'Anonymous User'),
      'avatar_url', p.avatar_url,
      'progress', COALESCE(cp.progress, 0),
      'status', cp.status,
      'joined_at', cp.started_at,
      'last_check_in', cp.last_check_in,
      'check_in_streak', COALESCE(cp.check_in_streak, 0)
    )
  )
  INTO participants_data
  FROM challenge_participants cp
  LEFT JOIN profiles p ON cp.user_id = p.user_id
  WHERE cp.challenge_id = challenge_id_param;

  -- Get total count
  SELECT COUNT(*)
  INTO total_participants
  FROM challenge_participants cp
  WHERE cp.challenge_id = challenge_id_param;

  -- Get active count
  SELECT COUNT(*)
  INTO active_participants
  FROM challenge_participants cp
  WHERE cp.challenge_id = challenge_id_param
    AND cp.status = 'active';

  -- Get completed count
  SELECT COUNT(*)
  INTO completed_participants
  FROM challenge_participants cp
  WHERE cp.challenge_id = challenge_id_param
    AND cp.status = 'completed';

  -- Build the result
  result := jsonb_build_object(
    'success', true,
    'participants', COALESCE(participants_data, '[]'::jsonb),
    'total_count', COALESCE(total_participants, 0),
    'active_count', COALESCE(active_participants, 0),
    'completed_count', COALESCE(completed_participants, 0)
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    -- Return error information
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'participants', '[]'::jsonb,
      'total_count', 0,
      'active_count', 0,
      'completed_count', 0
    );
END;
$$;