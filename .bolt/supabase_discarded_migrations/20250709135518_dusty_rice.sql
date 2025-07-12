/*
  # Friend System

  1. New Tables
    - `friendships` - Connections between users
    - `friend_requests` - Pending friend requests
  
  2. Security
    - Enable RLS on all tables
    - Add policies for proper data access
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

-- Create friend_requests table
CREATE TABLE IF NOT EXISTS friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending', 'accepted', 'rejected'])),
  message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(sender_id, recipient_id)
);

-- Enable RLS on friendships
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Enable RLS on friend_requests
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

-- Create update triggers
CREATE TRIGGER update_friendships_updated_at
BEFORE UPDATE ON friendships
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friend_requests_updated_at
BEFORE UPDATE ON friend_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies for friendships
CREATE POLICY "Users can view their own friendships" 
ON friendships 
FOR SELECT 
TO authenticated 
USING ((user_id = auth.uid()) OR (friend_id = auth.uid()));

CREATE POLICY "Users can delete their own friendships" 
ON friendships 
FOR DELETE 
TO authenticated 
USING ((user_id = auth.uid()) OR (friend_id = auth.uid()));

-- Create RLS policies for friend_requests
CREATE POLICY "Users can view friend requests they've sent or received" 
ON friend_requests 
FOR SELECT 
TO authenticated 
USING ((sender_id = auth.uid()) OR (recipient_id = auth.uid()));

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
USING ((sender_id = auth.uid()) OR (recipient_id = auth.uid()));

-- Create functions for friend system
CREATE OR REPLACE FUNCTION get_friends()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH user_friends AS (
    -- Get friends where user is user_id
    SELECT f.id as friendship_id, p.user_id, p.username, p.display_name, p.avatar_url, p.bio, f.created_at
    FROM friendships f
    JOIN profiles p ON f.friend_id = p.user_id
    WHERE f.user_id = auth.uid()
    
    UNION ALL
    
    -- Get friends where user is friend_id
    SELECT f.id as friendship_id, p.user_id, p.username, p.display_name, p.avatar_url, p.bio, f.created_at
    FROM friendships f
    JOIN profiles p ON f.user_id = p.user_id
    WHERE f.friend_id = auth.uid()
  )
  SELECT jsonb_build_object(
    'success', true,
    'friends', COALESCE(jsonb_agg(uf.*), '[]'::jsonb)
  ) INTO result
  FROM user_friends uf;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_friend_requests(status text DEFAULT 'pending')
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  received_requests jsonb;
  sent_requests jsonb;
BEGIN
  -- Get received requests
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', fr.id,
      'sender_id', fr.sender_id,
      'sender', jsonb_build_object(
        'id', p.id,
        'username', p.username,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url
      ),
      'message', fr.message,
      'status', fr.status,
      'created_at', fr.created_at
    )
  ), '[]'::jsonb)
  INTO received_requests
  FROM friend_requests fr
  JOIN profiles p ON fr.sender_id = p.user_id
  WHERE fr.recipient_id = auth.uid() AND fr.status = status;
  
  -- Get sent requests
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', fr.id,
      'recipient_id', fr.recipient_id,
      'recipient', jsonb_build_object(
        'id', p.id,
        'username', p.username,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url
      ),
      'message', fr.message,
      'status', fr.status,
      'created_at', fr.created_at
    )
  ), '[]'::jsonb)
  INTO sent_requests
  FROM friend_requests fr
  JOIN profiles p ON fr.recipient_id = p.user_id
  WHERE fr.sender_id = auth.uid() AND fr.status = status;
  
  -- Build result
  result := jsonb_build_object(
    'success', true,
    'received', received_requests,
    'sent', sent_requests
  );
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION send_friend_request(recipient_id uuid, message text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  new_request_id uuid;
BEGIN
  -- Check if users are already friends
  IF EXISTS (
    SELECT 1 FROM friendships 
    WHERE (user_id = auth.uid() AND friend_id = recipient_id) 
    OR (user_id = recipient_id AND friend_id = auth.uid())
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Already friends with this user'
    );
  END IF;
  
  -- Check if there's already a pending request
  IF EXISTS (
    SELECT 1 FROM friend_requests 
    WHERE (sender_id = auth.uid() AND recipient_id = recipient_id AND status = 'pending')
    OR (sender_id = recipient_id AND recipient_id = auth.uid() AND status = 'pending')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'A friend request already exists between these users'
    );
  END IF;
  
  -- Insert new request
  INSERT INTO friend_requests (sender_id, recipient_id, message)
  VALUES (auth.uid(), recipient_id, message)
  RETURNING id INTO new_request_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'request_id', new_request_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION accept_friend_request(request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  sender_id uuid;
  result jsonb;
  new_friendship_id uuid;
BEGIN
  -- Get sender_id from request
  SELECT fr.sender_id INTO sender_id
  FROM friend_requests fr
  WHERE fr.id = request_id AND fr.recipient_id = auth.uid() AND fr.status = 'pending';
  
  IF sender_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Friend request not found or not pending'
    );
  END IF;
  
  -- Update request status
  UPDATE friend_requests
  SET status = 'accepted', updated_at = now()
  WHERE id = request_id;
  
  -- Create friendship
  INSERT INTO friendships (user_id, friend_id)
  VALUES (auth.uid(), sender_id)
  RETURNING id INTO new_friendship_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'friendship_id', new_friendship_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION reject_friend_request(request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Update request status if it exists and belongs to the user
  UPDATE friend_requests
  SET status = 'rejected', updated_at = now()
  WHERE id = request_id AND (recipient_id = auth.uid() OR sender_id = auth.uid());
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Friend request not found'
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION remove_friend(friend_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  deleted_count int;
BEGIN
  -- Delete friendship in both directions
  WITH deleted AS (
    DELETE FROM friendships
    WHERE (user_id = auth.uid() AND friend_id = friend_id)
    OR (user_id = friend_id AND friend_id = auth.uid())
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  IF deleted_count > 0 THEN
    RETURN jsonb_build_object(
      'success', true
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Friendship not found'
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION search_users(search_query text, limit_count int DEFAULT 10, offset_count int DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  total_count int;
BEGIN
  -- Count total results
  SELECT COUNT(*) INTO total_count
  FROM profiles p
  WHERE p.user_id != auth.uid()
  AND (
    p.username ILIKE '%' || search_query || '%'
    OR p.display_name ILIKE '%' || search_query || '%'
  );
  
  -- Get search results with friendship status
  WITH search_results AS (
    SELECT 
      p.id,
      p.user_id,
      p.username,
      p.display_name,
      p.avatar_url,
      p.bio,
      EXISTS (
        SELECT 1 FROM friendships f
        WHERE (f.user_id = auth.uid() AND f.friend_id = p.user_id)
        OR (f.user_id = p.user_id AND f.friend_id = auth.uid())
      ) AS is_friend,
      EXISTS (
        SELECT 1 FROM friend_requests fr
        WHERE fr.sender_id = auth.uid() AND fr.recipient_id = p.user_id AND fr.status = 'pending'
      ) AS has_pending_request
    FROM profiles p
    WHERE p.user_id != auth.uid()
    AND (
      p.username ILIKE '%' || search_query || '%'
      OR p.display_name ILIKE '%' || search_query || '%'
    )
    ORDER BY 
      is_friend DESC,
      has_pending_request ASC,
      CASE WHEN p.username ILIKE search_query || '%' THEN 0
           WHEN p.display_name ILIKE search_query || '%' THEN 1
           ELSE 2
      END,
      p.username
    LIMIT limit_count
    OFFSET offset_count
  )
  SELECT jsonb_build_object(
    'success', true,
    'users', COALESCE(jsonb_agg(sr.*), '[]'::jsonb),
    'total', total_count
  ) INTO result
  FROM search_results sr;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_friend_suggestions(limit_count int DEFAULT 10)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH user_friends AS (
    -- Get all friends
    SELECT friend_id AS user_id FROM friendships WHERE user_id = auth.uid()
    UNION
    SELECT user_id FROM friendships WHERE friend_id = auth.uid()
  ),
  pending_requests AS (
    -- Get all pending requests (sent or received)
    SELECT recipient_id AS user_id FROM friend_requests 
    WHERE sender_id = auth.uid() AND status = 'pending'
    UNION
    SELECT sender_id FROM friend_requests 
    WHERE recipient_id = auth.uid() AND status = 'pending'
  ),
  suggestions AS (
    -- Get profiles that are not friends and have no pending requests
    SELECT 
      p.user_id,
      p.username,
      p.display_name,
      p.avatar_url,
      p.bio,
      -- Count mutual friends
      (
        SELECT COUNT(*)
        FROM friendships f1
        JOIN friendships f2 ON f1.friend_id = f2.user_id OR f1.user_id = f2.friend_id
        WHERE (f1.user_id = auth.uid() OR f1.friend_id = auth.uid())
        AND (f2.user_id = p.user_id OR f2.friend_id = p.user_id)
      ) AS mutual_friends_count
    FROM profiles p
    WHERE p.user_id != auth.uid()
    AND p.user_id NOT IN (SELECT user_id FROM user_friends)
    AND p.user_id NOT IN (SELECT user_id FROM pending_requests)
    AND p.is_public = true
    ORDER BY mutual_friends_count DESC, RANDOM()
    LIMIT limit_count
  )
  SELECT jsonb_build_object(
    'success', true,
    'suggestions', COALESCE(jsonb_agg(s.*), '[]'::jsonb)
  ) INTO result
  FROM suggestions s;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION check_friendship_status(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  friendship_status text;
  request_id uuid;
  is_sender boolean;
BEGIN
  -- Check if users are friends
  IF EXISTS (
    SELECT 1 FROM friendships 
    WHERE (user_id = auth.uid() AND friend_id = target_user_id) 
    OR (user_id = target_user_id AND friend_id = auth.uid())
  ) THEN
    friendship_status := 'friends';
  
  -- Check if there's a pending request from current user to target
  ELSIF EXISTS (
    SELECT 1 FROM friend_requests 
    WHERE sender_id = auth.uid() AND recipient_id = target_user_id AND status = 'pending'
  ) THEN
    friendship_status := 'request_sent';
    SELECT id INTO request_id FROM friend_requests 
    WHERE sender_id = auth.uid() AND recipient_id = target_user_id AND status = 'pending';
    is_sender := true;
  
  -- Check if there's a pending request from target to current user
  ELSIF EXISTS (
    SELECT 1 FROM friend_requests 
    WHERE sender_id = target_user_id AND recipient_id = auth.uid() AND status = 'pending'
  ) THEN
    friendship_status := 'request_received';
    SELECT id INTO request_id FROM friend_requests 
    WHERE sender_id = target_user_id AND recipient_id = auth.uid() AND status = 'pending';
    is_sender := false;
  
  -- No relationship
  ELSE
    friendship_status := 'none';
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'status', friendship_status,
    'request_id', request_id,
    'is_sender', is_sender
  );
END;
$$;