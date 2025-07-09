/*
  # Add Friend Invitation System

  1. New Tables
    - `challenge_invitations`
      - `id` (uuid, primary key)
      - `challenge_id` (uuid, foreign key to challenges)
      - `sender_id` (uuid, foreign key to profiles)
      - `recipient_email` (text)
      - `status` (text: 'pending', 'accepted', 'declined')
      - `created_at` (timestamptz)
      - `accepted_at` (timestamptz)
  2. Security
    - Enable RLS on `challenge_invitations` table
    - Add policies for authenticated users
*/

-- Create challenge_invitations table
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

-- Enable RLS
ALTER TABLE challenge_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view invitations they've sent"
  ON challenge_invitations
  FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid());

CREATE POLICY "Users can create invitations for challenges"
  ON challenge_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- Create function to send invitation email
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION send_challenge_invitation TO authenticated;

-- Create function to accept invitation
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
  );
  
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION accept_challenge_invitation TO authenticated;