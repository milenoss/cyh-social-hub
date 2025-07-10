/*
# Real-Time Challenge Data Implementation

1. New Tables
   - `challenge_activities` - Tracks user activities in challenges
   - `challenge_comments_real` - Real-time comments for challenges

2. Security
   - Enable RLS on all new tables
   - Add policies for proper access control
   - Ensure data integrity with constraints

3. Changes
   - Add real-time subscription support
   - Improve participant tracking
   - Enhance comment functionality
*/

-- Create a table for real-time challenge activities
CREATE TABLE IF NOT EXISTS challenge_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('join', 'progress', 'complete', 'comment', 'like')),
  activity_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on challenge activities
ALTER TABLE challenge_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for challenge activities
CREATE POLICY "Challenge activities are viewable by everyone" 
ON challenge_activities 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own activities" 
ON challenge_activities 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create a function to record challenge activity
CREATE OR REPLACE FUNCTION record_challenge_activity(
  challenge_id_param UUID,
  activity_type_param TEXT,
  activity_data_param JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id_val UUID;
  result JSONB;
BEGIN
  -- Get the current user ID
  user_id_val := auth.uid();
  
  IF user_id_val IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User not authenticated'
    );
  END IF;

  -- Insert activity record
  INSERT INTO challenge_activities (
    challenge_id,
    user_id,
    activity_type,
    activity_data
  ) VALUES (
    challenge_id_param,
    user_id_val,
    activity_type_param,
    activity_data_param
  );

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Activity recorded'
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION record_challenge_activity(UUID, TEXT, JSONB) TO authenticated;

