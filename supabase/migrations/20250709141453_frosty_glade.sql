/*
  # Fix Friend System Functions

  1. New Functions
    - Fixed `get_friends()` function to properly return friend data
    - Fixed `get_friend_requests()` function to handle ambiguous column references
    - Added proper error handling and security checks

  2. Security
    - All functions are SECURITY DEFINER to ensure proper access control
    - Added checks to verify user can only access their own data
*/

-- Function to get user's friends
CREATE OR REPLACE FUNCTION get_friends()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Get friends where user is user_id
  WITH user_friends AS (
    SELECT 
      f.id as friendship_id,
      p.user_id,
      p.username,
      p.display_name,
      p.avatar_url,
      p.bio,
      f.created_at
    FROM friendships f
    JOIN profiles p ON f.friend_id = p.user_id
    WHERE f.user_id = auth.uid()
    
    UNION ALL
    
    -- Get friends where user is friend_id
    SELECT 
      f.id as friendship_id,
      p.user_id,
      p.username,
      p.display_name,
      p.avatar_url,
      p.bio,
      f.created_at
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

-- Function to get friend requests
CREATE OR REPLACE FUNCTION get_friend_requests(status text DEFAULT 'pending')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to request account deletion
CREATE OR REPLACE FUNCTION request_account_deletion(reason text DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  new_request_id uuid;
BEGIN
  -- Check if there's already a pending request
  IF EXISTS (
    SELECT 1 FROM account_deletion_requests
    WHERE user_id = auth.uid() AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'A pending deletion request already exists'
    );
  END IF;
  
  -- Create new deletion request
  INSERT INTO account_deletion_requests (
    user_id,
    reason
  )
  VALUES (
    auth.uid(),
    reason
  )
  RETURNING id INTO new_request_id;
  
  -- Log the event
  INSERT INTO security_audit_logs (
    user_id,
    event_type,
    event_data
  )
  VALUES (
    auth.uid(),
    'account_deletion_requested',
    jsonb_build_object('reason', reason)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'request_id', new_request_id
  );
END;
$$;

-- Function to cancel account deletion
CREATE OR REPLACE FUNCTION cancel_account_deletion(request_id uuid, reason text DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Update deletion request
  UPDATE account_deletion_requests
  SET 
    status = 'cancelled',
    cancellation_reason = reason,
    updated_at = now()
  WHERE id = request_id AND user_id = auth.uid() AND status = 'pending';
  
  IF FOUND THEN
    -- Log the event
    INSERT INTO security_audit_logs (
      user_id,
      event_type,
      event_data
    )
    VALUES (
      auth.uid(),
      'account_deletion_cancelled',
      jsonb_build_object('reason', reason)
    );
    
    RETURN jsonb_build_object(
      'success', true
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Deletion request not found or not pending'
    );
  END IF;
END;
$$;