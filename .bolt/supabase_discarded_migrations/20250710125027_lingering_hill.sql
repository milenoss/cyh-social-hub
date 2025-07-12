/*
  # Fix Challenge Participation Tracking

  1. New Functions
    - Improved `check_in_challenge` function with proper column qualification
    - Added support for storing check-in notes
    - Fixed progress calculation based on challenge duration
    - Added proper status updates for completed challenges
    - Added profile stats updates when challenges are completed

  2. Schema Updates
    - Ensures challenge_participants table has necessary columns
    - Adds support for comments and participant tracking
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.check_in_challenge;

-- Create the fixed function with proper column references
CREATE OR REPLACE FUNCTION public.check_in_challenge(
  challenge_id_param UUID,
  note_text TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  participation_record RECORD;
  challenge_record RECORD;
  progress_increment NUMERIC;
  new_progress NUMERIC;
  new_status TEXT;
  today_date DATE := CURRENT_DATE;
  check_in_notes JSONB;
  result JSONB;
BEGIN
  -- Verify the user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Authentication required'
    );
  END IF;

  -- Get the challenge details
  SELECT * INTO challenge_record
  FROM challenges
  WHERE id = challenge_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Challenge not found'
    );
  END IF;
  
  -- Get the participation record with explicit table alias
  SELECT cp.* INTO participation_record
  FROM challenge_participants cp
  WHERE cp.challenge_id = challenge_id_param
  AND cp.user_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You are not participating in this challenge'
    );
  END IF;
  
  -- Check if already checked in today
  IF participation_record.last_check_in IS NOT NULL AND 
     DATE(participation_record.last_check_in) = today_date THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Already checked in today',
      'participation', to_jsonb(participation_record)
    );
  END IF;
  
  -- Calculate progress increment based on challenge duration
  progress_increment := LEAST(100.0 / challenge_record.duration_days, 100.0);
  
  -- Calculate new progress
  new_progress := LEAST(participation_record.progress + progress_increment, 100.0);
  
  -- Determine if challenge is completed
  IF new_progress >= 100.0 THEN
    new_status := 'completed';
  ELSE
    new_status := participation_record.status;
  END IF;
  
  -- Prepare check-in note
  IF note_text IS NOT NULL THEN
    -- Get existing notes or initialize empty array
    check_in_notes := COALESCE(participation_record.check_in_notes, '[]'::jsonb);
    
    -- Add new note
    check_in_notes := check_in_notes || jsonb_build_object(
      'date', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'note', note_text
    );
  ELSE
    check_in_notes := participation_record.check_in_notes;
  END IF;
  
  -- Update the participation record with explicit table alias
  UPDATE challenge_participants cp
  SET 
    progress = new_progress,
    status = new_status,
    last_check_in = now(),
    check_in_streak = COALESCE(cp.check_in_streak, 0) + 1,
    check_in_notes = check_in_notes,
    completed_at = CASE WHEN new_status = 'completed' AND cp.completed_at IS NULL 
                        THEN now() 
                        ELSE cp.completed_at 
                   END
  WHERE cp.challenge_id = challenge_id_param
  AND cp.user_id = auth.uid()
  RETURNING * INTO participation_record;
  
  -- If challenge is completed, update user stats
  IF new_status = 'completed' AND participation_record.status = 'completed' THEN
    -- Update profile stats
    UPDATE profiles p
    SET 
      challenges_completed = COALESCE(p.challenges_completed, 0) + 1,
      total_points = COALESCE(p.total_points, 0) + COALESCE(challenge_record.points_reward, 100),
      current_streak = COALESCE(p.current_streak, 0) + 1,
      longest_streak = GREATEST(COALESCE(p.longest_streak, 0), COALESCE(p.current_streak, 0) + 1)
    WHERE p.user_id = auth.uid();
  END IF;
  
  -- Return success response with updated participation
  RETURN jsonb_build_object(
    'success', true,
    'message', CASE 
                WHEN new_status = 'completed' THEN 'Challenge completed! Congratulations!'
                ELSE 'Check-in successful'
               END,
    'participation', to_jsonb(participation_record)
  );
END;
$$;

-- Ensure the challenge_participants table has the necessary columns
DO $$ 
BEGIN
  -- Add check_in_notes column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'challenge_participants' AND column_name = 'check_in_notes'
  ) THEN
    ALTER TABLE challenge_participants ADD COLUMN check_in_notes JSONB DEFAULT '[]'::jsonb;
  END IF;
  
  -- Add check_in_streak column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'challenge_participants' AND column_name = 'check_in_streak'
  ) THEN
    ALTER TABLE challenge_participants ADD COLUMN check_in_streak INTEGER DEFAULT 0;
  END IF;
  
  -- Add last_check_in column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'challenge_participants' AND column_name = 'last_check_in'
  ) THEN
    ALTER TABLE challenge_participants ADD COLUMN last_check_in TIMESTAMPTZ;
  END IF;
END $$;

-- Create a function to get real participants for a challenge
CREATE OR REPLACE FUNCTION get_challenge_participants(challenge_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  participants JSONB;
BEGIN
  -- Get participants with their profile information
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
  ORDER BY cp.progress DESC, cp.last_check_in DESC;
  
  -- Return participants
  RETURN jsonb_build_object(
    'success', true,
    'participants', COALESCE(participants, '[]'::jsonb),
    'count', (SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = challenge_id_param)
  );
END;
$$;

-- Create a table for challenge comments if it doesn't exist
CREATE TABLE IF NOT EXISTS challenge_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES challenge_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on challenge comments
ALTER TABLE challenge_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for challenge comments
DO $$
BEGIN
  -- Only create policies if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'challenge_comments' AND policyname = 'Comments are viewable by everyone'
  ) THEN
    CREATE POLICY "Comments are viewable by everyone" 
    ON challenge_comments 
    FOR SELECT 
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'challenge_comments' AND policyname = 'Users can insert their own comments'
  ) THEN
    CREATE POLICY "Users can insert their own comments" 
    ON challenge_comments 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'challenge_comments' AND policyname = 'Users can update their own comments'
  ) THEN
    CREATE POLICY "Users can update their own comments" 
    ON challenge_comments 
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'challenge_comments' AND policyname = 'Users can delete their own comments'
  ) THEN
    CREATE POLICY "Users can delete their own comments" 
    ON challenge_comments 
    FOR DELETE 
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'challenge_comments' AND policyname = 'Challenge creators can manage all comments'
  ) THEN
    CREATE POLICY "Challenge creators can manage all comments" 
    ON challenge_comments 
    FOR ALL 
    USING (
      EXISTS (
        SELECT 1 FROM challenges c 
        WHERE c.id = challenge_id AND c.created_by = auth.uid()
      )
    );
  END IF;
END $$;

-- Create a trigger for updated_at on challenge_comments
CREATE OR REPLACE TRIGGER update_challenge_comments_updated_at
BEFORE UPDATE ON challenge_comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create a function to get challenge comments
CREATE OR REPLACE FUNCTION get_challenge_comments(
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
  FROM challenge_comments
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
        SELECT 1 FROM comment_likes cl 
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
              SELECT 1 FROM comment_likes cl 
              WHERE cl.comment_id = r.id AND cl.user_id = auth.uid()
            )
          )
        )
        FROM challenge_comments r
        JOIN profiles rp ON r.user_id = rp.user_id
        WHERE r.parent_id = cc.id
        ORDER BY r.is_pinned DESC, r.created_at ASC
      ),
      'can_edit', (cc.user_id = auth.uid() OR is_challenge_creator),
      'can_pin', is_challenge_creator
    )
  )
  INTO comments
  FROM challenge_comments cc
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

-- Create a table for comment likes if it doesn't exist
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES challenge_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS on comment likes
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for comment likes
DO $$
BEGIN
  -- Only create policies if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'comment_likes' AND policyname = 'Users can view comment likes'
  ) THEN
    CREATE POLICY "Users can view comment likes" 
    ON comment_likes 
    FOR SELECT 
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'comment_likes' AND policyname = 'Users can insert their own likes'
  ) THEN
    CREATE POLICY "Users can insert their own likes" 
    ON comment_likes 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'comment_likes' AND policyname = 'Users can delete their own likes'
  ) THEN
    CREATE POLICY "Users can delete their own likes" 
    ON comment_likes 
    FOR DELETE 
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create a function to like/unlike a comment
CREATE OR REPLACE FUNCTION toggle_comment_like(comment_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  like_exists BOOLEAN;
  updated_likes_count INTEGER;
  result JSONB;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Authentication required'
    );
  END IF;
  
  -- Check if comment exists
  IF NOT EXISTS (SELECT 1 FROM challenge_comments WHERE id = comment_id_param) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Comment not found'
    );
  END IF;
  
  -- Check if like exists
  SELECT EXISTS (
    SELECT 1 FROM comment_likes 
    WHERE comment_id = comment_id_param AND user_id = auth.uid()
  ) INTO like_exists;
  
  -- Toggle like
  IF like_exists THEN
    -- Unlike
    DELETE FROM comment_likes
    WHERE comment_id = comment_id_param AND user_id = auth.uid();
    
    -- Update likes count
    UPDATE challenge_comments
    SET likes_count = likes_count - 1
    WHERE id = comment_id_param
    RETURNING likes_count INTO updated_likes_count;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Comment unliked',
      'likes_count', updated_likes_count,
      'is_liked', false
    );
  ELSE
    -- Like
    INSERT INTO comment_likes (comment_id, user_id)
    VALUES (comment_id_param, auth.uid());
    
    -- Update likes count
    UPDATE challenge_comments
    SET likes_count = likes_count + 1
    WHERE id = comment_id_param
    RETURNING likes_count INTO updated_likes_count;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Comment liked',
      'likes_count', updated_likes_count,
      'is_liked', true
    );
  END IF;
END;
$$;

-- Create a function to add a comment
CREATE OR REPLACE FUNCTION add_challenge_comment(
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
    SELECT 1 FROM challenge_comments 
    WHERE id = parent_id_param AND challenge_id = challenge_id_param
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Parent comment not found'
    );
  END IF;
  
  -- Insert new comment
  INSERT INTO challenge_comments (
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
  FROM challenge_comments cc
  WHERE cc.id = new_comment_id;
  
  SELECT p.* INTO user_profile
  FROM profiles p
  WHERE p.user_id = auth.uid();
  
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