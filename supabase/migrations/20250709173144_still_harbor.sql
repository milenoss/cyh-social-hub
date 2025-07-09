/*
  # Create function to update user stats on challenge completion

  1. New Functions
    - `update_user_stats_on_completion` - Updates user profile stats when a challenge is completed
      - Increments challenges_completed count
      - Adds points to total_points
      - Updates streak information

  2. Security
    - Function is accessible to authenticated users only
*/

-- Function to update user stats when a challenge is completed
CREATE OR REPLACE FUNCTION update_user_stats_on_completion(challenge_points integer DEFAULT 100)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id uuid;
  current_date date := current_date;
  last_completion_date date;
  current_streak_value int;
  longest_streak_value int;
BEGIN
  -- Get the authenticated user ID
  user_id := auth.uid();
  
  -- Exit if no user is authenticated
  IF user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Get the user's current stats
  SELECT 
    current_streak,
    longest_streak,
    (SELECT MAX(completed_at::date) FROM challenge_participants WHERE user_id = profiles.user_id AND status = 'completed')
  INTO 
    current_streak_value,
    longest_streak_value,
    last_completion_date
  FROM profiles
  WHERE user_id = user_id;
  
  -- Update streak information
  IF last_completion_date IS NULL OR (current_date - last_completion_date) <= 1 THEN
    -- Either first completion or consecutive day
    current_streak_value := COALESCE(current_streak_value, 0) + 1;
  ELSE
    -- Streak broken, reset to 1
    current_streak_value := 1;
  END IF;
  
  -- Update longest streak if current streak is longer
  IF current_streak_value > COALESCE(longest_streak_value, 0) THEN
    longest_streak_value := current_streak_value;
  END IF;
  
  -- Update the user's profile
  UPDATE profiles
  SET 
    challenges_completed = COALESCE(challenges_completed, 0) + 1,
    total_points = COALESCE(total_points, 0) + challenge_points,
    current_streak = current_streak_value,
    longest_streak = longest_streak_value
  WHERE user_id = user_id;
  
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_user_stats_on_completion TO authenticated;