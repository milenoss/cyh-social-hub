/*
  # Security Enhancements

  1. New Tables
    - `social_connections` - Tracks user connections to social providers
    - `security_audit_logs` - Logs important security events

  2. Changes
    - Add additional fields to `user_security_settings` for social login tracking
    - Enhance account deletion process with additional states and notifications

  3. Security
    - Enable RLS on all new tables
    - Add policies for proper access control
    - Create functions for secure operations
*/

-- Create table for social connections
CREATE TABLE IF NOT EXISTS social_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_id text NOT NULL,
  provider_email text,
  provider_username text,
  provider_avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_sign_in timestamptz DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Create table for security audit logs
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Add fields to user_security_settings
ALTER TABLE user_security_settings
ADD COLUMN IF NOT EXISTS social_logins jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_password_change timestamptz,
ADD COLUMN IF NOT EXISTS password_reset_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS security_questions jsonb[];

-- Enhance account_deletion_requests
ALTER TABLE account_deletion_requests
ADD COLUMN IF NOT EXISTS cancellation_reason text,
ADD COLUMN IF NOT EXISTS data_retention_period integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS notification_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_sent_at timestamptz;

-- Enable RLS on new tables
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for social_connections
CREATE POLICY "Users can view their own social connections"
  ON social_connections
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own social connections"
  ON social_connections
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create policies for security_audit_logs
CREATE POLICY "Users can view their own security logs"
  ON security_audit_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  event_type text,
  event_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
  ip_addr text;
  user_agent text;
  log_id uuid;
