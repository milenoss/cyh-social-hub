/*
  # Fix Challenge Comments Function
  
  1. Changes
     - Fix syntax error in get_real_challenge_comments function
     - Properly handle grouping of comments and replies
     - Ensure correct ordering of results
  
  2. Security
     - Maintains existing security policies
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_real_challenge_comments;

-- Create the fixed function
CREATE OR REPLACE FUNCTION get_real_challenge_comments(challenge_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Use CTEs for better organization and performance
  WITH comment_data AS (
    SELECT
      c.id,
      c.challenge_id,
      c.user_id,
      c.parent_id,
      c.content,
      c.is_pinned,
      c.likes_count,
      c.created_at,
      c.updated_at,
      p.username,
      p.display_name,
      p.avatar_url,
      EXISTS (
        SELECT 1 FROM comment_likes_real cl
        WHERE cl.comment_id = c.id AND cl.user_id = auth.uid()
      ) AS is_liked
    FROM challenge_comments_real c
    JOIN profiles p ON c.user_id = p.user_id
    WHERE c.challenge_id = challenge_id_param
  ),
  
  -- Get all replies
  replies AS (
    SELECT
      r.id,
      r.parent_id,
      r.user_id,
      r.content,
      r.created_at,
      r.updated_at,
      r.likes_count,
      r.is_pinned,
      p.username,
      p.display_name,
      p.avatar_url,
      EXISTS (
        SELECT 1 FROM comment_likes_real cl
        WHERE cl.comment_id = r.id AND cl.user_id = auth.uid()
      ) AS is_liked
    FROM comment_data r
    WHERE r.parent_id IS NOT NULL
  ),
  
  -- Group replies by parent_id
  grouped_replies AS (
    SELECT
      r.parent_id,
      jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'user_id', r.user_id,
          'content', r.content,
          'created_at', r.created_at,
          'updated_at', r.updated_at,
          'likes_count', r.likes_count,
          'is_pinned', r.is_pinned,
          'user', jsonb_build_object(
            'id', r.user_id,
            'username', r.username,
            'display_name', r.display_name,
            'avatar_url', r.avatar_url
          ),
          'is_liked', r.is_liked
        ) ORDER BY r.created_at ASC
      ) AS replies
    FROM replies r
    GROUP BY r.parent_id
  )
  
  -- Get top-level comments with their replies
  SELECT jsonb_build_object(
    'success', true,
    'comments', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'user_id', c.user_id,
          'challenge_id', c.challenge_id,
          'content', c.content,
          'is_pinned', c.is_pinned,
          'likes_count', c.likes_count,
          'created_at', c.created_at,
          'updated_at', c.updated_at,
          'user', jsonb_build_object(
            'id', c.user_id,
            'username', c.username,
            'display_name', c.display_name,
            'avatar_url', c.avatar_url
          ),
          'is_liked', c.is_liked,
          'replies', COALESCE(gr.replies, '[]'::jsonb)
        )
        ORDER BY c.is_pinned DESC, c.created_at DESC
      ),
      '[]'::jsonb
    )
  ) INTO result
  FROM comment_data c
  LEFT JOIN grouped_replies gr ON gr.parent_id = c.id
  WHERE c.parent_id IS NULL;
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_real_challenge_comments TO authenticated;
GRANT EXECUTE ON FUNCTION get_real_challenge_comments TO anon;

-- Create a function to get challenge participants
CREATE OR REPLACE FUNCTION get_real_challenge_participants(challenge_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  total_count INTEGER;
  completed_count INTEGER;
  active_count INTEGER;
BEGIN
  -- Get counts
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE cp.status = 'completed'),
    COUNT(*) FILTER (WHERE cp.status = 'active')
  INTO total_count, completed_count, active_count
  FROM challenge_participants cp
  WHERE cp.challenge_id = challenge_id_param;
  
  -- Get participants with profile data
  SELECT jsonb_build_object(
    'success', true,
    'participants', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', cp.id,
          'user_id', cp.user_id,
          'username', p.username,
          'display_name', p.display_name,
          'avatar_url', p.avatar_url,
          'progress', cp.progress,
          'status', cp.status,
          'joined_at', COALESCE(cp.started_at, cp.created_at),
          'last_check_in', cp.last_check_in,
          'check_in_streak', cp.check_in_streak
        )
        ORDER BY 
          CASE WHEN cp.status = 'completed' THEN 0 ELSE 1 END,
          cp.progress DESC,
          cp.last_check_in DESC NULLS LAST
      ),
      '[]'::jsonb
    ),
    'total_count', total_count,
    'completed_count', completed_count,
    'active_count', active_count
  ) INTO result
  FROM challenge_participants cp
  JOIN profiles p ON cp.user_id = p.user_id
  WHERE cp.challenge_id = challenge_id_param;
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_real_challenge_participants TO authenticated;
GRANT EXECUTE ON FUNCTION get_real_challenge_participants TO anon;