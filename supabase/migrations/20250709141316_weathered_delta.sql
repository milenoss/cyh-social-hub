/*
  # Create friend system database functions

  1. New Functions
    - `get_friends` - Returns list of user's friends with profile information
    - `get_friend_requests` - Returns pending friend requests for a user
  
  2. Security
    - Functions use RLS policies for data access
    - Only authenticated users can call these functions
    - Users can only see their own friend data
*/

-- Function to get user's friends
CREATE OR REPLACE FUNCTION get_friends(target_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  id uuid,
  user_id uuid,
  friend_id uuid,
  friend_username text,
  friend_display_name text,
  friend_avatar_url text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user can access this data (only their own friends)
  IF target_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    f.id,
    f.user_id,
    f.friend_id,
    p.username as friend_username,
    p.display_name as friend_display_name,
    p.avatar_url as friend_avatar_url,
    f.created_at
  FROM friendships f
  JOIN profiles p ON p.user_id = f.friend_id
  WHERE f.user_id = target_user_id
  
  UNION
  
  SELECT 
    f.id,
    f.friend_id as user_id,
    f.user_id as friend_id,
    p.username as friend_username,
    p.display_name as friend_display_name,
    p.avatar_url as friend_avatar_url,
    f.created_at
  FROM friendships f
  JOIN profiles p ON p.user_id = f.user_id
  WHERE f.friend_id = target_user_id;
END;
$$;

-- Function to get friend requests
CREATE OR REPLACE FUNCTION get_friend_requests(target_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  id uuid,
  sender_id uuid,
  recipient_id uuid,
  sender_username text,
  sender_display_name text,
  sender_avatar_url text,
  status text,
  message text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user can access this data (only their own requests)
  IF target_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    fr.id,
    fr.sender_id,
    fr.recipient_id,
    sender_profile.username as sender_username,
    sender_profile.display_name as sender_display_name,
    sender_profile.avatar_url as sender_avatar_url,
    fr.status,
    fr.message,
    fr.created_at
  FROM friend_requests fr
  JOIN profiles sender_profile ON sender_profile.user_id = fr.sender_id
  WHERE fr.recipient_id = target_user_id
    AND fr.status = 'pending';
END;
$$;