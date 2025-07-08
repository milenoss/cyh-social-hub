/*
  # Friend System Implementation

  1. New Tables
    - `friendships` - Stores mutual friend connections
    - `friend_requests` - Tracks pending, accepted, and rejected friend requests

  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control
    - Create secure functions for friend operations

  3. Functions
    - `send_friend_request` - Send a friend request to another user
    - `accept_friend_request` - Accept a pending friend request
    - `reject_friend_request` - Reject a pending friend request
    - `remove_friend` - Remove an existing friendship
    - `get_friend_requests` - Get all friend requests for a user
    - `get_friends` - Get all friends for a user
    - `search_users` - Search for users to add as friends
    - `get_friend_suggestions` - Get friend suggestions based on mutual connections
    - `check_friendship_status` - Check the friendship status between two users
*/

-- Create friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Create friend requests table
CREATE TABLE IF NOT EXISTS friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(sender_id, recipient_id)
);

-- Enable RLS on tables
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for friendships
CREATE POLICY "Users can view their own friendships"
  ON friendships
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Users can delete their own friendships"
  ON friendships
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR friend_id = auth.uid());

-- Create policies for friend requests
CREATE POLICY "Users can view friend requests they've sent or received"
  ON friend_requests
  FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can send friend requests"
  ON friend_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update friend requests they've received"
  ON friend_requests
  FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "Users can delete friend requests they've sent or received"
  ON friend_requests
  FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Create triggers for timestamp updates
CREATE TRIGGER update_friendships_updated_at
BEFORE UPDATE ON friendships
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friend_requests_updated_at
BEFORE UPDATE ON friend_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create function to send friend request
CREATE OR REPLACE FUNCTION send_friend_request(
  recipient_id uuid,
  message text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sender_id uuid;
  result json;
BEGIN
  -- Get the sender ID
  sender_id := auth.uid();
  
  -- Check if sender exists
  IF sender_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;
  
  -- Check if recipient exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = recipient_id) THEN
    RETURN json_build_object('success', false, 'message', 'Recipient user not found');
  END IF;
  
  -- Check if sender and recipient are the same
  IF sender_id = recipient_id THEN
    RETURN json_build_object('success', false, 'message', 'Cannot send friend request to yourself');
  END IF;
  
  -- Check if already friends
  IF EXISTS (
    SELECT 1 FROM friendships 
    WHERE (user_id = sender_id AND friend_id = recipient_id) 
       OR (user_id = recipient_id AND friend_id = sender_id)
  ) THEN
    RETURN json_build_object('success', false, 'message', 'Already friends with this user');
  END IF;
  
  -- Check if request already exists
  IF EXISTS (
    SELECT 1 FROM friend_requests 
    WHERE sender_id = send_friend_request.sender_id 
      AND recipient_id = send_friend_request.recipient_id
      AND status = 'pending'
  ) THEN
    RETURN json_build_object('success', false, 'message', 'Friend request already sent');
  END IF;
  
  -- Check if there's a pending request from recipient to sender
  IF EXISTS (
    SELECT 1 FROM friend_requests 
    WHERE sender_id = send_friend_request.recipient_id 
      AND recipient_id = send_friend_request.sender_id
      AND status = 'pending'
  ) THEN
    -- Accept the existing request instead
    PERFORM accept_friend_request(
      (SELECT id FROM friend_requests 
       WHERE sender_id = send_friend_request.recipient_id 
         AND recipient_id = send_friend_request.sender_id
         AND status = 'pending'
       LIMIT 1)
    );
    
    RETURN json_build_object('success', true, 'message', 'Automatically accepted existing friend request');
  END IF;
  
  -- Create friend request
  INSERT INTO friend_requests (
    sender_id,
    recipient_id,
    message
  )
  VALUES (
    sender_id,
    recipient_id,
    message
  );
  
  -- Log the event
  PERFORM log_security_event(
    'friend_request_sent',
    jsonb_build_object(
      'recipient_id', recipient_id
    )
  );
  
  -- Return success
  RETURN json_build_object('success', true, 'message', 'Friend request sent successfully');
