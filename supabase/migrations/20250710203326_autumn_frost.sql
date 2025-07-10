/*
  # Fix get_real_challenge_comments function

  1. Database Function Fix
    - Update `get_real_challenge_comments` function to fix GROUP BY clause error
    - Ensure all non-aggregated columns are included in GROUP BY or use aggregate functions
    - Maintain proper comment threading and like counting functionality

  2. Changes
    - Fix SQL query structure to comply with PostgreSQL GROUP BY requirements
    - Preserve comment hierarchy and like counts
    - Ensure proper ordering and data integrity
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_real_challenge_comments(uuid);

-- Create the corrected function
CREATE OR REPLACE FUNCTION get_real_challenge_comments(challenge_id_param uuid)
RETURNS TABLE (
  id uuid,
  challenge_id uuid,
  user_id uuid,
  parent_id uuid,
  content text,
  is_pinned boolean,
  likes_count integer,
  created_at timestamptz,
  updated_at timestamptz,
  user_display_name text,
  user_avatar_url text,
  user_liked boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.challenge_id,
    c.user_id,
    c.parent_id,
    c.content,
    c.is_pinned,
    COALESCE(like_counts.count, 0)::integer as likes_count,
    c.created_at,
    c.updated_at,
    COALESCE(p.display_name, p.username, 'Anonymous') as user_display_name,
    p.avatar_url as user_avatar_url,
    CASE 
      WHEN user_likes.comment_id IS NOT NULL THEN true 
      ELSE false 
    END as user_liked
  FROM challenge_comments_real c
  LEFT JOIN profiles p ON c.user_id = p.user_id
  LEFT JOIN (
    SELECT 
      comment_id, 
      COUNT(*) as count
    FROM comment_likes_real 
    GROUP BY comment_id
  ) like_counts ON c.id = like_counts.comment_id
  LEFT JOIN comment_likes_real user_likes ON c.id = user_likes.comment_id 
    AND user_likes.user_id = auth.uid()
  WHERE c.challenge_id = challenge_id_param
  ORDER BY 
    c.is_pinned DESC,
    c.created_at ASC;
END;
$$;