/*
  # Add social and location fields to profiles table

  1. New Columns
    - `location` (text, nullable) - User's location/city
    - `website` (text, nullable) - User's personal website URL
    - `social_links` (jsonb, nullable) - JSON object containing social media links

  2. Changes
    - Add three new columns to the profiles table
    - All fields are optional (nullable) to maintain backward compatibility
    - Use JSONB for social_links to allow flexible social media platform storage

  3. Security
    - No RLS changes needed as these fields follow existing profile security model
*/

-- Add location field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'location'
  ) THEN
    ALTER TABLE profiles ADD COLUMN location text;
  END IF;
END $$;

-- Add website field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'website'
  ) THEN
    ALTER TABLE profiles ADD COLUMN website text;
  END IF;
END $$;

-- Add social_links field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'social_links'
  ) THEN
    ALTER TABLE profiles ADD COLUMN social_links jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;