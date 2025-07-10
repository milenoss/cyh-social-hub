/*
  # Fix check_in_challenge function ambiguous column reference

  1. Database Function
    - Create or replace the `check_in_challenge` function
    - Fix ambiguous `user_id` column references by properly qualifying them
    - Ensure proper table aliases are used throughout the function

  2. Security
    - Function uses security definer to ensure proper access control
    - Validates user authentication before proceeding
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS check_in_challenge(uuid);

-- Create the check_in_challenge function with proper column qualification
CREATE OR REPLACE FUNCTION check_in_challenge(challenge_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid;
    participant_record record;
    challenge_record record;
    result json;
BEGIN
    -- Get the current authenticated user ID
    current_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Get challenge information
    SELECT c.* INTO challenge_record
    FROM challenges c
    WHERE c.id = challenge_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Challenge not found';
    END IF;
    
    -- Get participant information with proper column qualification
    SELECT cp.* INTO participant_record
    FROM challenge_participants cp
    WHERE cp.challenge_id = challenge_id_param 
    AND cp.user_id = current_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User is not participating in this challenge';
    END IF;
    
    -- Check if user can check in (not already checked in today)
    IF participant_record.last_check_in IS NOT NULL 
    AND DATE(participant_record.last_check_in) = CURRENT_DATE THEN
        RAISE EXCEPTION 'Already checked in today';
    END IF;
    
    -- Update the participant record with proper column qualification
    UPDATE challenge_participants cp
    SET 
        last_check_in = NOW(),
        check_in_streak = CASE 
            WHEN cp.last_check_in IS NULL OR DATE(cp.last_check_in) < CURRENT_DATE - INTERVAL '1 day' THEN 1
            WHEN DATE(cp.last_check_in) = CURRENT_DATE - INTERVAL '1 day' THEN cp.check_in_streak + 1
            ELSE cp.check_in_streak
        END,
        progress = LEAST(100, cp.progress + 1),
        status = CASE 
            WHEN LEAST(100, cp.progress + 1) >= 100 THEN 'completed'::text
            ELSE cp.status
        END,
        completed_at = CASE 
            WHEN LEAST(100, cp.progress + 1) >= 100 AND cp.completed_at IS NULL THEN NOW()
            ELSE cp.completed_at
        END
    WHERE cp.challenge_id = challenge_id_param 
    AND cp.user_id = current_user_id;
    
    -- Get updated participant record
    SELECT cp.* INTO participant_record
    FROM challenge_participants cp
    WHERE cp.challenge_id = challenge_id_param 
    AND cp.user_id = current_user_id;
    
    -- Update profile stats if challenge was completed
    IF participant_record.status = 'completed' THEN
        UPDATE profiles p
        SET 
            challenges_completed = p.challenges_completed + 1,
            total_points = p.total_points + COALESCE(challenge_record.points_reward, 0),
            current_streak = CASE 
                WHEN p.updated_at::date = CURRENT_DATE - INTERVAL '1 day' THEN p.current_streak + 1
                WHEN p.updated_at::date = CURRENT_DATE THEN p.current_streak
                ELSE 1
            END,
            longest_streak = GREATEST(p.longest_streak, 
                CASE 
                    WHEN p.updated_at::date = CURRENT_DATE - INTERVAL '1 day' THEN p.current_streak + 1
                    WHEN p.updated_at::date = CURRENT_DATE THEN p.current_streak
                    ELSE 1
                END
            ),
            updated_at = NOW()
        WHERE p.user_id = current_user_id;
    END IF;
    
    -- Return the updated participant information
    result := json_build_object(
        'success', true,
        'participant', row_to_json(participant_record),
        'challenge_completed', participant_record.status = 'completed'
    );
    
    RETURN result;
END;
$$;