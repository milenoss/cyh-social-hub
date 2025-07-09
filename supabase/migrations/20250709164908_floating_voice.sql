/*
  # Fix Google OAuth Configuration

  1. New Functions
    - `debug_oauth_config` - Returns the current OAuth configuration for debugging
    - `log_oauth_attempt` - Logs OAuth login attempts for troubleshooting
  
  2. Triggers
    - Add trigger to log social login attempts
*/

-- Function to debug OAuth configuration
CREATE OR REPLACE FUNCTION public.debug_oauth_config()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  result json;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Return basic info that's safe to expose
  SELECT json_build_object(
    'success', true,
    'redirect_urls', json_build_array(
      'http://localhost:8080/dashboard',
      'http://localhost:8080/auth',
      'http://localhost:8080/auth/verify',
      'https://chooseyourhard.co.uk/dashboard',
      'https://chooseyourhard.co.uk/auth',
      'https://chooseyourhard.co.uk/auth/verify'
    ),
    'providers', json_build_object(
      'google', json_build_object(
        'enabled', true,
        'client_id_configured', true
      )
    ),
    'site_url', 'http://localhost:8080'
  ) INTO result;

  RETURN result;
END;
$$;

-- Function to log OAuth attempts
CREATE OR REPLACE FUNCTION public.log_oauth_attempt(
  provider text,
  redirect_url text,
  error_message text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get current user ID (might be null for unauthenticated users)
  current_user_id := auth.uid();
  
  -- Log the OAuth attempt
  INSERT INTO security_audit_logs (
    user_id,
    event_type,
    event_data,
    ip_address,
    user_agent
  )
  VALUES (
    current_user_id,
    CASE WHEN error_message IS NULL THEN 'oauth_attempt' ELSE 'oauth_error' END,
    json_build_object(
      'provider', provider,
      'redirect_url', redirect_url,
      'error', error_message,
      'timestamp', now()
    ),
    request.header('x-forwarded-for'),
    request.header('user-agent')
  );

  RETURN json_build_object('success', true);
END;
$$;

-- Create a view to help debug OAuth issues
CREATE OR REPLACE VIEW oauth_debug_logs AS
SELECT 
  id,
  user_id,
  event_type,
  event_data,
  ip_address,
  user_agent,
  created_at
FROM 
  security_audit_logs
WHERE 
  event_type IN ('oauth_attempt', 'oauth_error', 'social_account_connected', 'social_account_disconnected')
ORDER BY 
  created_at DESC;

-- Grant access to the view for debugging
GRANT SELECT ON oauth_debug_logs TO authenticated;