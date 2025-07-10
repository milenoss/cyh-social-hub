/*
  # Create Real Participants Functions

  1. New Functions
    - get_real_challenge_participants: Fetches participants for a challenge with user data
    - join_real_challenge: Allows users to join a challenge
    - update_real_challenge_progress: Updates a user's progress in a challenge
    - leave_real_challenge: Allows users to leave a challenge

  2. Purpose
    - Replace mock data with real data persistence
    - Enable tracking of real user progress
    - Support real-time leaderboards
*/

-- Function to get challenge participants with user data
CREATE OR REPLACE FUNCTION get_real_challenge_participants(
  challenge_id_param uuid,
  limit_count integer DEFAULT 50,
  offset_count integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  participants_data json;
  total_count integer;
BEGIN
  -- Get total count
  SELECT COUNT(*) INTO total_count
  FROM challenge_participants cp
  WHERE cp.challenge_id = challenge_id_param;

  -- Get participants with user data
  SELECT json_agg(
    json_build_object(
      'id', cp.id,
      'user_id', cp.user_id,
      'challenge_id', cp.challenge_id,
      'status', cp.status,
      'progress', cp.progress,
      'started_at', cp.started_at,
      'completed_at', cp.completed_at,
      'last_check_in', cp.last_check_in,
      'check_in_streak', cp.check_in_streak,
      'user', json_build_object(
        'id', p.user_id,
        'username', COALESCE(p.username, split_part(u.email, '@', 1)),
        'display_name', COALESCE(p.display_name, split_part(u.email, '@', 1)),
        'avatar_url', p.avatar_url
      )
    )
    ORDER BY 
      CASE 
        WHEN cp.status = 'completed' THEN 0 
        ELSE 1 
      END,
      cp.progress DESC,
      cp.started_at ASC
  )
  INTO participants_data
  FROM challenge_participants cp
  LEFT JOIN profiles p ON cp.user_id = p.user_id
  LEFT JOIN auth.users u ON cp.user_id = u.id
  WHERE cp.challenge_id = challenge_id_param
  LIMIT limit_count
  OFFSET offset_count;

  -- Build the response
  result := json_build_object(
    'success', true,
    'participants', COALESCE(participants_data, '[]'::json),
    'total', total_count,
    'message', 'Participants fetched successfully'
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'participants', '[]'::json,
      'total', 0,
      'message', 'Error fetching participants: ' || SQLERRM
    );
END;
$$;

-- Function to join a challenge
CREATE OR REPLACE FUNCTION join_real_challenge(
  challenge_id_param uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_participant_id uuid;
  result json;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Authentication required'
    );
  END IF;

  -- Check if user is already participating
  IF EXISTS (
    SELECT 1 FROM challenge_participants 
    WHERE challenge_id = challenge_id_param AND user_id = auth.uid()
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'You are already participating in this challenge'
    );
  END IF;

  -- Insert the participant
  INSERT INTO challenge_participants (
    challenge_id,
    user_id,
    status,
    progress,
    started_at,
    last_check_in
  ) VALUES (
    challenge_id_param,
    auth.uid(),
    'active',
    0,
    now(),
    NULL
  )
  RETURNING id INTO new_participant_id;

  -- Add activity record
  INSERT INTO challenge_activities (
    challenge_id,
    user_id,
    activity_type,
    activity_data
  ) VALUES (
    challenge_id_param,
    auth.uid(),
    'join',
    '{}'::jsonb
  );

  -- Return success response
  result := json_build_object(
    'success', true,
    'participant_id', new_participant_id,
    'message', 'Successfully joined the challenge'
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Error joining challenge: ' || SQLERRM
    );
END;
$$;

-- Function to update challenge progress
CREATE OR REPLACE FUNCTION update_real_challenge_progress(
  challenge_id_param uuid,
  progress_value integer,
  note_text text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  participant_record challenge_participants%ROWTYPE;
  challenge_record challenges%ROWTYPE;
  today_date date;
  last_check_in_date date;
  new_streak integer;
  is_completed boolean;
  result json;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Authentication required'
    );
  END IF;

  -- Get today's date
  today_date := current_date;

  -- Get participant record
  SELECT * INTO participant_record
  FROM challenge_participants
  WHERE challenge_id = challenge_id_param AND user_id = auth.uid();

  -- Check if participant exists
  IF participant_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'You are not participating in this challenge'
    );
  END IF;

  -- Get challenge record
  SELECT * INTO challenge_record
  FROM challenges
  WHERE id = challenge_id_param;

  -- Check if already checked in today
  IF participant_record.last_check_in IS NOT NULL THEN
    last_check_in_date := date(participant_record.last_check_in);
    
    IF last_check_in_date = today_date THEN
      RETURN json_build_object(
        'success', false,
        'message', 'Already checked in today'
      );
    END IF;
  END IF;

  -- Calculate new streak
  IF participant_record.last_check_in IS NULL THEN
    new_streak := 1;
  ELSE
    last_check_in_date := date(participant_record.last_check_in);
    
    IF today_date - last_check_in_date = 1 THEN
      -- Consecutive day
      new_streak := participant_record.check_in_streak + 1;
    ELSE
      -- Streak broken
      new_streak := 1;
    END IF;
  END IF;

  -- Check if challenge is completed
  is_completed := progress_value >= 100;

  -- Update participant record
  UPDATE challenge_participants
  SET 
    progress = progress_value,
    last_check_in = now(),
    check_in_streak = new_streak,
    status = CASE WHEN is_completed THEN 'completed' ELSE status END,
    completed_at = CASE WHEN is_completed THEN now() ELSE completed_at END,
    check_in_notes = CASE 
      WHEN note_text IS NOT NULL THEN 
        check_in_notes || jsonb_build_object(
          'date', to_char(now(), 'YYYY-MM-DD'),
          'note', note_text,
          'progress', progress_value
        )
      ELSE check_in_notes
    END
  WHERE id = participant_record.id;

  -- Add activity record
  IF is_completed THEN
    -- Add completion activity
    INSERT INTO challenge_activities (
      challenge_id,
      user_id,
      activity_type,
      activity_data
    ) VALUES (
      challenge_id_param,
      auth.uid(),
      'complete',
      jsonb_build_object(
        'progress', progress_value,
        'days_taken', extract(day from now() - participant_record.started_at)::integer
      )
    );

    -- Update user profile stats
    UPDATE profiles
    SET 
      challenges_completed = challenges_completed + 1,
      total_points = total_points + COALESCE(challenge_record.points_reward, 100)
    WHERE user_id = auth.uid();
  ELSE
    -- Add progress activity
    INSERT INTO challenge_activities (
      challenge_id,
      user_id,
      activity_type,
      activity_data
    ) VALUES (
      challenge_id_param,
      auth.uid(),
      'progress',
      jsonb_build_object(
        'progress', progress_value,
        'streak', new_streak,
        'note', note_text
      )
    );
  END IF;

  -- Update user streak in profile if needed
  UPDATE profiles
  SET 
    current_streak = new_streak,
    longest_streak = GREATEST(longest_streak, new_streak)
  WHERE user_id = auth.uid();

  -- Return success response
  result := json_build_object(
    'success', true,
    'progress', progress_value,
    'streak', new_streak,
    'is_completed', is_completed,
    'message', CASE 
      WHEN is_completed THEN 'Challenge completed successfully!'
      ELSE 'Progress updated successfully'
    END
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Error updating progress: ' || SQLERRM
    );
END;
$$;

-- Function to leave a challenge
CREATE OR REPLACE FUNCTION leave_real_challenge(
  challenge_id_param uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Authentication required'
    );
  END IF;

  -- Check if user is participating
  IF NOT EXISTS (
    SELECT 1 FROM challenge_participants 
    WHERE challenge_id = challenge_id_param AND user_id = auth.uid()
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'You are not participating in this challenge'
    );
  END IF;

  -- Delete the participant
  DELETE FROM challenge_participants
  WHERE challenge_id = challenge_id_param AND user_id = auth.uid();

  -- Return success response
  result := json_build_object(
    'success', true,
    'message', 'Successfully left the challenge'
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Error leaving challenge: ' || SQLERRM
    );
END;
$$;