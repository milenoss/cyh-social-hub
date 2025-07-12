/*
  # Security and Account Management

  1. New Tables
    - `user_security_settings` - 2FA and security settings
    - `security_audit_logs` - Security event logging
    - `account_deletion_requests` - Account deletion workflow
    - `social_connections` - Social login connections

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users

  3. Relationships
    - All tables linked to users
*/

-- Create user security settings table
CREATE TABLE IF NOT EXISTS public.user_security_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_secret TEXT,
  recovery_codes TEXT[],
  last_security_update TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  social_logins JSONB DEFAULT '{}'::jsonb,
  last_password_change TIMESTAMPTZ,
  password_reset_required BOOLEAN DEFAULT false,
  security_questions JSONB[]
);

-- Enable RLS on user security settings
ALTER TABLE public.user_security_settings ENABLE ROW LEVEL SECURITY;

-- Create security audit logs table
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on security audit logs
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create account deletion requests table
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  requested_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  cancellation_reason TEXT,
  data_retention_period INTEGER DEFAULT 30,
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ
);

-- Enable RLS on account deletion requests
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Create social connections table
CREATE TABLE IF NOT EXISTS public.social_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  provider_email TEXT,
  provider_username TEXT,
  provider_avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_sign_in TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on social connections
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;

-- Create triggers for automatic timestamp updates
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'update_user_security_settings_updated_at') THEN
    CREATE TRIGGER update_user_security_settings_updated_at
      BEFORE UPDATE ON public.user_security_settings
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'update_account_deletion_requests_updated_at') THEN
    CREATE TRIGGER update_account_deletion_requests_updated_at
      BEFORE UPDATE ON public.account_deletion_requests
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'update_social_connections_updated_at') THEN
    CREATE TRIGGER update_social_connections_updated_at
      BEFORE UPDATE ON public.social_connections
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Create RLS policies for user security settings
CREATE POLICY "Users can view their own security settings" 
ON public.user_security_settings 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own security settings" 
ON public.user_security_settings 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own security settings" 
ON public.user_security_settings 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid());

-- Create RLS policies for security audit logs
CREATE POLICY "Users can view their own security logs" 
ON public.security_audit_logs 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Create RLS policies for account deletion requests
CREATE POLICY "Users can view their own deletion requests" 
ON public.account_deletion_requests 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own deletion requests" 
ON public.account_deletion_requests 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can cancel their own deletion requests" 
ON public.account_deletion_requests 
FOR UPDATE 
TO authenticated
USING ((user_id = auth.uid()) AND (status = 'pending'))
WITH CHECK (status = 'cancelled');

-- Create RLS policies for social connections
CREATE POLICY "Users can view their own social connections" 
ON public.social_connections 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own social connections" 
ON public.social_connections 
FOR DELETE 
TO authenticated
USING (user_id = auth.uid());