END;
$$;

-- Create function to accept friend request
CREATE OR REPLACE FUNCTION accept_friend_request(
  request_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
  sender_id uuid;
  recipient_id uuid;
  result json;
BEGIN
  -- Get the user ID
  user_id := auth.uid();
  
  -- Check if user exists
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;
  
  -- Get request details
  SELECT fr.sender_id, fr.recipient_id INTO sender_id, recipient_id
  FROM friend_requests fr
  WHERE fr.id = request_id AND fr.status = 'pending';
  
  -- Check if request exists
  IF sender_id IS NULL OR recipient_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Friend request not found or already processed');
  END IF;
  
  -- Check if user is the recipient
  IF recipient_id != user_id THEN
    RETURN json_build_object('success', false, 'message', 'Not authorized to accept this request');
  END IF;
  
  -- Update request status
  UPDATE friend_requests
  SET status = 'accepted', updated_at = now()
  WHERE id = request_id;
  
  -- Create friendship (both ways for easier querying)
  INSERT INTO friendships (user_id, friend_id)
  VALUES 
    (sender_id, recipient_id),
    (recipient_id, sender_id);
  
  -- Log the event
  PERFORM log_security_event(
    'friend_request_accepted',
    jsonb_build_object(
      'friend_id', sender_id
    )
  );
  
  -- Return success
  RETURN json_build_object('success', true, 'message', 'Friend request accepted successfully');
END;
$$;

-- Create function to reject friend request
CREATE OR REPLACE FUNCTION reject_friend_request(
  request_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
  recipient_id uuid;
  result json;
BEGIN
  -- Get the user ID
  user_id := auth.uid();
  
  -- Check if user exists
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;
  
  -- Get request details
  SELECT fr.recipient_id INTO recipient_id
  FROM friend_requests fr
  WHERE fr.id = request_id AND fr.status = 'pending';
  
  -- Check if request exists
  IF recipient_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Friend request not found or already processed');
  END IF;
  
  -- Check if user is the recipient
  IF recipient_id != user_id THEN
    RETURN json_build_object('success', false, 'message', 'Not authorized to reject this request');
  END IF;
  
  -- Update request status
  UPDATE friend_requests
  SET status = 'rejected', updated_at = now()
  WHERE id = request_id;
  
  -- Log the event
  PERFORM log_security_event(
    'friend_request_rejected',
    jsonb_build_object(
      'request_id', request_id
    )
  );
  
  -- Return success
  RETURN json_build_object('success', true, 'message', 'Friend request rejected successfully');
END;
$$;

-- Create function to remove friend
CREATE OR REPLACE FUNCTION remove_friend(
  friend_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
  result json;
BEGIN
  -- Get the user ID
  user_id := auth.uid();
  
  -- Check if user exists
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;
  
  -- Check if friendship exists
  IF NOT EXISTS (
    SELECT 1 FROM friendships 
    WHERE (user_id = remove_friend.user_id AND friend_id = remove_friend.friend_id) 
       OR (user_id = remove_friend.friend_id AND friend_id = remove_friend.user_id)
  ) THEN
    RETURN json_build_object('success', false, 'message', 'Not friends with this user');
  END IF;
  
  -- Delete friendship (both ways)
  DELETE FROM friendships
  WHERE (user_id = remove_friend.user_id AND friend_id = remove_friend.friend_id) 
     OR (user_id = remove_friend.friend_id AND friend_id = remove_friend.user_id);
  
  -- Log the event
  PERFORM log_security_event(
    'friend_removed',
    jsonb_build_object(
      'friend_id', friend_id
    )
  );
  
  -- Return success
  RETURN json_build_object('success', true, 'message', 'Friend removed successfully');
END;
$$;

-- Create function to get friend requests
CREATE OR REPLACE FUNCTION get_friend_requests(
  status text DEFAULT 'pending'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
  requests json;
  sent_requests json;
  received_requests json;
BEGIN
  -- Get the user ID
  user_id := auth.uid();
  
  -- Check if user exists
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;
  
  -- Get received requests
  SELECT json_agg(
    json_build_object(
      'id', fr.id,
      'sender_id', fr.sender_id,
      'sender', json_build_object(
        'id', p.id,
        'username', p.username,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url
      ),
      'message', fr.message,
      'created_at', fr.created_at
    )
  )
  INTO received_requests
  FROM friend_requests fr
  JOIN profiles p ON fr.sender_id = p.user_id
  WHERE fr.recipient_id = user_id AND fr.status = get_friend_requests.status;
  
  -- Get sent requests
  SELECT json_agg(
    json_build_object(
      'id', fr.id,
      'recipient_id', fr.recipient_id,
      'recipient', json_build_object(
        'id', p.id,
        'username', p.username,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url
      ),
      'message', fr.message,
      'created_at', fr.created_at
    )
  )
  INTO sent_requests
  FROM friend_requests fr
  JOIN profiles p ON fr.recipient_id = p.user_id
  WHERE fr.sender_id = user_id AND fr.status = get_friend_requests.status;
  
  -- Return requests
  RETURN json_build_object(
    'success', true, 
    'received', COALESCE(received_requests, '[]'::json),
    'sent', COALESCE(sent_requests, '[]'::json)
  );
END;
$$;

-- Create function to get friends
CREATE OR REPLACE FUNCTION get_friends()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
  friends json;
BEGIN
  -- Get the user ID
  user_id := auth.uid();
  
  -- Check if user exists
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;
  
  -- Get friends
  SELECT json_agg(
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
  )
  INTO friends
  FROM friendships f
  JOIN profiles p ON f.friend_id = p.user_id
  WHERE f.user_id = get_friends.user_id;
  
  -- Return friends
  RETURN json_build_object(
    'success', true, 
    'friends', COALESCE(friends, '[]'::json)
  );
END;
$$;

-- Create function to search users for friend requests
CREATE OR REPLACE FUNCTION search_users(
  search_query text,
  limit_count integer DEFAULT 10,
  offset_count integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
  users json;
  total_count integer;
BEGIN
  -- Get the user ID
  user_id := auth.uid();
  
  -- Check if user exists
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;
  
  -- Get total count
  SELECT COUNT(*) INTO total_count
  FROM profiles p
  WHERE p.user_id != search_users.user_id
    AND p.is_public = true
    AND (
      p.username ILIKE '%' || search_query || '%'
      OR p.display_name ILIKE '%' || search_query || '%'
    );
  
  -- Get users
  SELECT json_agg(
    json_build_object(
      'id', p.id,
      'user_id', p.user_id,
      'username', p.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url,
      'bio', p.bio,
      'is_friend', EXISTS (
        SELECT 1 FROM friendships f
        WHERE (f.user_id = search_users.user_id AND f.friend_id = p.user_id)
      ),
      'has_pending_request', EXISTS (
        SELECT 1 FROM friend_requests fr
        WHERE (
          (fr.sender_id = search_users.user_id AND fr.recipient_id = p.user_id)
          OR (fr.sender_id = p.user_id AND fr.recipient_id = search_users.user_id)
        )
        AND fr.status = 'pending'
      )
    )
  )
  INTO users
  FROM profiles p
  WHERE p.user_id != search_users.user_id
    AND p.is_public = true
    AND (
      p.username ILIKE '%' || search_query || '%'
      OR p.display_name ILIKE '%' || search_query || '%'
    )
  ORDER BY 
    CASE WHEN p.username ILIKE search_query || '%' THEN 0
         WHEN p.display_name ILIKE search_query || '%' THEN 1
         ELSE 2
    END,
    p.username
  LIMIT limit_count
  OFFSET offset_count;
  
  -- Return users
  RETURN json_build_object(
    'success', true, 
    'users', COALESCE(users, '[]'::json),
    'total', total_count
  );
END;
$$;

-- Create function to get friend suggestions
CREATE OR REPLACE FUNCTION get_friend_suggestions(
  limit_count integer DEFAULT 10
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
  suggestions json;
BEGIN
  -- Get the user ID
  user_id := auth.uid();
  
  -- Check if user exists
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;
  
  -- Get suggestions (friends of friends who aren't already friends)
  WITH friends AS (
    SELECT friend_id
    FROM friendships
    WHERE user_id = get_friend_suggestions.user_id
  ),
  friends_of_friends AS (
    SELECT DISTINCT f.friend_id
    FROM friendships f
    JOIN friends fr ON f.user_id = fr.friend_id
    WHERE f.friend_id != get_friend_suggestions.user_id
      AND f.friend_id NOT IN (SELECT friend_id FROM friends)
  )
  SELECT json_agg(
    json_build_object(
      'id', p.id,
      'user_id', p.user_id,
      'username', p.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url,
      'bio', p.bio,
      'mutual_friends_count', (
        SELECT COUNT(*)
        FROM friendships f1
        JOIN friendships f2 ON f1.friend_id = f2.friend_id
        WHERE f1.user_id = get_friend_suggestions.user_id
          AND f2.user_id = p.user_id
      )
    )
  )
  INTO suggestions
  FROM profiles p
  JOIN friends_of_friends fof ON p.user_id = fof.friend_id
  WHERE p.is_public = true
  ORDER BY (
    SELECT COUNT(*)
    FROM friendships f1
    JOIN friendships f2 ON f1.friend_id = f2.friend_id
    WHERE f1.user_id = get_friend_suggestions.user_id
      AND f2.user_id = p.user_id
  ) DESC
  LIMIT limit_count;
  
  -- Return suggestions
  RETURN json_build_object(
    'success', true, 
    'suggestions', COALESCE(suggestions, '[]'::json)
  );
END;
$$;

-- Create function to check friendship status
CREATE OR REPLACE FUNCTION check_friendship_status(
  target_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
  status text;
  request_id uuid;
  is_sender boolean;
BEGIN
  -- Get the user ID
  user_id := auth.uid();
  
  -- Check if user exists
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;
  
  -- Check if target user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    RETURN json_build_object('success', false, 'message', 'Target user not found');
  END IF;
  
  -- Check if already friends
  IF EXISTS (
    SELECT 1 FROM friendships 
    WHERE (user_id = check_friendship_status.user_id AND friend_id = target_user_id) 
       OR (user_id = target_user_id AND friend_id = check_friendship_status.user_id)
  ) THEN
    status := 'friends';
    
    -- Get friendship ID
    SELECT id INTO request_id
    FROM friendships
    WHERE (user_id = check_friendship_status.user_id AND friend_id = target_user_id)
    LIMIT 1;
  
  -- Check if there's a pending request from current user to target
  ELSIF EXISTS (
    SELECT 1 FROM friend_requests 
    WHERE sender_id = check_friendship_status.user_id 
      AND recipient_id = target_user_id
      AND status = 'pending'
  ) THEN
    status := 'request_sent';
    
    -- Get request ID
    SELECT id INTO request_id
    FROM friend_requests
    WHERE sender_id = check_friendship_status.user_id 
      AND recipient_id = target_user_id
      AND status = 'pending';
    
    is_sender := true;
  
  -- Check if there's a pending request from target to current user
  ELSIF EXISTS (
    SELECT 1 FROM friend_requests 
    WHERE sender_id = target_user_id 
      AND recipient_id = check_friendship_status.user_id
      AND status = 'pending'
  ) THEN
    status := 'request_received';
    
    -- Get request ID
    SELECT id INTO request_id
    FROM friend_requests
    WHERE sender_id = target_user_id 
      AND recipient_id = check_friendship_status.user_id
      AND status = 'pending';
    
    is_sender := false;
  
  -- No relationship
  ELSE
    status := 'none';
  END IF;
  
  -- Return status
  RETURN json_build_object(
    'success', true, 
    'status', status,
    'request_id', request_id,
    'is_sender', is_sender
  );
END;
$$;