BEGIN
  -- Get the user ID
  user_id := auth.uid();
  
  -- Get IP and user agent from request headers
  ip_addr := current_setting('request.headers', true)::json->'x-forwarded-for'->>0;
  user_agent := current_setting('request.headers', true)::json->'user-agent'->0;
  
  -- Insert log entry
  INSERT INTO security_audit_logs (
    user_id,
    event_type,
    event_data,
    ip_address,
    user_agent
  )
  VALUES (
    user_id,
    event_type,
    event_data,
    ip_addr,
    user_agent
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Create function to connect social account
CREATE OR REPLACE FUNCTION connect_social_account(
  provider text,
  provider_id text,
  provider_email text DEFAULT NULL,
  provider_username text DEFAULT NULL,
  provider_avatar_url text DEFAULT NULL
)
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
  
  -- Insert or update social connection
  INSERT INTO social_connections (
    user_id,
    provider,
    provider_id,
    provider_email,
    provider_username,
    provider_avatar_url,
    last_sign_in
  )
  VALUES (
    user_id,
    provider,
    provider_id,
    provider_email,
    provider_username,
    provider_avatar_url,
    now()
  )
  ON CONFLICT (user_id, provider) 
  DO UPDATE SET 
    provider_email = EXCLUDED.provider_email,
    provider_username = EXCLUDED.provider_username,
    provider_avatar_url = EXCLUDED.provider_avatar_url,
    last_sign_in = now(),
    updated_at = now();
  
  -- Update user_security_settings
  INSERT INTO user_security_settings (
    user_id,
    social_logins
  )
  VALUES (
    user_id,
    jsonb_build_object(provider, jsonb_build_object(
      'connected_at', now(),
      'provider_id', provider_id
    ))
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    social_logins = user_security_settings.social_logins || 
      jsonb_build_object(provider, jsonb_build_object(
        'connected_at', now(),
        'provider_id', provider_id
      ));
  
  -- Log the event
  PERFORM log_security_event(
    'social_account_connected',
    jsonb_build_object(
      'provider', provider,
      'provider_email', provider_email
    )
  );
  
  -- Return success
  RETURN json_build_object('success', true, 'message', 'Social account connected successfully');
END;
$$;

-- Create function to disconnect social account
CREATE OR REPLACE FUNCTION disconnect_social_account(
  provider text
)
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
  
  -- Delete social connection
  DELETE FROM social_connections
  WHERE user_id = auth.uid() AND provider = disconnect_social_account.provider;
  
  -- Update user_security_settings
  UPDATE user_security_settings
  SET social_logins = social_logins - provider
  WHERE user_id = auth.uid();
  
  -- Log the event
  PERFORM log_security_event(
    'social_account_disconnected',
    jsonb_build_object('provider', provider)
  );
  
  -- Return success
  RETURN json_build_object('success', true, 'message', 'Social account disconnected successfully');
END;
$$;

-- Create function to cancel account deletion
CREATE OR REPLACE FUNCTION cancel_account_deletion(
  request_id uuid,
  reason text DEFAULT NULL
)
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
  
  -- Check if request exists and belongs to user
  IF NOT EXISTS (
    SELECT 1 FROM account_deletion_requests 
    WHERE id = request_id AND user_id = auth.uid() AND status = 'pending'
  ) THEN
    RETURN json_build_object('success', false, 'message', 'Deletion request not found or cannot be cancelled');
  END IF;
  
  -- Update request status
  UPDATE account_deletion_requests
  SET 
    status = 'cancelled',
    cancellation_reason = reason,
    updated_at = now()
  WHERE id = request_id;
  
  -- Log the event
  PERFORM log_security_event(
    'account_deletion_cancelled',
    jsonb_build_object(
      'request_id', request_id,
      'reason', reason
    )
  );
  
  -- Return success
  RETURN json_build_object('success', true, 'message', 'Account deletion request cancelled successfully');
END;
$$;

-- Create function to get social connections
CREATE OR REPLACE FUNCTION get_social_connections()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
  connections json;
BEGIN
  -- Get the user ID
  user_id := auth.uid();
  
  -- Check if user exists
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;
  
  -- Get social connections
  SELECT json_agg(
    json_build_object(
      'id', id,
      'provider', provider,
      'provider_email', provider_email,
      'provider_username', provider_username,
      'provider_avatar_url', provider_avatar_url,
      'created_at', created_at,
      'last_sign_in', last_sign_in
    )
  )
  INTO connections
  FROM social_connections
  WHERE user_id = auth.uid();
  
  -- Return connections
  RETURN json_build_object(
    'success', true, 
    'connections', COALESCE(connections, '[]'::json)
  );
END;
$$;

-- Create function to get security audit logs
CREATE OR REPLACE FUNCTION get_security_audit_logs(
  limit_count integer DEFAULT 10,
  offset_count integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
  logs json;
  total_count integer;
BEGIN
  -- Get the user ID
  user_id := auth.uid();
  
  -- Check if user exists
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;
  
  -- Get total count
  SELECT COUNT(*) INTO total_count
  FROM security_audit_logs
  WHERE user_id = auth.uid();
  
  -- Get logs
  SELECT json_agg(
    json_build_object(
      'id', id,
      'event_type', event_type,
      'event_data', event_data,
      'ip_address', ip_address,
      'created_at', created_at
    )
  )
  INTO logs
  FROM security_audit_logs
  WHERE user_id = auth.uid()
  ORDER BY created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
  
  -- Return logs
  RETURN json_build_object(
    'success', true, 
    'logs', COALESCE(logs, '[]'::json),
    'total', total_count
  );
END;
$$;

-- Create trigger to update the updated_at timestamp
CREATE TRIGGER update_social_connections_updated_at
BEFORE UPDATE ON social_connections
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle new user from social login
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create profile for new user
  INSERT INTO profiles (
    user_id,
    username,
    display_name,
    avatar_url,
    email_verified,
    is_public
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email_confirmed_at IS NOT NULL,
    true
  );
  
  -- If user signed up with a social provider, create social connection
  IF NEW.raw_user_meta_data->>'provider' IS NOT NULL THEN
    INSERT INTO social_connections (
      user_id,
      provider,
      provider_id,
      provider_email,
      provider_username,
      provider_avatar_url
    )
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'provider',
      NEW.raw_user_meta_data->>'provider_id',
      NEW.email,
      NEW.raw_user_meta_data->>'username',
      NEW.raw_user_meta_data->>'avatar_url'
    );
    
    -- Update user_security_settings
    INSERT INTO user_security_settings (
      user_id,
      social_logins
    )
    VALUES (
      NEW.id,
      jsonb_build_object(
        NEW.raw_user_meta_data->>'provider', 
        jsonb_build_object(
          'connected_at', now(),
          'provider_id', NEW.raw_user_meta_data->>'provider_id'
        )
      )
    );
  ELSE
    -- Create default security settings
    INSERT INTO user_security_settings (
      user_id,
      two_factor_enabled,
      last_password_change
    )
    VALUES (
      NEW.id,
      false,
      now()
    );
  END IF;
  
  -- Log the event
  INSERT INTO security_audit_logs (
    user_id,
    event_type,
    event_data
  )
  VALUES (
    NEW.id,
    'account_created',
    jsonb_build_object(
      'provider', COALESCE(NEW.raw_user_meta_data->>'provider', 'email'),
      'email_verified', NEW.email_confirmed_at IS NOT NULL
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create or replace the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();