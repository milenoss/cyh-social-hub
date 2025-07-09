/*
  # Fix get_friend_suggestions function

  1. Changes
     - Fix SQL error in get_friend_suggestions function by removing ORDER BY p.created_at
     - Replace with ORDER BY RANDOM() to provide varied suggestions
     - Ensure proper handling of aggregation in the function
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS public.get_friend_suggestions(integer);

-- Create get_friend_suggestions function with fixed ordering
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
  -- Using RANDOM() instead of created_at to avoid GROUP BY issues
  ORDER BY RANDOM()
  LIMIT limit_count;

  RETURN suggestions_data;
END;
$$;