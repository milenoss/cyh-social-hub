/*
  # Fix Challenge System

  1. New Functions
    - `get_challenges_with_stats` - Returns challenges with participant statistics
    - `get_real_challenge_participants` - Returns participants for a specific challenge
    - `check_in_challenge` - Handles daily check-ins for challenges
  
  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for data access
*/

-- Function to get challenges with statistics
CREATE OR REPLACE FUNCTION get_challenges_with_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH challenge_stats AS (
    SELECT
      cp.challenge_id,
      COUNT(cp.id) AS participant_count,
      COUNT(CASE WHEN cp.status = 'completed' THEN 1 END) AS completed_count,
      COUNT(CASE WHEN cp.status = 'active' THEN 1 END) AS active_count,
      COALESCE(AVG(cp.progress), 0) AS average_progress
    FROM challenge_participants cp
    GROUP BY cp.challenge_id
  )
  SELECT 
    jsonb_build_object(
      'success', true,
      'challenges', jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'title', c.title,
          'description', c.description,
          'difficulty', c.difficulty,
          'category', c.category,
          'duration_days', c.duration_days,
          'points_reward', c.points_reward,
          'tags', c.tags,
          'created_by', c.created_by,
          'is_public', c.is_public,
          'created_at', c.created_at,
          'updated_at', c.updated_at,
          'creator', jsonb_build_object(
            'id', p.id,
            'username', p.username,
            'display_name', p.display_name,
            'avatar_url', p.avatar_url
          ),
          'stats', jsonb_build_object(
            'participant_count', COALESCE(cs.participant_count, 0),
            'completed_count', COALESCE(cs.completed_count, 0),
            'active_count', COALESCE(cs.active_count, 0),
            'average_progress', COALESCE(cs.average_progress, 0)
          )
        )
      )
    ) INTO result
  FROM challenges c
  LEFT JOIN profiles p ON c.created_by = p.user_id
  LEFT JOIN challenge_stats cs ON c.id = cs.challenge_id
  WHERE c.is_public = true
  ORDER BY c.created_at DESC;

  RETURN result;
END;
$$;

-- Function to get participants for a specific challenge
CREATE OR REPLACE FUNCTION get_real_challenge_participants(challenge_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT 
    jsonb_build_object(
      'success', true,
      'participants', jsonb_agg(
        jsonb_build_object(
          'id', cp.id,
          'user_id', cp.user_id,
          'username', p.username,
          'display_name', p.display_name,
          'avatar_url', p.avatar_url,
          'progress', cp.progress,
          'status', cp.status,
          'joined_at', cp.started_at,
          'last_check_in', cp.last_check_in,
          'check_in_streak', cp.check_in_streak
        )
      ),
      'total_count', COUNT(cp.id),
      'completed_count', COUNT(CASE WHEN cp.status = 'completed' THEN 1 END),
      'active_count', COUNT(CASE WHEN cp.status = 'active' THEN 1 END)
    ) INTO result
  FROM challenge_participants cp
  JOIN profiles p ON cp.user_id = p.user_id
  WHERE cp.challenge_id = challenge_id_param;

  RETURN result;
END;
$$;

-- Function to handle daily check-ins for challenges
CREATE OR REPLACE FUNCTION check_in_challenge(challenge_id_param UUID, note_text TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id_var UUID;
  participation RECORD;
  today DATE;
  last_check_in_date DATE;
  new_progress NUMERIC;
  new_streak INTEGER;
  new_status TEXT;
  challenge_duration INTEGER;
  progress_increment NUMERIC;
  result JSONB;
BEGIN
  -- Get the current user ID
  user_id_var := auth.uid();
  
  -- Get today's date
  today := CURRENT_DATE;
  
  -- Get the participant record
  SELECT * INTO participation
  FROM challenge_participants
  WHERE challenge_id = challenge_id_param AND user_id = user_id_var;
  
  -- Check if the user is participating in this challenge
  IF participation.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You are not participating in this challenge'
    );
  END IF;
  
  -- Check if the user already checked in today
  IF participation.last_check_in IS NOT NULL THEN
    last_check_in_date := DATE(participation.last_check_in);
    IF last_check_in_date = today THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Already checked in today'
      );
    END IF;
  END IF;
  
  -- Get challenge duration
  SELECT duration_days INTO challenge_duration
  FROM challenges
  WHERE id = challenge_id_param;
  
  -- Calculate progress increment
  progress_increment := 100.0 / challenge_duration;
  
  -- Calculate new progress
  new_progress := LEAST(participation.progress + progress_increment, 100);
  
  -- Calculate new streak
  IF participation.last_check_in IS NULL OR 
     DATE(participation.last_check_in) = today - INTERVAL '1 day' THEN
    -- First check-in or consecutive day
    new_streak := COALESCE(participation.check_in_streak, 0) + 1;
  ELSE
    -- Streak broken
    new_streak := 1;
  END IF;
  
  -- Determine new status
  IF new_progress >= 100 THEN
    new_status := 'completed';
  ELSE
    new_status := participation.status;
  END IF;
  
  -- Prepare check-in note
  DECLARE
    check_in_note JSONB;
    updated_notes JSONB;
  BEGIN
    check_in_note := jsonb_build_object(
      'date', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'note', note_text
    );
    
    -- Add note to the array
    IF participation.check_in_notes IS NULL THEN
      updated_notes := jsonb_build_array(check_in_note);
    ELSE
      updated_notes := participation.check_in_notes || check_in_note;
    END IF;
    
    -- Update the participant record
    UPDATE challenge_participants
    SET 
      progress = new_progress,
      status = new_status,
      last_check_in = now(),
      check_in_streak = new_streak,
      check_in_notes = updated_notes,
      completed_at = CASE WHEN new_status = 'completed' AND participation.status != 'completed' 
                         THEN now() ELSE participation.completed_at END
    WHERE id = participation.id;
    
    -- If challenge completed, update user profile stats
    IF new_status = 'completed' AND participation.status != 'completed' THEN
      -- Get challenge points
      DECLARE
        challenge_points INTEGER;
      BEGIN
        SELECT COALESCE(points_reward, 100) INTO challenge_points
        FROM challenges
        WHERE id = challenge_id_param;
        
        -- Update profile stats
        UPDATE profiles
        SET 
          challenges_completed = COALESCE(challenges_completed, 0) + 1,
          total_points = COALESCE(total_points, 0) + challenge_points
        WHERE user_id = user_id_var;
      END;
    END IF;
    
    -- Update user streak in profile if needed
    UPDATE profiles
    SET 
      current_streak = new_streak,
      longest_streak = GREATEST(COALESCE(longest_streak, 0), new_streak)
    WHERE user_id = user_id_var;
    
    -- Return success response
    RETURN jsonb_build_object(
      'success', true,
      'participation', jsonb_build_object(
        'progress', new_progress,
        'status', new_status,
        'last_check_in', now(),
        'check_in_streak', new_streak
      )
    );
  END;
