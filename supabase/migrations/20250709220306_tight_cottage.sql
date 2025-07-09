/*
  # Fix Challenge Flow

  1. New Functions
    - `check_in_challenge` - Handles daily check-ins for challenges
    - `update_user_stats_on_completion` - Updates user stats when a challenge is completed
    - `get_challenge_history` - Gets challenge history with check-ins
    - `send_challenge_invitation` - Sends invitation to join a challenge
    - `accept_challenge_invitation` - Accepts a challenge invitation
    - `get_invitation_details` - Gets details of an invitation

  2. Schema Updates
    - Add `last_check_in` column to challenge_participants
    - Add `check_in_streak` column to challenge_participants
    - Add `check_in_notes` column to challenge_participants
    - Create challenge_invitations table if it doesn't exist
*/

-- Add columns to challenge_participants if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'challenge_participants' AND column_name = 'last_check_in'
  ) THEN
    ALTER TABLE challenge_participants ADD COLUMN last_check_in timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'challenge_participants' AND column_name = 'check_in_streak'
  ) THEN
    ALTER TABLE challenge_participants ADD COLUMN check_in_streak integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'challenge_participants' AND column_name = 'check_in_notes'
  ) THEN
    ALTER TABLE challenge_participants ADD COLUMN check_in_notes jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Create challenge_invitations table if it doesn't exist
CREATE TABLE IF NOT EXISTS challenge_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  invitation_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex')
);

-- Enable RLS on challenge_invitations
ALTER TABLE challenge_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for challenge_invitations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'challenge_invitations' AND policyname = 'Users can view invitations they''ve sent'
  ) THEN
    CREATE POLICY "Users can view invitations they've sent"
      ON challenge_invitations
      FOR SELECT
      TO authenticated
      USING (sender_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'challenge_invitations' AND policyname = 'Users can create invitations for challenges'
  ) THEN
    CREATE POLICY "Users can create invitations for challenges"
      ON challenge_invitations
      FOR INSERT
      TO authenticated
      WITH CHECK (sender_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'challenge_invitations' AND policyname = 'Users can delete their own invitations'
  ) THEN
    CREATE POLICY "Users can delete their own invitations"
      ON challenge_invitations
      FOR DELETE
      TO authenticated
      USING (sender_id = auth.uid());
  END IF;
END $$;