-- Create a function to get real-time challenge participants
CREATE OR REPLACE FUNCTION get_real_challenge_participants(
  challenge_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  participants JSONB;
  total_count INTEGER;
  completed_count INTEGER;
  active_count INTEGER;
BEGIN
  -- Get total participants count
  SELECT COUNT(*) INTO total_count
  FROM challenge_participants
  WHERE challenge_id = challenge_id_param;
  
  -- Get completed participants count
  SELECT COUNT(*) INTO completed_count
  FROM challenge_participants
  WHERE challenge_id = challenge_id_param
  AND status = 'completed';
  
  -- Get active participants count
  SELECT COUNT(*) INTO active_count
  FROM challenge_participants
  WHERE challenge_id = challenge_id_param
  AND status = 'active';
  
  -- Get participants with profile information
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', cp.id,
      'user_id', cp.user_id,
      'username', p.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url,
      'progress', cp.progress,
      'status', cp.status,
      'joined_at', cp.created_at,
      'last_check_in', cp.last_check_in,
      'check_in_streak', cp.check_in_streak
    )
  )
  INTO participants
  FROM challenge_participants cp
  JOIN profiles p ON cp.user_id = p.user_id
  WHERE cp.challenge_id = challenge_id_param
  ORDER BY 
    CASE WHEN cp.status = 'completed' THEN 0 ELSE 1 END,
    cp.progress DESC, 
    cp.last_check_in DESC NULLS LAST;
  
  -- Return participants data
  RETURN jsonb_build_object(
    'success', true,
    'participants', COALESCE(participants, '[]'::jsonb),
    'total_count', total_count,
    'completed_count', completed_count,
    'active_count', active_count
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_real_challenge_participants(UUID) TO authenticated;

-- Create a real-time comments table with improved structure
CREATE TABLE IF NOT EXISTS challenge_comments_real (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES challenge_comments_real(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on challenge comments
ALTER TABLE challenge_comments_real ENABLE ROW LEVEL SECURITY;

-- Create policies for challenge comments
CREATE POLICY "Comments are viewable by everyone" 
ON challenge_comments_real 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own comments" 
ON challenge_comments_real 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" 
ON challenge_comments_real 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" 
ON challenge_comments_real 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Challenge creators can manage all comments" 
ON challenge_comments_real 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM challenges c 
    WHERE c.id = challenge_id AND c.created_by = auth.uid()
  )
);

-- Create a trigger for updated_at on challenge comments
CREATE TRIGGER update_challenge_comments_real_updated_at
BEFORE UPDATE ON challenge_comments_real
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create a table for comment likes
CREATE TABLE IF NOT EXISTS comment_likes_real (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES challenge_comments_real(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS on comment likes
ALTER TABLE comment_likes_real ENABLE ROW LEVEL SECURITY;

-- Create policies for comment likes
CREATE POLICY "Users can view comment likes" 
ON comment_likes_real 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own likes" 
ON comment_likes_real 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes" 
ON comment_likes_real 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create a function to get real-time challenge comments
CREATE OR REPLACE FUNCTION get_real_challenge_comments(
  challenge_id_param UUID,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  comments JSONB;
  total_count INTEGER;
  is_challenge_creator BOOLEAN;
BEGIN
  -- Check if user is the challenge creator
  SELECT EXISTS (
    SELECT 1 FROM challenges 
    WHERE id = challenge_id_param AND created_by = auth.uid()
  ) INTO is_challenge_creator;

  -- Get total count
  SELECT COUNT(*) INTO total_count
  FROM challenge_comments_real
  WHERE challenge_id = challenge_id_param
  AND parent_id IS NULL;
  
  -- Get comments with user information
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', cc.id,
      'content', cc.content,
      'created_at', cc.created_at,
      'updated_at', cc.updated_at,
      'likes_count', cc.likes_count,
      'is_pinned', cc.is_pinned,
      'user', jsonb_build_object(
        'id', p.id,
        'user_id', p.user_id,
        'username', p.username,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url
      ),
      'is_liked', EXISTS (
        SELECT 1 FROM comment_likes_real cl 
        WHERE cl.comment_id = cc.id AND cl.user_id = auth.uid()
      ),
      'replies', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'content', r.content,
            'created_at', r.created_at,
            'updated_at', r.updated_at,
            'likes_count', r.likes_count,
            'user', jsonb_build_object(
              'id', rp.id,
              'user_id', rp.user_id,
              'username', rp.username,
              'display_name', rp.display_name,
              'avatar_url', rp.avatar_url
            ),
            'is_liked', EXISTS (
              SELECT 1 FROM comment_likes_real cl 
              WHERE cl.comment_id = r.id AND cl.user_id = auth.uid()
            )
          )
        )
        FROM challenge_comments_real r
        JOIN profiles rp ON r.user_id = rp.user_id
        WHERE r.parent_id = cc.id
        ORDER BY r.created_at ASC
      ),
      'can_edit', (cc.user_id = auth.uid() OR is_challenge_creator),
      'can_pin', is_challenge_creator
    )
  )
  INTO comments
  FROM challenge_comments_real cc
  JOIN profiles p ON cc.user_id = p.user_id
  WHERE cc.challenge_id = challenge_id_param
  AND cc.parent_id IS NULL
  ORDER BY cc.is_pinned DESC, cc.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
  
  -- Return comments
  RETURN jsonb_build_object(
    'success', true,
    'comments', COALESCE(comments, '[]'::jsonb),
    'total', total_count,
    'is_challenge_creator', is_challenge_creator
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_real_challenge_comments(UUID, INTEGER, INTEGER) TO authenticated;

-- Create a function to add a real-time comment
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
  new_comment_id UUID;
  new_comment RECORD;
  user_profile RECORD;
  result JSONB;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Authentication required'
    );
  END IF;
  
  -- Check if challenge exists
  IF NOT EXISTS (SELECT 1 FROM challenges WHERE id = challenge_id_param) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Challenge not found'
    );
  END IF;
  
  -- Check if parent comment exists if provided
  IF parent_id_param IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM challenge_comments_real 
    WHERE id = parent_id_param AND challenge_id = challenge_id_param
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Parent comment not found'
    );
  END IF;
  
  -- Insert new comment
  INSERT INTO challenge_comments_real (
    challenge_id,
    user_id,
    parent_id,
    content
  )
  VALUES (
    challenge_id_param,
    auth.uid(),
    parent_id_param,
    content_text
  )
  RETURNING id INTO new_comment_id;
  
  -- Get the new comment with user info
  SELECT cc.* INTO new_comment
  FROM challenge_comments_real cc
  WHERE cc.id = new_comment_id;
  
  SELECT p.* INTO user_profile
  FROM profiles p
  WHERE p.user_id = auth.uid();
  
  -- Record activity
  PERFORM record_challenge_activity(
    challenge_id_param,
    'comment',
    jsonb_build_object(
      'comment_id', new_comment_id,
      'parent_id', parent_id_param,
      'content_preview', substring(content_text from 1 for 50)
    )
  );
  
  -- Return the new comment
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Comment added successfully',
    'comment', jsonb_build_object(
      'id', new_comment.id,
      'content', new_comment.content,
      'created_at', new_comment.created_at,
      'updated_at', new_comment.updated_at,
      'likes_count', 0,
      'is_pinned', false,
      'user', jsonb_build_object(
        'id', user_profile.id,
        'user_id', user_profile.user_id,
        'username', user_profile.username,
        'display_name', user_profile.display_name,
        'avatar_url', user_profile.avatar_url
      ),
      'is_liked', false,
      'replies', CASE WHEN parent_id_param IS NULL THEN '[]'::jsonb ELSE NULL END,
      'can_edit', true,
      'can_pin', EXISTS (
        SELECT 1 FROM challenges 
        WHERE id = challenge_id_param AND created_by = auth.uid()
      )
    )
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION add_real_challenge_comment(UUID, TEXT, UUID) TO authenticated;

