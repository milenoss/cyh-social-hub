/*
  # Fix friend system database functions

  1. Database Functions
    - Drop conflicting get_friends function overloads
    - Create single get_friends function for current user
    - Fix ambiguous column references in get_friend_requests
    - Add missing friend system functions

  2. Security
    - All functions use proper RLS and auth.uid()
    - Functions return structured JSON responses
*/

-- Drop existing conflicting functions if they exist
DROP FUNCTION IF EXISTS public.get_friends();
DROP FUNCTION IF EXISTS public.get_friends(uuid);
DROP FUNCTION IF EXISTS public.get_friend_requests(text);

-- Create get_friends function (no parameters, gets friends for current user)
CREATE OR REPLACE FUNCTION public.get_friends()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  friends_data json;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get friends with profile information
  SELECT json_build_object(
    'success', true,
    'friends', COALESCE(json_agg(
      json_build_object(
        'id', p.id,
        'user_id', p.user_id,
        'username', p.username,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url,
        'bio', p.bio,
        'friendship_id', f.id,
        'created_at', f.created_at
      )
    ), '[]'::json)
  ) INTO friends_data
  FROM friendships f
  JOIN profiles p ON (
    CASE 
      WHEN f.user_id = current_user_id THEN p.user_id = f.friend_id
      ELSE p.user_id = f.user_id
    END
  )
  WHERE f.user_id = current_user_id OR f.friend_id = current_user_id;

  RETURN friends_data;
END;
$$;

-- Create get_friend_requests function with fixed column references
CREATE OR REPLACE FUNCTION public.get_friend_requests(status text DEFAULT 'pending')
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  requests_data json;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get received and sent friend requests with explicit table aliases
  SELECT json_build_object(
    'success', true,
    'received', COALESCE(received_requests.requests, '[]'::json),
    'sent', COALESCE(sent_requests.requests, '[]'::json)
  ) INTO requests_data
  FROM (
    SELECT json_agg(
      json_build_object(
        'id', fr.id,
        'sender_id', fr.sender_id,
        'sender', json_build_object(
          'id', sender_profile.id,
          'username', sender_profile.username,
          'display_name', sender_profile.display_name,
          'avatar_url', sender_profile.avatar_url
        ),
        'message', fr.message,
        'created_at', fr.created_at
      )
    ) as requests
    FROM friend_requests fr
    JOIN profiles sender_profile ON sender_profile.user_id = fr.sender_id
    WHERE fr.recipient_id = current_user_id AND fr.status = get_friend_requests.status
  ) received_requests
  CROSS JOIN (
    SELECT json_agg(
      json_build_object(
        'id', fr.id,
        'recipient_id', fr.recipient_id,
        'recipient', json_build_object(
          'id', recipient_profile.id,
          'username', recipient_profile.username,
          'display_name', recipient_profile.display_name,
          'avatar_url', recipient_profile.avatar_url
        ),
        'message', fr.message,
        'created_at', fr.created_at
      )
    ) as requests
    FROM friend_requests fr
    JOIN profiles recipient_profile ON recipient_profile.user_id = fr.recipient_id
    WHERE fr.sender_id = current_user_id AND fr.status = get_friend_requests.status
  ) sent_requests;

  RETURN requests_data;
END;
$$;

