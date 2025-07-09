/*
  # Add unique constraint to challenge_participants

  1. Changes
    - Add unique constraint to challenge_participants table for challenge_id and user_id
    - This ensures a user can only join a challenge once
*/

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'challenge_participants_challenge_id_user_id_key'
  ) THEN
    ALTER TABLE challenge_participants 
    ADD CONSTRAINT challenge_participants_challenge_id_user_id_key 
    UNIQUE (challenge_id, user_id);
  END IF;
END $$;