-- Function to handle daily check-in
CREATE OR REPLACE FUNCTION check_in_challenge(
  challenge_id_param uuid,
  note_text text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id uuid;
  participation_record challenge_participants;
  challenge_record challenges;
  current_progress integer;
  new_progress integer;
  now_timestamp timestamptz := now();
  last_check_in_date date;
  current_date date := now()::date;
  new_streak integer;
  check_in_note jsonb;
  result json;
BEGIN
  -- Get the authenticated user ID
  user_id := auth.uid();
  
  -- Exit if no user is authenticated
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;
  
  -- Get participation record
  SELECT * INTO participation_record
  FROM challenge_participants
  WHERE challenge_id = challenge_id_param AND user_id = user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Not participating in this challenge');
  END IF;
  
  -- Get challenge details
  SELECT * INTO challenge_record
  FROM challenges
  WHERE id = challenge_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Challenge not found');
  END IF;
  
  -- Check if already checked in today
  IF participation_record.last_check_in IS NOT NULL THEN
    last_check_in_date := participation_record.last_check_in::date;
    
    IF last_check_in_date = current_date THEN
      RETURN json_build_object(
        'success', false, 
        'message', 'Already checked in today',
        'last_check_in', participation_record.last_check_in
      );
    END IF;
  END IF;
  
  -- Calculate new progress
  current_progress := COALESCE(participation_record.progress, 0);
  new_progress := LEAST(current_progress + (100 / challenge_record.duration_days)::integer, 100);
  
  -- Calculate streak
  IF participation_record.last_check_in IS NULL THEN
    -- First check-in
    new_streak := 1;
  ELSIF (current_date - participation_record.last_check_in::date) = 1 THEN
    -- Consecutive day
    new_streak := COALESCE(participation_record.check_in_streak, 0) + 1;
  ELSE
    -- Streak broken
    new_streak := 1;
  END IF;
  
  -- Create check-in note
  check_in_note := jsonb_build_object(
    'date', now_timestamp,
    'note', note_text,
    'progress', new_progress
  );
  
  -- Update participation record
  UPDATE challenge_participants
  SET 
    progress = new_progress,
    last_check_in = now_timestamp,
    check_in_streak = new_streak,
    check_in_notes = COALESCE(check_in_notes, '[]'::jsonb) || check_in_note,
    status = CASE WHEN new_progress >= 100 THEN 'completed' ELSE status END,
    completed_at = CASE WHEN new_progress >= 100 THEN now_timestamp ELSE completed_at END
  WHERE id = participation_record.id
  RETURNING * INTO participation_record;
  
  -- If challenge completed, update user stats
  IF new_progress >= 100 AND participation_record.status = 'completed' THEN
    PERFORM update_user_stats_on_completion(challenge_record.points_reward);
  END IF;
  
  result := json_build_object(
    'success', true,
    'message', CASE 
      WHEN new_progress >= 100 THEN 'Challenge completed!'
      ELSE 'Check-in successful'
    END,
    'participation', json_build_object(
      'id', participation_record.id,
      'progress', participation_record.progress,
      'status', participation_record.status,
      'check_in_streak', participation_record.check_in_streak,
      'last_check_in', participation_record.last_check_in
    )
  );
  
  RETURN result;
END;
$$;

-- Function to update user stats when a challenge is completed
CREATE OR REPLACE FUNCTION update_user_stats_on_completion(
  challenge_points integer DEFAULT 100
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id uuid;
  current_date date := current_date;
  last_completion_date date;
  current_streak_value int;
  longest_streak_value int;
BEGIN
  -- Get the authenticated user ID
  user_id := auth.uid();
  
  -- Exit if no user is authenticated
  IF user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Get the user's current stats
  SELECT 
    current_streak,
    longest_streak,
    (SELECT MAX(completed_at::date) FROM challenge_participants WHERE user_id = profiles.user_id AND status = 'completed')
  INTO 
    current_streak_value,
    longest_streak_value,
    last_completion_date
  FROM profiles
  WHERE user_id = user_id;
  
  -- Update streak information
  IF last_completion_date IS NULL OR (current_date - last_completion_date) <= 1 THEN
    -- Either first completion or consecutive day
    current_streak_value := COALESCE(current_streak_value, 0) + 1;
  ELSE
    -- Streak broken, reset to 1
    current_streak_value := 1;
  END IF;
  
  -- Update longest streak if current streak is longer
  IF current_streak_value > COALESCE(longest_streak_value, 0) THEN
    longest_streak_value := current_streak_value;
  END IF;
  
  -- Update the user's profile
  UPDATE profiles
  SET 
    challenges_completed = COALESCE(challenges_completed, 0) + 1,
    total_points = COALESCE(total_points, 0) + challenge_points,
    current_streak = current_streak_value,
    longest_streak = longest_streak_value
  WHERE user_id = user_id;
  
END;
$$;

-- Function to get challenge history with check-ins
CREATE OR REPLACE FUNCTION get_challenge_history(
  challenge_id_param uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id uuid;
  participation_record challenge_participants;
  challenge_record challenges;
  result json;
BEGIN
  -- Get the authenticated user ID
  user_id := auth.uid();
  
  -- Exit if no user is authenticated
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;
  
  -- Get participation record
  SELECT * INTO participation_record
  FROM challenge_participants
  WHERE challenge_id = challenge_id_param AND user_id = user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Not participating in this challenge');
  END IF;
  
  -- Get challenge details
  SELECT * INTO challenge_record
  FROM challenges
  WHERE id = challenge_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Challenge not found');
  END IF;
  
  result := json_build_object(
    'success', true,
    'challenge', json_build_object(
      'id', challenge_record.id,
      'title', challenge_record.title,
      'description', challenge_record.description,
      'difficulty', challenge_record.difficulty,
      'duration_days', challenge_record.duration_days,
      'points_reward', challenge_record.points_reward
    ),
    'participation', json_build_object(
      'id', participation_record.id,
      'status', participation_record.status,
      'progress', participation_record.progress,
      'started_at', participation_record.started_at,
      'completed_at', participation_record.completed_at,
      'check_in_streak', participation_record.check_in_streak,
      'last_check_in', participation_record.last_check_in,
      'check_in_notes', participation_record.check_in_notes
    )
  );
  
  RETURN result;
END;
$$;

-- Function to send invitation email
CREATE OR REPLACE FUNCTION send_challenge_invitation(
  challenge_id uuid,
  recipient_email text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_id uuid;
  challenge_record challenges;
  sender_profile profiles;
  invitation_record challenge_invitations;
  result json;
BEGIN
  -- Get the authenticated user ID
  sender_id := auth.uid();
  
  -- Exit if no user is authenticated
  IF sender_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;
  
  -- Get challenge details
  SELECT * INTO challenge_record
  FROM challenges
  WHERE id = challenge_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Challenge not found');
  END IF;
  
  -- Get sender profile
  SELECT * INTO sender_profile
  FROM profiles
  WHERE user_id = sender_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Sender profile not found');
  END IF;
  
  -- Create invitation record
  INSERT INTO challenge_invitations (challenge_id, sender_id, recipient_email)
  VALUES (challenge_id, sender_id, recipient_email)
  RETURNING * INTO invitation_record;
  
  -- In a real implementation, you would send an email here
  -- For now, we'll just return the invitation details
  
  result := json_build_object(
    'success', true,
    'message', 'Invitation sent successfully',
    'invitation', json_build_object(
      'id', invitation_record.id,
      'challenge_id', invitation_record.challenge_id,
      'challenge_title', challenge_record.title,
      'sender_name', COALESCE(sender_profile.display_name, sender_profile.username),
      'recipient_email', invitation_record.recipient_email,
      'invitation_token', invitation_record.invitation_token,
      'created_at', invitation_record.created_at
    )
  );
  
  RETURN result;
END;
$$;

-- Function to accept invitation
CREATE OR REPLACE FUNCTION accept_challenge_invitation(
  invitation_token text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id uuid;
  invitation_record challenge_invitations;
  challenge_record challenges;
  result json;
BEGIN
  -- Get the authenticated user ID
  user_id := auth.uid();
  
  -- Exit if no user is authenticated
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;
  
  -- Get invitation details
  SELECT * INTO invitation_record
  FROM challenge_invitations
  WHERE invitation_token = invitation_token
  AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Invalid or expired invitation');
  END IF;
  
  -- Get challenge details
  SELECT * INTO challenge_record
  FROM challenges
  WHERE id = invitation_record.challenge_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Challenge not found');
  END IF;
  
  -- Update invitation status
  UPDATE challenge_invitations
  SET 
    status = 'accepted',
    accepted_at = now()
  WHERE id = invitation_record.id;
  
  -- Join the challenge
  INSERT INTO challenge_participants (
    challenge_id,
    user_id,
    status,
    progress,
    started_at
  )
  VALUES (
    invitation_record.challenge_id,
    user_id,
    'active',
    0,
    now()
  )
  ON CONFLICT (challenge_id, user_id) DO NOTHING;
  
  result := json_build_object(
    'success', true,
    'message', 'Challenge joined successfully',
    'challenge', json_build_object(
      'id', challenge_record.id,
      'title', challenge_record.title
    )
  );
  
  RETURN result;
END;
$$;

-- Function to get invitation details
CREATE OR REPLACE FUNCTION get_invitation_details(
  invitation_token text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record challenge_invitations;
  challenge_record challenges;
  sender_profile profiles;
  result json;
BEGIN
  -- Get invitation details
  SELECT * INTO invitation_record
  FROM challenge_invitations
  WHERE invitation_token = invitation_token
  AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Invalid or expired invitation');
  END IF;
  
  -- Get challenge details
  SELECT * INTO challenge_record
  FROM challenges
  WHERE id = invitation_record.challenge_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Challenge not found');
  END IF;
  
  -- Get sender profile
  SELECT * INTO sender_profile
  FROM profiles
  WHERE user_id = invitation_record.sender_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Sender profile not found');
  END IF;
  
  result := json_build_object(
    'success', true,
    'invitation_id', invitation_record.id,
    'challenge_id', challenge_record.id,
    'challenge_title', challenge_record.title,
    'challenge_description', challenge_record.description,
    'challenge_duration', challenge_record.duration_days,
    'challenge_difficulty', challenge_record.difficulty,
    'sender_id', sender_profile.user_id,
    'sender_name', COALESCE(sender_profile.display_name, sender_profile.username),
    'created_at', invitation_record.created_at
  );
  
  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_in_challenge TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_stats_on_completion TO authenticated;
GRANT EXECUTE ON FUNCTION get_challenge_history TO authenticated;
GRANT EXECUTE ON FUNCTION send_challenge_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION accept_challenge_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION get_invitation_details TO public;