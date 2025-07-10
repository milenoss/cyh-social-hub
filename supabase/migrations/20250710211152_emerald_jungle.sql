/*
  # Create Real Leaderboards Functions

  1. New Functions
    - get_global_leaderboard: Fetches global leaderboard data
    - get_challenge_leaderboard: Fetches leaderboard for a specific challenge
    - get_streak_leaderboard: Fetches leaderboard based on user streaks

  2. Purpose
    - Replace mock leaderboard data with real user data
    - Enable real-time tracking of user achievements
    - Support competitive features
*/

-- Function to get global leaderboard
CREATE OR REPLACE FUNCTION get_global_leaderboard(
  timeframe text DEFAULT 'all-time',
  limit_count integer DEFAULT 10,
  offset_count integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  leaderboard_data json;
  user_rank json;
  total_count integer;
  date_filter timestamp;
BEGIN
  -- Set date filter based on timeframe
  CASE timeframe
    WHEN 'weekly' THEN
      date_filter := (current_date - interval '7 days')::timestamp;
    WHEN 'monthly' THEN
      date_filter := (current_date - interval '30 days')::timestamp;
    ELSE
      date_filter := '1970-01-01'::timestamp; -- All time
  END CASE;

  -- Get total count
  SELECT COUNT(DISTINCT user_id) INTO total_count
  FROM challenge_participants
  WHERE status = 'completed' AND completed_at >= date_filter;

  -- Get leaderboard data
  WITH user_points AS (
    SELECT 
      cp.user_id,
      COUNT(cp.id) AS challenges_completed,
      SUM(c.points_reward) AS total_points,
      ROW_NUMBER() OVER (ORDER BY SUM(c.points_reward) DESC, COUNT(cp.id) DESC) AS rank
    FROM challenge_participants cp
    JOIN challenges c ON cp.challenge_id = c.id
    WHERE cp.status = 'completed' AND cp.completed_at >= date_filter
    GROUP BY cp.user_id
  )
  SELECT json_agg(
    json_build_object(
      'rank', up.rank,
      'user_id', up.user_id,
      'username', COALESCE(p.username, split_part(u.email, '@', 1)),
      'display_name', COALESCE(p.display_name, split_part(u.email, '@', 1)),
      'avatar_url', p.avatar_url,
      'challenges_completed', up.challenges_completed,
      'total_points', up.total_points,
      'badge', CASE
        WHEN up.rank = 1 THEN 'legend'
        WHEN up.rank <= 3 THEN 'master'
        WHEN up.rank <= 10 THEN 'expert'
        ELSE NULL
      END,
      'change', 0 -- For now, we don't track position changes
    )
    ORDER BY up.rank ASC
  )
  INTO leaderboard_data
  FROM user_points up
  LEFT JOIN profiles p ON up.user_id = p.user_id
  LEFT JOIN auth.users u ON up.user_id = u.id
  LIMIT limit_count
  OFFSET offset_count;

  -- Get current user's rank if authenticated
  IF auth.uid() IS NOT NULL THEN
    WITH user_points AS (
      SELECT 
        cp.user_id,
        COUNT(cp.id) AS challenges_completed,
        SUM(c.points_reward) AS total_points,
        ROW_NUMBER() OVER (ORDER BY SUM(c.points_reward) DESC, COUNT(cp.id) DESC) AS rank
      FROM challenge_participants cp
      JOIN challenges c ON cp.challenge_id = c.id
      WHERE cp.status = 'completed' AND cp.completed_at >= date_filter
      GROUP BY cp.user_id
    )
    SELECT json_build_object(
      'rank', COALESCE(up.rank, 0),
      'user_id', auth.uid(),
      'username', COALESCE(p.username, split_part(u.email, '@', 1)),
      'display_name', COALESCE(p.display_name, split_part(u.email, '@', 1)),
      'avatar_url', p.avatar_url,
      'challenges_completed', COALESCE(up.challenges_completed, 0),
      'total_points', COALESCE(up.total_points, 0),
      'badge', CASE
        WHEN up.rank = 1 THEN 'legend'
        WHEN up.rank <= 3 THEN 'master'
        WHEN up.rank <= 10 THEN 'expert'
        ELSE NULL
      END,
      'change', 0
    )
    INTO user_rank
    FROM profiles p
    LEFT JOIN auth.users u ON p.user_id = u.id
    LEFT JOIN user_points up ON up.user_id = auth.uid()
    WHERE p.user_id = auth.uid();
  END IF;

  -- Build the response
  result := json_build_object(
    'success', true,
    'leaderboard', COALESCE(leaderboard_data, '[]'::json),
    'user_rank', user_rank,
    'total', total_count,
    'timeframe', timeframe,
    'message', 'Leaderboard fetched successfully'
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'leaderboard', '[]'::json,
      'user_rank', NULL,
      'total', 0,
      'message', 'Error fetching leaderboard: ' || SQLERRM
    );
END;
$$;

-- Function to get challenge-specific leaderboard
CREATE OR REPLACE FUNCTION get_challenge_leaderboard(
  challenge_id_param uuid,
  limit_count integer DEFAULT 10,
  offset_count integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  leaderboard_data json;
  user_rank json;
  total_count integer;
  challenge_title text;
BEGIN
  -- Get challenge title
  SELECT title INTO challenge_title
  FROM challenges
  WHERE id = challenge_id_param;

  -- Check if challenge exists
  IF challenge_title IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Challenge not found'
    );
  END IF;

  -- Get total count
  SELECT COUNT(*) INTO total_count
  FROM challenge_participants
  WHERE challenge_id = challenge_id_param;

  -- Get leaderboard data
  WITH participant_ranks AS (
    SELECT 
      cp.user_id,
      cp.progress,
      cp.status,
      cp.completed_at,
      cp.check_in_streak,
      ROW_NUMBER() OVER (ORDER BY 
        CASE WHEN cp.status = 'completed' THEN 0 ELSE 1 END,
        cp.progress DESC, 
        cp.check_in_streak DESC
      ) AS rank
    FROM challenge_participants cp
    WHERE cp.challenge_id = challenge_id_param
  )
  SELECT json_agg(
    json_build_object(
      'rank', pr.rank,
      'user_id', pr.user_id,
      'username', COALESCE(p.username, split_part(u.email, '@', 1)),
      'display_name', COALESCE(p.display_name, split_part(u.email, '@', 1)),
      'avatar_url', p.avatar_url,
      'progress', pr.progress,
      'status', pr.status,
      'completed_at', pr.completed_at,
      'streak', pr.check_in_streak,
      'badge', CASE
        WHEN pr.rank = 1 THEN 'gold'
        WHEN pr.rank = 2 THEN 'silver'
        WHEN pr.rank = 3 THEN 'bronze'
        ELSE NULL
      END,
      'change', 0 -- For now, we don't track position changes
    )
    ORDER BY pr.rank ASC
  )
  INTO leaderboard_data
  FROM participant_ranks pr
  LEFT JOIN profiles p ON pr.user_id = p.user_id
  LEFT JOIN auth.users u ON pr.user_id = u.id
  LIMIT limit_count
  OFFSET offset_count;

  -- Get current user's rank if authenticated
  IF auth.uid() IS NOT NULL THEN
    WITH participant_ranks AS (
      SELECT 
        cp.user_id,
        cp.progress,
        cp.status,
        cp.completed_at,
        cp.check_in_streak,
        ROW_NUMBER() OVER (ORDER BY 
          CASE WHEN cp.status = 'completed' THEN 0 ELSE 1 END,
          cp.progress DESC, 
          cp.check_in_streak DESC
        ) AS rank
      FROM challenge_participants cp
      WHERE cp.challenge_id = challenge_id_param
    )
    SELECT json_build_object(
      'rank', COALESCE(pr.rank, 0),
      'user_id', auth.uid(),
      'username', COALESCE(p.username, split_part(u.email, '@', 1)),
      'display_name', COALESCE(p.display_name, split_part(u.email, '@', 1)),
      'avatar_url', p.avatar_url,
      'progress', COALESCE(pr.progress, 0),
      'status', COALESCE(pr.status, 'not_joined'),
      'completed_at', pr.completed_at,
      'streak', COALESCE(pr.check_in_streak, 0),
      'badge', CASE
        WHEN pr.rank = 1 THEN 'gold'
        WHEN pr.rank = 2 THEN 'silver'
        WHEN pr.rank = 3 THEN 'bronze'
        ELSE NULL
      END,
      'change', 0
    )
    INTO user_rank
    FROM profiles p
    LEFT JOIN auth.users u ON p.user_id = u.id
    LEFT JOIN participant_ranks pr ON pr.user_id = auth.uid()
    WHERE p.user_id = auth.uid();
  END IF;

  -- Build the response
  result := json_build_object(
    'success', true,
    'leaderboard', COALESCE(leaderboard_data, '[]'::json),
    'user_rank', user_rank,
    'total', total_count,
    'challenge_title', challenge_title,
    'message', 'Challenge leaderboard fetched successfully'
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'leaderboard', '[]'::json,
      'user_rank', NULL,
      'total', 0,
      'message', 'Error fetching challenge leaderboard: ' || SQLERRM
    );
END;
$$;

-- Function to get streak leaderboard
CREATE OR REPLACE FUNCTION get_streak_leaderboard(
  limit_count integer DEFAULT 10,
  offset_count integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  leaderboard_data json;
  user_rank json;
  total_count integer;
BEGIN
  -- Get total count
  SELECT COUNT(*) INTO total_count
  FROM profiles
  WHERE current_streak > 0;

  -- Get leaderboard data
  WITH streak_ranks AS (
    SELECT 
      p.user_id,
      p.current_streak,
      p.longest_streak,
      ROW_NUMBER() OVER (ORDER BY p.current_streak DESC, p.longest_streak DESC) AS rank
    FROM profiles p
    WHERE p.current_streak > 0
  )
  SELECT json_agg(
    json_build_object(
      'rank', sr.rank,
      'user_id', sr.user_id,
      'username', COALESCE(p.username, split_part(u.email, '@', 1)),
      'display_name', COALESCE(p.display_name, split_part(u.email, '@', 1)),
      'avatar_url', p.avatar_url,
      'current_streak', sr.current_streak,
      'longest_streak', sr.longest_streak,
      'badge', CASE
        WHEN sr.rank = 1 THEN 'legend'
        WHEN sr.rank <= 3 THEN 'master'
        WHEN sr.rank <= 10 THEN 'expert'
        ELSE NULL
      END,
      'change', 0 -- For now, we don't track position changes
    )
    ORDER BY sr.rank ASC
  )
  INTO leaderboard_data
  FROM streak_ranks sr
  LEFT JOIN profiles p ON sr.user_id = p.user_id
  LEFT JOIN auth.users u ON sr.user_id = u.id
  LIMIT limit_count
  OFFSET offset_count;

  -- Get current user's rank if authenticated
  IF auth.uid() IS NOT NULL THEN
    WITH streak_ranks AS (
      SELECT 
        p.user_id,
        p.current_streak,
        p.longest_streak,
        ROW_NUMBER() OVER (ORDER BY p.current_streak DESC, p.longest_streak DESC) AS rank
      FROM profiles p
      WHERE p.current_streak > 0
    )
    SELECT json_build_object(
      'rank', COALESCE(sr.rank, 0),
      'user_id', auth.uid(),
      'username', COALESCE(p.username, split_part(u.email, '@', 1)),
      'display_name', COALESCE(p.display_name, split_part(u.email, '@', 1)),
      'avatar_url', p.avatar_url,
      'current_streak', COALESCE(p.current_streak, 0),
      'longest_streak', COALESCE(p.longest_streak, 0),
      'badge', CASE
        WHEN sr.rank = 1 THEN 'legend'
        WHEN sr.rank <= 3 THEN 'master'
        WHEN sr.rank <= 10 THEN 'expert'
        ELSE NULL
      END,
      'change', 0
    )
    INTO user_rank
    FROM profiles p
    LEFT JOIN auth.users u ON p.user_id = u.id
    LEFT JOIN streak_ranks sr ON sr.user_id = auth.uid()
    WHERE p.user_id = auth.uid();
  END IF;

  -- Build the response
  result := json_build_object(
    'success', true,
    'leaderboard', COALESCE(leaderboard_data, '[]'::json),
    'user_rank', user_rank,
    'total', total_count,
    'message', 'Streak leaderboard fetched successfully'
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'leaderboard', '[]'::json,
      'user_rank', NULL,
      'total', 0,
      'message', 'Error fetching streak leaderboard: ' || SQLERRM
    );
END;
$$;