-- Create send_friend_request function
CREATE OR REPLACE FUNCTION public.send_friend_request(recipient_id uuid, message text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  existing_request_id uuid;
  existing_friendship_id uuid;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF current_user_id = recipient_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot send friend request to yourself');
  END IF;

  -- Check if users are already friends
  SELECT f.id INTO existing_friendship_id
  FROM friendships f
  WHERE (f.user_id = current_user_id AND f.friend_id = recipient_id)
     OR (f.user_id = recipient_id AND f.friend_id = current_user_id);

  IF existing_friendship_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Users are already friends');
  END IF;

  -- Check if there's already a pending request
  SELECT fr.id INTO existing_request_id
  FROM friend_requests fr
  WHERE ((fr.sender_id = current_user_id AND fr.recipient_id = recipient_id)
      OR (fr.sender_id = recipient_id AND fr.recipient_id = current_user_id))
    AND fr.status = 'pending';

  IF existing_request_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Friend request already exists');
  END IF;

  -- Insert new friend request
  INSERT INTO friend_requests (sender_id, recipient_id, message)
  VALUES (current_user_id, recipient_id, message);

  RETURN json_build_object('success', true, 'message', 'Friend request sent successfully');
END;
$$;

-- Create accept_friend_request function
CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  request_record record;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get the friend request
  SELECT * INTO request_record
  FROM friend_requests
  WHERE id = request_id AND recipient_id = current_user_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Friend request not found or already processed');
  END IF;

  -- Update request status
  UPDATE friend_requests
  SET status = 'accepted', updated_at = now()
  WHERE id = request_id;

  -- Create friendship
  INSERT INTO friendships (user_id, friend_id)
  VALUES (request_record.sender_id, current_user_id);

  RETURN json_build_object('success', true, 'message', 'Friend request accepted');
END;
$$;

-- Create reject_friend_request function
CREATE OR REPLACE FUNCTION public.reject_friend_request(request_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Update request status
  UPDATE friend_requests
  SET status = 'rejected', updated_at = now()
  WHERE id = request_id AND recipient_id = current_user_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Friend request not found or already processed');
  END IF;

  RETURN json_build_object('success', true, 'message', 'Friend request rejected');
END;
$$;

-- Create remove_friend function
CREATE OR REPLACE FUNCTION public.remove_friend(friend_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  friendship_deleted boolean := false;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Delete friendship (bidirectional)
  DELETE FROM friendships
  WHERE (user_id = current_user_id AND friend_id = remove_friend.friend_id)
     OR (user_id = remove_friend.friend_id AND friend_id = current_user_id);

  GET DIAGNOSTICS friendship_deleted = FOUND;

  IF NOT friendship_deleted THEN
    RETURN json_build_object('success', false, 'error', 'Friendship not found');
  END IF;

  RETURN json_build_object('success', true, 'message', 'Friend removed successfully');
END;
$$;

-- Create search_users function
CREATE OR REPLACE FUNCTION public.search_users(search_query text, limit_count integer DEFAULT 10, offset_count integer DEFAULT 0)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  users_data json;
  total_count integer;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get total count
  SELECT COUNT(*) INTO total_count
  FROM profiles p
  WHERE p.user_id != current_user_id
    AND p.is_public = true
    AND (
      p.username ILIKE '%' || search_query || '%'
      OR p.display_name ILIKE '%' || search_query || '%'
    );

  -- Get users with friendship status
  SELECT json_build_object(
    'success', true,
    'users', COALESCE(json_agg(
      json_build_object(
        'id', p.id,
        'user_id', p.user_id,
        'username', p.username,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url,
        'bio', p.bio,
        'is_friend', CASE WHEN f.id IS NOT NULL THEN true ELSE false END,
        'has_pending_request', CASE WHEN fr.id IS NOT NULL THEN true ELSE false END
      )
    ), '[]'::json),
    'total', total_count
  ) INTO users_data
  FROM profiles p
  LEFT JOIN friendships f ON (
    (f.user_id = current_user_id AND f.friend_id = p.user_id)
    OR (f.user_id = p.user_id AND f.friend_id = current_user_id)
  )
  LEFT JOIN friend_requests fr ON (
    ((fr.sender_id = current_user_id AND fr.recipient_id = p.user_id)
     OR (fr.sender_id = p.user_id AND fr.recipient_id = current_user_id))
    AND fr.status = 'pending'
  )
  WHERE p.user_id != current_user_id
    AND p.is_public = true
    AND (
      p.username ILIKE '%' || search_query || '%'
      OR p.display_name ILIKE '%' || search_query || '%'
    )
  ORDER BY p.username
  LIMIT limit_count
  OFFSET offset_count;

  RETURN users_data;
END;
$$;

-- Create get_friend_suggestions function
CREATE OR REPLACE FUNCTION public.get_friend_suggestions(limit_count integer DEFAULT 10)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  suggestions_data json;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get friend suggestions (users who are not friends and have no pending requests)
  SELECT json_build_object(
    'success', true,
    'suggestions', COALESCE(json_agg(
      json_build_object(
        'id', p.id,
        'user_id', p.user_id,
        'username', p.username,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url,
        'bio', p.bio
      )
    ), '[]'::json)
  ) INTO suggestions_data
  FROM profiles p
  WHERE p.user_id != current_user_id
    AND p.is_public = true
    AND NOT EXISTS (
      SELECT 1 FROM friendships f
      WHERE (f.user_id = current_user_id AND f.friend_id = p.user_id)
         OR (f.user_id = p.user_id AND f.friend_id = current_user_id)
    )
    AND NOT EXISTS (
      SELECT 1 FROM friend_requests fr
      WHERE ((fr.sender_id = current_user_id AND fr.recipient_id = p.user_id)
          OR (fr.sender_id = p.user_id AND fr.recipient_id = current_user_id))
        AND fr.status = 'pending'
    )
  ORDER BY p.created_at DESC
  LIMIT limit_count;

  RETURN suggestions_data;
END;
$$;

-- Create check_friendship_status function
CREATE OR REPLACE FUNCTION public.check_friendship_status(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  friendship_exists boolean := false;
  pending_request record;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if already friends
  SELECT EXISTS(
    SELECT 1 FROM friendships f
    WHERE (f.user_id = current_user_id AND f.friend_id = target_user_id)
       OR (f.user_id = target_user_id AND f.friend_id = current_user_id)
  ) INTO friendship_exists;

  IF friendship_exists THEN
    RETURN json_build_object('success', true, 'status', 'friends');
  END IF;

  -- Check for pending friend requests
  SELECT fr.id, fr.sender_id INTO pending_request
  FROM friend_requests fr
  WHERE ((fr.sender_id = current_user_id AND fr.recipient_id = target_user_id)
      OR (fr.sender_id = target_user_id AND fr.recipient_id = current_user_id))
    AND fr.status = 'pending';

  IF pending_request.id IS NOT NULL THEN
    IF pending_request.sender_id = current_user_id THEN
      RETURN json_build_object(
        'success', true, 
        'status', 'request_sent',
        'request_id', pending_request.id,
        'is_sender', true
      );
    ELSE
      RETURN json_build_object(
        'success', true, 
        'status', 'request_received',
        'request_id', pending_request.id,
        'is_sender', false
      );
    END IF;
  END IF;

  RETURN json_build_object('success', true, 'status', 'none');
END;
$$;