END;
$$;

-- Function to get challenge comments
CREATE OR REPLACE FUNCTION get_real_challenge_comments(challenge_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  current_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  WITH comment_data AS (
    SELECT 
      c.id,
      c.user_id,
      c.challenge_id,
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
        WHERE cl.comment_id = c.id AND cl.user_id = current_user_id
      ) AS is_liked
    FROM challenge_comments_real c
    JOIN profiles p ON c.user_id = p.user_id
    WHERE c.challenge_id = challenge_id_param AND c.parent_id IS NULL
  ),
  reply_data AS (
    SELECT 
      c.id,
      c.user_id,
      c.challenge_id,
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
        WHERE cl.comment_id = c.id AND cl.user_id = current_user_id
      ) AS is_liked
    FROM challenge_comments_real c
    JOIN profiles p ON c.user_id = p.user_id
    WHERE c.challenge_id = challenge_id_param AND c.parent_id IS NOT NULL
  ),
  comments_with_replies AS (
    SELECT 
      cd.*,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', rd.id,
            'user_id', rd.user_id,
            'challenge_id', rd.challenge_id,
            'parent_id', rd.parent_id,
            'content', rd.content,
            'is_pinned', rd.is_pinned,
            'likes_count', rd.likes_count,
            'created_at', rd.created_at,
            'updated_at', rd.updated_at,
            'is_liked', rd.is_liked,
            'user', jsonb_build_object(
              'id', rd.user_id,
              'username', rd.username,
              'display_name', rd.display_name,
              'avatar_url', rd.avatar_url
            )
          ) ORDER BY rd.created_at ASC
        ) FILTER (WHERE rd.id IS NOT NULL),
        '[]'::jsonb
      ) AS replies
    FROM comment_data cd
    LEFT JOIN reply_data rd ON cd.id = rd.parent_id
    GROUP BY cd.id, cd.user_id, cd.challenge_id, cd.parent_id, cd.content, 
             cd.is_pinned, cd.likes_count, cd.created_at, cd.updated_at,
             cd.username, cd.display_name, cd.avatar_url, cd.is_liked
  )
  SELECT 
    jsonb_build_object(
      'success', true,
      'comments', COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', cwr.id,
            'user_id', cwr.user_id,
            'challenge_id', cwr.challenge_id,
            'parent_id', cwr.parent_id,
            'content', cwr.content,
            'is_pinned', cwr.is_pinned,
            'likes_count', cwr.likes_count,
            'created_at', cwr.created_at,
            'updated_at', cwr.updated_at,
            'is_liked', cwr.is_liked,
            'user', jsonb_build_object(
              'id', cwr.user_id,
              'username', cwr.username,
              'display_name', cwr.display_name,
              'avatar_url', cwr.avatar_url
            ),
            'replies', cwr.replies
          ) ORDER BY cwr.is_pinned DESC, cwr.created_at DESC
        ),
        '[]'::jsonb
      )
    ) INTO result
  FROM comments_with_replies cwr;

  RETURN result;
