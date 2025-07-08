/*
  # Security Enhancements

  1. New Tables
    - `user_security_settings` - Stores user security preferences and 2FA settings
    - `account_deletion_requests` - Tracks account deletion requests

  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to manage their own security settings
    - Add function for account deletion

  3. Changes
    - Add support for social logins and 2FA
*/

-- Create table for user security settings
CREATE TABLE IF NOT EXISTS user_security_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  two_factor_enabled boolean DEFAULT false,
  two_factor_secret text,
  recovery_codes text[],
  last_security_update timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create table for account deletion requests
CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  requested_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE user_security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for user_security_settings
CREATE POLICY "Users can view their own security settings"
  ON user_security_settings
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own security settings"
  ON user_security_settings
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own security settings"
  ON user_security_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create policies for account_deletion_requests
CREATE POLICY "Users can view their own deletion requests"
  ON account_deletion_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own deletion requests"
  ON account_deletion_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can cancel their own deletion requests"
  ON account_deletion_requests
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (status = 'cancelled');

-- Create function to request account deletion
CREATE OR REPLACE FUNCTION request_account_deletion(reason text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
  result json;
BEGIN
  -- Get the user ID
  user_id := auth.uid();
  
  -- Check if user exists
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;
  
  -- Check if there's already a pending request
  IF EXISTS (
    SELECT 1 FROM account_deletion_requests 
    WHERE user_id = auth.uid() AND status = 'pending'
  ) THEN
    RETURN json_build_object('success', false, 'message', 'A deletion request is already pending');
  END IF;
  
  -- Create deletion request
  INSERT INTO account_deletion_requests (user_id, reason)
  VALUES (user_id, reason);
  
  -- Return success
  RETURN json_build_object('success', true, 'message', 'Account deletion request submitted');
END;
$$;

-- Create function to check 2FA status
CREATE OR REPLACE FUNCTION get_two_factor_status()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
  settings record;
  result json;
BEGIN
  -- Get the user ID
  user_id := auth.uid();
  
  -- Check if user exists
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;
  
  -- Get 2FA settings
  SELECT * INTO settings FROM user_security_settings WHERE user_id = auth.uid();
  
  -- If no settings found, create default settings
  IF settings IS NULL THEN
    INSERT INTO user_security_settings (user_id, two_factor_enabled)
    VALUES (user_id, false)
    RETURNING * INTO settings;
  END IF;
  
  -- Return 2FA status
  RETURN json_build_object(
    'success', true, 
    'two_factor_enabled', settings.two_factor_enabled,
    'last_updated', settings.last_security_update
  );
END;
$$;

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_user_security_settings_updated_at
BEFORE UPDATE ON user_security_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_account_deletion_requests_updated_at
BEFORE UPDATE ON account_deletion_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create function to enable 2FA
CREATE OR REPLACE FUNCTION enable_two_factor(secret text, recovery_codes text[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
  result json;
BEGIN
  -- Get the user ID
  user_id := auth.uid();
  
  -- Check if user exists
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;
  
  -- Update or insert 2FA settings
  INSERT INTO user_security_settings (
    user_id, 
    two_factor_enabled, 
    two_factor_secret, 
    recovery_codes,
    last_security_update
  )
  VALUES (
    user_id, 
    true, 
    secret, 
    recovery_codes,
    now()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    two_factor_enabled = true,
    two_factor_secret = secret,
    recovery_codes = recovery_codes,
    last_security_update = now();
  
  -- Return success
  RETURN json_build_object('success', true, 'message', '2FA enabled successfully');
END;
$$;

-- Create function to disable 2FA
CREATE OR REPLACE FUNCTION disable_two_factor()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
  result json;
BEGIN
  -- Get the user ID
  user_id := auth.uid();
  
  -- Check if user exists
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;
  
  -- Update 2FA settings
  UPDATE user_security_settings
  SET 
    two_factor_enabled = false,
    last_security_update = now()
  WHERE user_id = auth.uid();
  
  -- Return success
  RETURN json_build_object('success', true, 'message', '2FA disabled successfully');
END;
$$;