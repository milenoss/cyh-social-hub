/*
  # Fix get_real_challenge_comments function

  1. Database Functions
    - Drop and recreate `get_real_challenge_comments` function with proper SQL syntax
    - Fix GROUP BY clause issues with r.created_at column
    - Add proper aggregation for comment counts and user data
    - Include support for nested replies and like counts

  2. Function Features
    - Fetches comments with user profile information
    - Includes reply counts and like status for authenticated users
    - Supports pagination with limit and offset
    - Returns structured JSON response with success status
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_real_challenge_comments(uuid, integer, integer);

-- Create the corrected function
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
  -- Get comments with user data and aggregated information
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
      'user', json_build_object(
        'id', p.user_id,
        'username', COALESCE(p.username, split_part(u.email, '@', 1)),
        'display_name', COALESCE(p.display_name, split_part(u.email, '@', 1)),
        'avatar_url', p.avatar_url
      ),
      'is_liked', CASE 
        WHEN auth.uid() IS NOT NULL THEN 
          EXISTS(
            SELECT 1 FROM comment_likes_real cl 
            WHERE cl.comment_id = c.id AND cl.user_id = auth.uid()
          )
        ELSE false
      END,
      'replies', COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', r.id,
              'user_id', r.user_id,
              'challenge_id', r.challenge_id,
              'content', r.content,
              'created_at', r.created_at,
              'updated_at', r.updated_at,
              'likes_count', r.likes_count,
              'is_pinned', r.is_pinned,
              'parent_id', r.parent_id,
              'user', json_build_object(
                'id', rp.user_id,
                'username', COALESCE(rp.username, split_part(ru.email, '@', 1)),
                'display_name', COALESCE(rp.display_name, split_part(ru.email, '@', 1)),
                'avatar_url', rp.avatar_url
              ),
              'is_liked', CASE 
                WHEN auth.uid() IS NOT NULL THEN 
                  EXISTS(
                    SELECT 1 FROM comment_likes_real rcl 
                    WHERE rcl.comment_id = r.id AND rcl.user_id = auth.uid()
                  )
                ELSE false
              END
            )
            ORDER BY r.created_at ASC
          )
          FROM challenge_comments_real r
          LEFT JOIN profiles rp ON r.user_id = rp.user_id
          LEFT JOIN auth.users ru ON r.user_id = ru.id
          WHERE r.parent_id = c.id
        ),
        '[]'::json
      )
    )
    ORDER BY 
      CASE WHEN c.is_pinned THEN 0 ELSE 1 END,
      c.created_at DESC
  )
  INTO comments_data
  FROM challenge_comments_real c
  LEFT JOIN profiles p ON c.user_id = p.user_id
  LEFT JOIN auth.users u ON c.user_id = u.id
  WHERE c.challenge_id = challenge_id_param 
    AND c.parent_id IS NULL
  LIMIT limit_count
  OFFSET offset_count;

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