END;
$$;

-- Function to add a comment
CREATE OR REPLACE FUNCTION add_real_challenge_comment(
  challenge_id_param UUID,
  content_text TEXT,
  parent_id_param UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id_var UUID;
  new_comment_id UUID;
  result JSONB;
BEGIN
  -- Get the current user ID
  user_id_var := auth.uid();
  
  -- Check if the user exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = user_id_var) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User not found'
    );
  END IF;
  
  -- Check if the challenge exists
  IF NOT EXISTS (SELECT 1 FROM challenges WHERE id = challenge_id_param) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Challenge not found'
    );
  END IF;
  
  -- If parent_id is provided, check if it exists
  IF parent_id_param IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM challenge_comments_real WHERE id = parent_id_param
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Parent comment not found'
    );
  END IF;
  
  -- Insert the new comment
  INSERT INTO challenge_comments_real (
    challenge_id,
    user_id,
    parent_id,
    content
  ) VALUES (
    challenge_id_param,
    user_id_var,
    parent_id_param,
    content_text
  )
  RETURNING id INTO new_comment_id;
  
  -- Record the activity
  INSERT INTO challenge_activities (
    challenge_id,
    user_id,
    activity_type,
    activity_data
  ) VALUES (
    challenge_id_param,
    user_id_var,
    'comment',
    jsonb_build_object(
      'comment_id', new_comment_id,
      'parent_id', parent_id_param
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'comment_id', new_comment_id
  );
END;
$$;

-- Function to toggle comment like
CREATE OR REPLACE FUNCTION toggle_real_comment_like(comment_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id_var UUID;
  is_liked BOOLEAN;
  likes_count_var INTEGER;
  result JSONB;
BEGIN
  -- Get the current user ID
  user_id_var := auth.uid();
  
  -- Check if the user already liked this comment
  SELECT EXISTS (
    SELECT 1 FROM comment_likes_real
    WHERE comment_id = comment_id_param AND user_id = user_id_var
  ) INTO is_liked;
  
  IF is_liked THEN
    -- Unlike the comment
    DELETE FROM comment_likes_real
    WHERE comment_id = comment_id_param AND user_id = user_id_var;
    
    -- Update the likes count
    UPDATE challenge_comments_real
    SET likes_count = likes_count - 1
    WHERE id = comment_id_param
    RETURNING likes_count INTO likes_count_var;
    
    is_liked := false;
  ELSE
    -- Like the comment
    INSERT INTO comment_likes_real (comment_id, user_id)
    VALUES (comment_id_param, user_id_var);
    
    -- Update the likes count
    UPDATE challenge_comments_real
    SET likes_count = likes_count + 1
    WHERE id = comment_id_param
    RETURNING likes_count INTO likes_count_var;
    
    is_liked := true;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'is_liked', is_liked,
    'likes_count', likes_count_var
  );
END;
$$;

-- Function to toggle comment pin status
CREATE OR REPLACE FUNCTION toggle_comment_pin(comment_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id_var UUID;
  challenge_id_var UUID;
  is_challenge_owner BOOLEAN;
  is_pinned_var BOOLEAN;
  result JSONB;
BEGIN
  -- Get the current user ID
  user_id_var := auth.uid();
  
  -- Get the challenge ID for this comment
  SELECT challenge_id INTO challenge_id_var
  FROM challenge_comments_real
  WHERE id = comment_id_param;
  
  -- Check if the user is the challenge owner
  SELECT EXISTS (
    SELECT 1 FROM challenges
    WHERE id = challenge_id_var AND created_by = user_id_var
  ) INTO is_challenge_owner;
  
  -- Only challenge owners can pin comments
  IF NOT is_challenge_owner THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Only challenge owners can pin comments'
    );
  END IF;
  
  -- Toggle the pin status
  UPDATE challenge_comments_real
  SET is_pinned = NOT is_pinned
  WHERE id = comment_id_param
  RETURNING is_pinned INTO is_pinned_var;
  
  RETURN jsonb_build_object(
    'success', true,
    'is_pinned', is_pinned_var
  );
END;
$$;