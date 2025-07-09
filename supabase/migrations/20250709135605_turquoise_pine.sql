/*
  # Security System

  1. New Tables
    - `user_security_settings` - 2FA and security settings
    - `account_deletion_requests` - Manage account deletion
    - `social_connections` - Social login connections
    - `security_audit_logs` - Security event logging
  
  2. Security
    - Enable RLS on all tables
    - Add policies for proper data access
*/

-- Create user_security_settings table
CREATE TABLE IF NOT EXISTS user_security_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  two_factor_enabled boolean DEFAULT false,
  two_factor_secret text,
  recovery_codes text[],
  last_security_update timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  social_logins jsonb DEFAULT '{}'::jsonb,
  last_password_change timestamptz,
  password_reset_required boolean DEFAULT false,
  security_questions jsonb[]
);

-- Create account_deletion_requests table
CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  status text DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending', 'processing', 'completed', 'cancelled'])),
  requested_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  cancellation_reason text,
  data_retention_period integer DEFAULT 30,
  notification_sent boolean DEFAULT false,
  notification_sent_at timestamptz
);

-- Create social_connections table
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

-- Create security_audit_logs table
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE user_security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create update triggers
CREATE TRIGGER update_user_security_settings_updated_at
BEFORE UPDATE ON user_security_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_account_deletion_requests_updated_at
BEFORE UPDATE ON account_deletion_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_connections_updated_at
BEFORE UPDATE ON social_connections
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies for user_security_settings
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

-- Create RLS policies for account_deletion_requests
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
USING ((user_id = auth.uid()) AND (status = 'pending'))
WITH CHECK (status = 'cancelled');

-- Create RLS policies for social_connections
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

-- Create RLS policies for security_audit_logs
CREATE POLICY "Users can view their own security logs" 
ON security_audit_logs 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- Create security functions
CREATE OR REPLACE FUNCTION get_two_factor_status()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  is_enabled boolean;
BEGIN
  -- Get 2FA status
  SELECT two_factor_enabled INTO is_enabled
  FROM user_security_settings
  WHERE user_id = auth.uid();
  
  -- If no record exists, create one
  IF is_enabled IS NULL THEN
    INSERT INTO user_security_settings (user_id, two_factor_enabled)
    VALUES (auth.uid(), false)
    RETURNING two_factor_enabled INTO is_enabled;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'two_factor_enabled', is_enabled
  );
END;
$$;

CREATE OR REPLACE FUNCTION enable_two_factor(secret text, recovery_codes text[] DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Update or insert security settings
  INSERT INTO user_security_settings (
    user_id, 
    two_factor_enabled, 
    two_factor_secret, 
    recovery_codes,
    last_security_update
  )
  VALUES (
    auth.uid(),
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
    last_security_update = now(),
    updated_at = now();
  
  -- Log the event
  INSERT INTO security_audit_logs (
    user_id,
    event_type,
    event_data
  )
  VALUES (
    auth.uid(),
    'two_factor_enabled',
    jsonb_build_object('timestamp', now())
  );
  
  RETURN jsonb_build_object(
    'success', true
  );
END;
$$;

CREATE OR REPLACE FUNCTION disable_two_factor()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Update security settings
  UPDATE user_security_settings
  SET 
    two_factor_enabled = false,
    two_factor_secret = NULL,
    recovery_codes = NULL,
    last_security_update = now(),
    updated_at = now()
  WHERE user_id = auth.uid();
  
  -- Log the event
  INSERT INTO security_audit_logs (
    user_id,
    event_type,
    event_data
  )
  VALUES (
    auth.uid(),
    'two_factor_disabled',
    jsonb_build_object('timestamp', now())
  );
  
  RETURN jsonb_build_object(
    'success', true
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_social_connections()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'success', true,
    'connections', COALESCE(jsonb_agg(sc.*), '[]'::jsonb)
  ) INTO result
  FROM social_connections sc
  WHERE sc.user_id = auth.uid();
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION disconnect_social_account(provider text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  DELETE FROM social_connections
  WHERE user_id = auth.uid() AND provider = disconnect_social_account.provider;
  
  -- Log the event
  INSERT INTO security_audit_logs (
    user_id,
    event_type,
    event_data
  )
  VALUES (
    auth.uid(),
    'social_account_disconnected',
    jsonb_build_object('provider', provider)
  );
  
  RETURN jsonb_build_object(
    'success', true
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_security_audit_logs(limit_count int DEFAULT 10, offset_count int DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'success', true,
    'logs', COALESCE(jsonb_agg(sal.*), '[]'::jsonb)
  ) INTO result
  FROM security_audit_logs sal
  WHERE sal.user_id = auth.uid()
  ORDER BY sal.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION request_account_deletion(reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  new_request_id uuid;
BEGIN
  -- Check if there's already a pending request
  IF EXISTS (
    SELECT 1 FROM account_deletion_requests
    WHERE user_id = auth.uid() AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'A pending deletion request already exists'
    );
  END IF;
  
  -- Create new deletion request
  INSERT INTO account_deletion_requests (
    user_id,
    reason
  )
  VALUES (
    auth.uid(),
    reason
  )
  RETURNING id INTO new_request_id;
  
  -- Log the event
  INSERT INTO security_audit_logs (
    user_id,
    event_type,
    event_data
  )
  VALUES (
    auth.uid(),
    'account_deletion_requested',
    jsonb_build_object('reason', reason)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'request_id', new_request_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION cancel_account_deletion(request_id uuid, reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Update deletion request
  UPDATE account_deletion_requests
  SET 
    status = 'cancelled',
    cancellation_reason = reason,
    updated_at = now()
  WHERE id = request_id AND user_id = auth.uid() AND status = 'pending';
  
  IF FOUND THEN
    -- Log the event
    INSERT INTO security_audit_logs (
      user_id,
      event_type,
      event_data
    )
    VALUES (
      auth.uid(),
      'account_deletion_cancelled',
      jsonb_build_object('reason', reason)
    );
    
    RETURN jsonb_build_object(
      'success', true
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Deletion request not found or not pending'
    );
  END IF;
END;
$$;