-- Create a function to toggle like on a real-time comment
CREATE OR REPLACE FUNCTION toggle_real_comment_like(
  comment_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  like_exists BOOLEAN;
  updated_likes_count INTEGER;
  comment_challenge_id UUID;
  result JSONB;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Authentication required'
    );
  END IF;
  
  -- Get the challenge ID for the comment
  SELECT challenge_id INTO comment_challenge_id
  FROM challenge_comments_real
  WHERE id = comment_id_param;
  
  -- Check if comment exists
  IF comment_challenge_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Comment not found'
    );
  END IF;
  
  -- Check if like exists
  SELECT EXISTS (
    SELECT 1 FROM comment_likes_real 
    WHERE comment_id = comment_id_param AND user_id = auth.uid()
  ) INTO like_exists;
  
  -- Toggle like
  IF like_exists THEN
    -- Unlike
    DELETE FROM comment_likes_real
    WHERE comment_id = comment_id_param AND user_id = auth.uid();
    
    -- Update likes count
    UPDATE challenge_comments_real
    SET likes_count = likes_count - 1
    WHERE id = comment_id_param
    RETURNING likes_count INTO updated_likes_count;
    
    -- Record activity
    PERFORM record_challenge_activity(
      comment_challenge_id,
      'like',
      jsonb_build_object(
        'comment_id', comment_id_param,
        'action', 'unlike'
      )
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Comment unliked',
      'likes_count', updated_likes_count,
      'is_liked', false
    );
  ELSE
    -- Like
    INSERT INTO comment_likes_real (comment_id, user_id)
    VALUES (comment_id_param, auth.uid());
    
    -- Update likes count
    UPDATE challenge_comments_real
    SET likes_count = likes_count + 1
    WHERE id = comment_id_param
    RETURNING likes_count INTO updated_likes_count;
    
    -- Record activity
    PERFORM record_challenge_activity(
      comment_challenge_id,
      'like',
      jsonb_build_object(
        'comment_id', comment_id_param,
        'action', 'like'
      )
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Comment liked',
      'likes_count', updated_likes_count,
      'is_liked', true
    );
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION toggle_real_comment_like(UUID) TO authenticated;

