/*
  # Fix Challenge Comments Functions

  1. Changes
     - Rewrites the get_real_challenge_comments function to fix GROUP BY issues
     - Recreates add_real_challenge_comment function
     - Recreates toggle_real_comment_like function
     - Recreates toggle_comment_pin function
  
  2. Security
     - All functions maintain SECURITY DEFINER
     - Proper authentication checks
*/

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_real_challenge_comments(uuid, integer, integer);
DROP FUNCTION IF EXISTS add_real_challenge_comment(uuid, text, uuid);
DROP FUNCTION IF EXISTS toggle_real_comment_like(uuid);
DROP FUNCTION IF EXISTS toggle_comment_pin(uuid);

-- Create the corrected get_real_challenge_comments function
CREATE OR REPLACE FUNCTION get_real_challenge_comments(
  challenge_id_param uuid,
  limit_count integer DEFAULT 50,
  offset_count integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  comments_data json;
BEGIN
  -- Get top-level comments
  WITH top_comments AS (
    SELECT 
      c.id,
      c.user_id,
      c.challenge_id,
      c.content,
      c.created_at,
      c.updated_at,
      c.likes_count,
      c.is_pinned,
      c.parent_id,
      json_build_object(
        'id', p.user_id,
        'username', COALESCE(p.username, split_part(u.email, '@', 1)),
        'display_name', COALESCE(p.display_name, split_part(u.email, '@', 1)),
        'avatar_url', p.avatar_url
      ) AS user_data,
      CASE 
        WHEN auth.uid() IS NOT NULL THEN 
          EXISTS(
            SELECT 1 FROM comment_likes_real cl 
            WHERE cl.comment_id = c.id AND cl.user_id = auth.uid()
          )
        ELSE false
      END AS is_liked
    FROM challenge_comments_real c
    LEFT JOIN profiles p ON c.user_id = p.user_id
    LEFT JOIN auth.users u ON c.user_id = u.id
    WHERE c.challenge_id = challenge_id_param 
      AND c.parent_id IS NULL
    ORDER BY 
      CASE WHEN c.is_pinned THEN 0 ELSE 1 END,
      c.created_at DESC
    LIMIT limit_count
    OFFSET offset_count
  ),
  -- Get replies for those comments
  replies AS (
    SELECT 
      r.id,
      r.user_id,
      r.challenge_id,
      r.content,
      r.created_at,
      r.updated_at,
      r.likes_count,
      r.is_pinned,
      r.parent_id,
      json_build_object(
        'id', rp.user_id,
        'username', COALESCE(rp.username, split_part(ru.email, '@', 1)),
        'display_name', COALESCE(rp.display_name, split_part(ru.email, '@', 1)),
        'avatar_url', rp.avatar_url
      ) AS user_data,
      CASE 
        WHEN auth.uid() IS NOT NULL THEN 
          EXISTS(
            SELECT 1 FROM comment_likes_real rcl 
            WHERE rcl.comment_id = r.id AND rcl.user_id = auth.uid()
          )
        ELSE false
      END AS is_liked
    FROM challenge_comments_real r
    LEFT JOIN profiles rp ON r.user_id = rp.user_id
    LEFT JOIN auth.users ru ON r.user_id = ru.id
    WHERE r.parent_id IN (SELECT id FROM top_comments)
  ),
  -- Group replies by parent
  grouped_replies AS (
    SELECT 
      parent_id,
      json_agg(
        json_build_object(
          'id', id,
          'user_id', user_id,
          'challenge_id', challenge_id,
          'content', content,
          'created_at', created_at,
          'updated_at', updated_at,
          'likes_count', likes_count,
          'is_pinned', is_pinned,
          'parent_id', parent_id,
          'user', user_data,
          'is_liked', is_liked
        ) ORDER BY created_at ASC
      ) AS replies_data
    FROM replies
    GROUP BY parent_id
  )
  -- Combine top comments with their replies
  SELECT json_agg(
    json_build_object(
      'id', c.id,
      'user_id', c.user_id,
      'challenge_id', c.challenge_id,
      'content', c.content,
      'created_at', c.created_at,
      'updated_at', c.updated_at,
      'likes_count', c.likes_count,
      'is_pinned', c.is_pinned,
      'parent_id', c.parent_id,
      'user', c.user_data,
      'is_liked', c.is_liked,
      'replies', COALESCE(r.replies_data, '[]'::json)
    )
  )
  INTO comments_data
  FROM top_comments c
  LEFT JOIN grouped_replies r ON r.parent_id = c.id;

  -- Build the response
  result := json_build_object(
    'success', true,
    'comments', COALESCE(comments_data, '[]'::json),
    'message', 'Comments fetched successfully'
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'comments', '[]'::json,
      'message', 'Error fetching comments: ' || SQLERRM
    );
END;
$$;

-- Create function to add comments
CREATE OR REPLACE FUNCTION add_real_challenge_comment(
  challenge_id_param uuid,
  content_text text,
  parent_id_param uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_comment_id uuid;
  result json;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Authentication required'
    );
  END IF;

  -- Insert the comment
  INSERT INTO challenge_comments_real (
    challenge_id,
    user_id,
    content,
    parent_id
  ) VALUES (
    challenge_id_param,
    auth.uid(),
    content_text,
    parent_id_param
  )
  RETURNING id INTO new_comment_id;

  -- Return success response
  result := json_build_object(
    'success', true,
    'comment_id', new_comment_id,
    'message', 'Comment added successfully'
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Error adding comment: ' || SQLERRM
    );
END;
$$;

-- Create function to toggle comment likes
CREATE OR REPLACE FUNCTION toggle_real_comment_like(
  comment_id_param uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  like_exists boolean;
  new_like_count integer;
  result json;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Authentication required'
    );
  END IF;

  -- Check if like already exists
  SELECT EXISTS(
    SELECT 1 FROM comment_likes_real 
    WHERE comment_id = comment_id_param AND user_id = auth.uid()
  ) INTO like_exists;

  IF like_exists THEN
    -- Remove like
    DELETE FROM comment_likes_real 
    WHERE comment_id = comment_id_param AND user_id = auth.uid();
    
    -- Update comment likes count
    UPDATE challenge_comments_real 
    SET likes_count = likes_count - 1 
    WHERE id = comment_id_param;
  ELSE
    -- Add like
    INSERT INTO comment_likes_real (comment_id, user_id) 
    VALUES (comment_id_param, auth.uid());
    
    -- Update comment likes count
    UPDATE challenge_comments_real 
    SET likes_count = likes_count + 1 
    WHERE id = comment_id_param;
  END IF;

  -- Get updated like count
  SELECT likes_count INTO new_like_count 
  FROM challenge_comments_real 
  WHERE id = comment_id_param;

  -- Return success response
  result := json_build_object(
    'success', true,
    'is_liked', NOT like_exists,
    'likes_count', new_like_count,
    'message', 'Like toggled successfully'
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Error toggling like: ' || SQLERRM
    );
END;
$$;

-- Create function to toggle comment pin status (for challenge owners)
CREATE OR REPLACE FUNCTION toggle_comment_pin(
  comment_id_param uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  challenge_owner_id uuid;
  current_pin_status boolean;
  result json;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Authentication required'
    );
  END IF;

  -- Get challenge owner and current pin status
  SELECT c.created_by, cc.is_pinned
  INTO challenge_owner_id, current_pin_status
  FROM challenge_comments_real cc
  JOIN challenges c ON cc.challenge_id = c.id
  WHERE cc.id = comment_id_param;

  -- Check if user is the challenge owner
  IF challenge_owner_id != auth.uid() THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Only challenge owners can pin comments'
    );
  END IF;

  -- Toggle pin status
  UPDATE challenge_comments_real 
  SET is_pinned = NOT current_pin_status
  WHERE id = comment_id_param;

  -- Return success response
  result := json_build_object(
    'success', true,
    'is_pinned', NOT current_pin_status,
    'message', 'Comment pin status updated successfully'
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Error toggling pin status: ' || SQLERRM
    );
END;
$$;