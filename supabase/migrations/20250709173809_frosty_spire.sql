/*
  # Add Function to Get Invitation Details

  1. New Functions
    - `get_invitation_details` - Retrieves details about a challenge invitation
*/

-- Create function to get invitation details
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

-- Grant execute permission to public (anyone can view invitation details)
GRANT EXECUTE ON FUNCTION get_invitation_details TO public;