-- Create a function to get recent challenge activities
CREATE OR REPLACE FUNCTION get_challenge_activities(
  challenge_id_param UUID,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  activities JSONB;
  total_count INTEGER;
BEGIN
  -- Get total count
  SELECT COUNT(*) INTO total_count
  FROM challenge_activities
  WHERE challenge_id = challenge_id_param;
  
  -- Get activities with user information
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ca.id,
      'activity_type', ca.activity_type,
      'activity_data', ca.activity_data,
      'created_at', ca.created_at,
      'user', jsonb_build_object(
        'id', p.id,
        'user_id', p.user_id,
        'username', p.username,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url
      )
    )
  )
  INTO activities
  FROM challenge_activities ca
  JOIN profiles p ON ca.user_id = p.user_id
  WHERE ca.challenge_id = challenge_id_param
  ORDER BY ca.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
  
  -- Return activities
  RETURN jsonb_build_object(
    'success', true,
    'activities', COALESCE(activities, '[]'::jsonb),
    'total', total_count
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_challenge_activities(UUID, INTEGER, INTEGER) TO authenticated;

-- Modify the check_in_challenge function to record activity
CREATE OR REPLACE FUNCTION check_in_challenge(
  challenge_id_param UUID,
  note_text TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id_val UUID;
  participation_record RECORD;
  today_date DATE;
  last_check_in_date DATE;
  new_progress INTEGER;
  new_streak INTEGER;
  new_status TEXT;
  challenge_duration INTEGER;
  result JSON;
  participant_notes JSONB;
  activity_type TEXT;
BEGIN
  -- Get the current user ID
  user_id_val := auth.uid();
  
  IF user_id_val IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not authenticated'
    );
  END IF;

  -- Get today's date
  today_date := CURRENT_DATE;

  -- Get the participation record
  SELECT * INTO participation_record
  FROM challenge_participants
  WHERE challenge_id = challenge_id_param 
    AND user_id = user_id_val;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User is not participating in this challenge'
    );
  END IF;

  -- Check if already checked in today
  IF participation_record.last_check_in IS NOT NULL THEN
    last_check_in_date := participation_record.last_check_in::DATE;
    IF last_check_in_date = today_date THEN
      RETURN json_build_object(
        'success', false,
        'message', 'Already checked in today'
      );
    END IF;
  END IF;

  -- Get challenge duration
  SELECT duration_days INTO challenge_duration
  FROM challenges
  WHERE id = challenge_id_param;

  -- Calculate new progress (assuming daily check-ins)
  new_progress := LEAST(
    participation_record.progress + (100.0 / COALESCE(challenge_duration, 30))::INTEGER,
    100
  );

  -- Calculate streak
  IF participation_record.last_check_in IS NULL THEN
    new_streak := 1;
  ELSIF last_check_in_date = today_date - INTERVAL '1 day' THEN
    new_streak := participation_record.check_in_streak + 1;
  ELSE
    new_streak := 1; -- Reset streak if not consecutive
  END IF;

  -- Determine new status
  IF new_progress >= 100 THEN
    new_status := 'completed';
    activity_type := 'complete';
  ELSE
    new_status := 'active';
    activity_type := 'progress';
  END IF;

  -- Prepare notes
  participant_notes := COALESCE(participation_record.check_in_notes, '[]'::jsonb);
  IF note_text IS NOT NULL THEN
    participant_notes := participant_notes || 
      jsonb_build_object('date', today_date, 'note', note_text)::jsonb;
  END IF;

  -- Update the participation record
  UPDATE challenge_participants
  SET 
    progress = new_progress,
    status = new_status,
    last_check_in = NOW(),
    check_in_streak = new_streak,
    check_in_notes = participant_notes,
    completed_at = CASE 
      WHEN new_progress >= 100 AND completed_at IS NULL THEN NOW()
      ELSE completed_at
    END
  WHERE challenge_id = challenge_id_param 
    AND user_id = user_id_val;

  -- Record activity
  PERFORM record_challenge_activity(
    challenge_id_param,
    activity_type,
    jsonb_build_object(
      'progress', new_progress,
      'streak', new_streak,
      'note', note_text
    )
  );

  -- Build result
  result := json_build_object(
    'success', true,
    'participation', json_build_object(
      'progress', new_progress,
      'status', new_status,
      'last_check_in', NOW(),
      'check_in_streak', new_streak,
      'check_in_notes', participant_notes
    )
  );

  RETURN result;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION check_in_challenge(UUID, TEXT) TO authenticated;