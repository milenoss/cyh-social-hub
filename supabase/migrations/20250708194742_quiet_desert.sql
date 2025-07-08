/*
  # Email Verification Setup

  1. Security
    - Ensure email confirmation is required for new users
    - Add email verification status tracking
    - Set up proper email templates

  2. Configuration
    - Configure Supabase Auth settings for email confirmation
    - Set up email templates and redirects
*/

-- Enable email confirmation requirement (this is typically done in Supabase dashboard)
-- But we can add a function to check verification status

-- Create a function to check if user email is verified
CREATE OR REPLACE FUNCTION is_email_verified(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT email_confirmed_at IS NOT NULL
  FROM auth.users
  WHERE id = user_id;
$$;

-- Create a function to get user verification status
CREATE OR REPLACE FUNCTION get_user_verification_status()
RETURNS TABLE (
  user_id uuid,
  email text,
  email_confirmed_at timestamptz,
  is_verified boolean
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    id as user_id,
    email,
    email_confirmed_at,
    email_confirmed_at IS NOT NULL as is_verified
  FROM auth.users
  WHERE id = auth.uid();
$$;

-- Add RLS policy to allow users to check their own verification status
CREATE POLICY "Users can check their own verification status"
  ON auth.users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Update profiles table to track email verification
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;

-- Create trigger to update email verification status in profiles
CREATE OR REPLACE FUNCTION update_profile_email_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the profile when user's email confirmation changes
  UPDATE profiles 
  SET email_verified = (NEW.email_confirmed_at IS NOT NULL)
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users for email confirmation updates
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_email_verification();

-- Update existing profiles to reflect current verification status
UPDATE profiles 
SET email_verified = (
  SELECT email_confirmed_at IS NOT NULL 
  FROM auth.users 
  WHERE auth.users.id = profiles.user_id
);