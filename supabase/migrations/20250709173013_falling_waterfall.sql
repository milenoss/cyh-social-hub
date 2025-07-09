/*
  # Add last_check_in column to challenge_participants

  1. Changes
    - Add `last_check_in` column to track when users last checked in
    - This helps with daily check-in functionality and streak tracking
*/

-- Add last_check_in column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'challenge_participants' AND column_name = 'last_check_in'
  ) THEN
    ALTER TABLE challenge_participants ADD COLUMN last_check_in timestamptz;
  END IF;
END $$;