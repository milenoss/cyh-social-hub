/*
  # Initial Database Schema

  1. New Tables
    - `profiles` - User profiles and statistics
    - `challenges` - Challenge definitions and metadata
    - `challenge_participants` - User participation tracking
    - `friend_requests` - Friend request management
    - `friendships` - User connections
    - `user_security_settings` - Security preferences
    - `account_deletion_requests` - Account deletion management
    - `social_connections` - Social login connections
    - `security_audit_logs` - Security activity tracking
  
  2. Security
    - Enable RLS on all tables
    - Add policies for proper data access control
    - Create necessary indexes for performance
  
  3. Functions
    - Create utility functions for timestamp management
    - Create friend system functions
*/

-- Create updated_at timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  challenges_completed INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  email_verified BOOLEAN DEFAULT false,
  location TEXT,
  website TEXT,
  social_links JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create profile update trigger
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create email verification trigger
CREATE OR REPLACE FUNCTION public.update_profile_email_verification()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET email_verified = TRUE
  WHERE user_id = NEW.id AND NEW.email_confirmed_at IS NOT NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update email verification status
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.update_profile_email_verification();

-- Create new user handler function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, display_name, avatar_url, email_verified)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email_confirmed_at IS NOT NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create RLS policies for profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  TO public
  USING ((is_public = true) OR (auth.uid() = user_id));

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create challenges table
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'extreme')),
  category TEXT NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 30,
  points_reward INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}'::TEXT[],
  created_by UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on challenges
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_challenges_updated_at
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create RLS policies for challenges
CREATE POLICY "Public challenges are viewable by everyone" 
  ON public.challenges 
  FOR SELECT 
  TO public
  USING ((is_public = true) OR (created_by = auth.uid()));

CREATE POLICY "Users can create challenges" 
  ON public.challenges 
  FOR INSERT 
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own challenges" 
  ON public.challenges 
  FOR UPDATE 
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own challenges" 
  ON public.challenges 
  FOR DELETE 
  TO authenticated
  USING (created_by = auth.uid());

-- Create challenge participants table
CREATE TABLE IF NOT EXISTS public.challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

-- Enable RLS on challenge participants
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for challenge participants
CREATE POLICY "Users can view their own participations" 
  ON public.challenge_participants 
  FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can join challenges" 
  ON public.challenge_participants 
  FOR INSERT 
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own participation" 
  ON public.challenge_participants 
  FOR UPDATE 
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave challenges" 
  ON public.challenge_participants 
  FOR DELETE 
  TO authenticated
  USING (user_id = auth.uid());

-- Create friend requests table
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sender_id, recipient_id)
);

-- Enable RLS on friend requests
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_friend_requests_updated_at
  BEFORE UPDATE ON public.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create RLS policies for friend requests
CREATE POLICY "Users can view friend requests they've sent or received" 
  ON public.friend_requests 
  FOR SELECT 
  TO authenticated
  USING ((sender_id = auth.uid()) OR (recipient_id = auth.uid()));

CREATE POLICY "Users can send friend requests" 
  ON public.friend_requests 
  FOR INSERT 
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update friend requests they've received" 
  ON public.friend_requests 
  FOR UPDATE 
  TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "Users can delete friend requests they've sent or received" 
  ON public.friend_requests 
  FOR DELETE 
  TO authenticated
  USING ((sender_id = auth.uid()) OR (recipient_id = auth.uid()));

-- Create friendships table
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Enable RLS on friendships
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create RLS policies for friendships
CREATE POLICY "Users can view their own friendships" 
  ON public.friendships 
  FOR SELECT 
  TO authenticated
  USING ((user_id = auth.uid()) OR (friend_id = auth.uid()));

CREATE POLICY "Users can delete their own friendships" 
  ON public.friendships 
  FOR DELETE 
  TO authenticated
  USING ((user_id = auth.uid()) OR (friend_id = auth.uid()));

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

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_security_settings_updated_at
  BEFORE UPDATE ON public.user_security_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

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

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_account_deletion_requests_updated_at
  BEFORE UPDATE ON public.account_deletion_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

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
  last_sign_in TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Enable RLS on social connections
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_social_connections_updated_at
  BEFORE UPDATE ON public.social_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

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

-- Create RLS policies for security audit logs
CREATE POLICY "Users can view their own security logs" 
  ON public.security_audit_logs 
  FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_challenges_created_by ON public.challenges(created_by);
CREATE INDEX idx_challenges_category ON public.challenges(category);
CREATE INDEX idx_challenges_difficulty ON public.challenges(difficulty);
CREATE INDEX idx_challenges_is_public ON public.challenges(is_public);
CREATE INDEX idx_challenge_participants_challenge_id ON public.challenge_participants(challenge_id);
CREATE INDEX idx_challenge_participants_user_id ON public.challenge_participants(user_id);
CREATE INDEX idx_challenge_participants_status ON public.challenge_participants(status);
CREATE INDEX idx_friend_requests_sender_id ON public.friend_requests(sender_id);
CREATE INDEX idx_friend_requests_recipient_id ON public.friend_requests(recipient_id);
CREATE INDEX idx_friend_requests_status ON public.friend_requests(status);
CREATE INDEX idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON public.friendships(friend_id);
CREATE INDEX idx_security_audit_logs_user_id ON public.security_audit_logs(user_id);
CREATE INDEX idx_security_audit_logs_event_type ON public.security_audit_logs(event_type);
CREATE INDEX idx_security_audit_logs_created_at ON public.security_audit_logs(created_at);

-- Create helper functions for friend system
CREATE OR REPLACE FUNCTION public.send_friend_request(recipient_id UUID, message TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  new_request_id UUID;
BEGIN
  -- Check if users are already friends
  IF EXISTS (
    SELECT 1 FROM public.friendships 
    WHERE (user_id = auth.uid() AND friend_id = recipient_id)
    OR (user_id = recipient_id AND friend_id = auth.uid())
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You are already friends with this user'
    );
  END IF;
  
  -- Check if there's already a pending request
  IF EXISTS (
    SELECT 1 FROM public.friend_requests 
    WHERE sender_id = auth.uid() AND recipient_id = recipient_id AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You already have a pending request to this user'
    );
  END IF;
  
  -- Check if there's a pending request from the recipient
  IF EXISTS (
    SELECT 1 FROM public.friend_requests 
    WHERE sender_id = recipient_id AND recipient_id = auth.uid() AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'This user has already sent you a friend request'
    );
  END IF;
  
  -- Insert new friend request
  INSERT INTO public.friend_requests (sender_id, recipient_id, message)
  VALUES (auth.uid(), recipient_id, message)
  RETURNING id INTO new_request_id;
  
  -- Log the event
  INSERT INTO public.security_audit_logs (user_id, event_type, event_data)
  VALUES (auth.uid(), 'friend_request_sent', jsonb_build_object('recipient_id', recipient_id));
  
  RETURN jsonb_build_object(
    'success', true,
    'request_id', new_request_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id UUID)
RETURNS JSONB AS $$
DECLARE
  sender_id UUID;
  result JSONB;
BEGIN
  -- Get the sender_id from the request
  SELECT fr.sender_id INTO sender_id
  FROM public.friend_requests fr
  WHERE fr.id = request_id AND fr.recipient_id = auth.uid() AND fr.status = 'pending';
  
  IF sender_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Friend request not found or not pending'
    );
  END IF;
  
  -- Update the request status
  UPDATE public.friend_requests
  SET status = 'accepted', updated_at = now()
  WHERE id = request_id;
  
  -- Create friendship records (bidirectional)
  INSERT INTO public.friendships (user_id, friend_id)
  VALUES 
    (auth.uid(), sender_id),
    (sender_id, auth.uid());
  
  -- Log the event
  INSERT INTO public.security_audit_logs (user_id, event_type, event_data)
  VALUES (auth.uid(), 'friend_request_accepted', jsonb_build_object('sender_id', sender_id));
  
  RETURN jsonb_build_object(
    'success', true,
    'sender_id', sender_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.reject_friend_request(request_id UUID)
RETURNS JSONB AS $$
DECLARE
  sender_id UUID;
  result JSONB;
BEGIN
  -- Check if the request exists and belongs to the user
  SELECT fr.sender_id INTO sender_id
  FROM public.friend_requests fr
  WHERE fr.id = request_id AND 
        (fr.recipient_id = auth.uid() OR fr.sender_id = auth.uid()) AND 
        fr.status = 'pending';
  
  IF sender_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Friend request not found or not pending'
    );
  END IF;
  
  -- Update the request status if recipient, or delete if sender
  IF auth.uid() = (SELECT recipient_id FROM public.friend_requests WHERE id = request_id) THEN
    UPDATE public.friend_requests
    SET status = 'rejected', updated_at = now()
    WHERE id = request_id;
    
    -- Log the event
    INSERT INTO public.security_audit_logs (user_id, event_type, event_data)
    VALUES (auth.uid(), 'friend_request_rejected', jsonb_build_object('sender_id', sender_id));
  ELSE
    DELETE FROM public.friend_requests
    WHERE id = request_id;
    
    -- Log the event
    INSERT INTO public.security_audit_logs (user_id, event_type, event_data)
    VALUES (auth.uid(), 'friend_request_cancelled', jsonb_build_object('recipient_id', 
      (SELECT recipient_id FROM public.friend_requests WHERE id = request_id)));
  END IF;
  
  RETURN jsonb_build_object(
    'success', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.remove_friend(friend_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Check if they are friends
  IF NOT EXISTS (
    SELECT 1 FROM public.friendships 
    WHERE user_id = auth.uid() AND friend_id = friend_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'This user is not in your friends list'
    );
  END IF;
  
  -- Delete friendship records (both directions)
  DELETE FROM public.friendships
  WHERE (user_id = auth.uid() AND friend_id = friend_id)
     OR (user_id = friend_id AND friend_id = auth.uid());
  
  -- Log the event
  INSERT INTO public.security_audit_logs (user_id, event_type, event_data)
  VALUES (auth.uid(), 'friend_removed', jsonb_build_object('friend_id', friend_id));
  
  RETURN jsonb_build_object(
    'success', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_friends()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  WITH user_friends AS (
    SELECT f.friend_id AS user_id
    FROM public.friendships f
    WHERE f.user_id = auth.uid()
  )
  SELECT jsonb_build_object(
    'success', true,
    'friends', COALESCE(jsonb_agg(
      jsonb_build_object(
        'user_id', p.user_id,
        'username', p.username,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url,
        'bio', p.bio,
        'friendship_id', f.id,
        'created_at', f.created_at
      )
    ), '[]'::jsonb)
  ) INTO result
  FROM user_friends uf
  JOIN public.profiles p ON p.user_id = uf.user_id
  JOIN public.friendships f ON f.user_id = auth.uid() AND f.friend_id = uf.user_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_friend_requests(status TEXT DEFAULT 'pending')
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  received JSONB;
  sent JSONB;
BEGIN
  -- Get received requests
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', fr.id,
      'sender_id', fr.sender_id,
      'sender', jsonb_build_object(
        'id', p.user_id,
        'username', p.username,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url
      ),
      'message', fr.message,
      'status', fr.status,
      'created_at', fr.created_at
    )
  ), '[]'::jsonb)
  INTO received
  FROM public.friend_requests fr
  JOIN public.profiles p ON p.user_id = fr.sender_id
  WHERE fr.recipient_id = auth.uid() AND fr.status = status;
  
  -- Get sent requests
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', fr.id,
      'recipient_id', fr.recipient_id,
      'recipient', jsonb_build_object(
        'id', p.user_id,
        'username', p.username,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url
      ),
      'message', fr.message,
      'status', fr.status,
      'created_at', fr.created_at
    )
  ), '[]'::jsonb)
  INTO sent
  FROM public.friend_requests fr
  JOIN public.profiles p ON p.user_id = fr.recipient_id
  WHERE fr.sender_id = auth.uid() AND fr.status = status;
  
  RETURN jsonb_build_object(
    'success', true,
    'received', received,
    'sent', sent
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.search_users(search_query TEXT, limit_count INT DEFAULT 10, offset_count INT DEFAULT 0)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  WITH search_results AS (
    SELECT 
      p.user_id,
      p.username,
      p.display_name,
      p.avatar_url,
      p.bio,
      EXISTS (
        SELECT 1 FROM public.friendships f 
        WHERE (f.user_id = auth.uid() AND f.friend_id = p.user_id)
      ) AS is_friend,
      EXISTS (
        SELECT 1 FROM public.friend_requests fr 
        WHERE fr.sender_id = auth.uid() AND fr.recipient_id = p.user_id AND fr.status = 'pending'
      ) AS has_pending_request
    FROM public.profiles p
    WHERE 
      p.user_id != auth.uid() AND
      p.is_public = true AND
      (
        p.username ILIKE '%' || search_query || '%' OR
        p.display_name ILIKE '%' || search_query || '%'
      )
    LIMIT limit_count
    OFFSET offset_count
  ),
  total_count AS (
    SELECT COUNT(*) AS total
    FROM public.profiles p
    WHERE 
      p.user_id != auth.uid() AND
      p.is_public = true AND
      (
        p.username ILIKE '%' || search_query || '%' OR
        p.display_name ILIKE '%' || search_query || '%'
      )
  )
  SELECT jsonb_build_object(
    'success', true,
    'users', COALESCE(jsonb_agg(sr.*), '[]'::jsonb),
    'total', (SELECT total FROM total_count)
  ) INTO result
  FROM search_results sr;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_friend_suggestions(limit_count INT DEFAULT 10)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  WITH user_friends AS (
    -- Get current user's friends
    SELECT friend_id
    FROM public.friendships
    WHERE user_id = auth.uid()
  ),
  friend_of_friends AS (
    -- Get friends of friends
    SELECT DISTINCT f.friend_id
    FROM public.friendships f
    JOIN user_friends uf ON f.user_id = uf.friend_id
    WHERE f.friend_id != auth.uid()
      AND f.friend_id NOT IN (SELECT friend_id FROM user_friends)
  ),
  mutual_counts AS (
    -- Count mutual friends
    SELECT 
      fof.friend_id,
      COUNT(*) AS mutual_count
    FROM friend_of_friends fof
    JOIN public.friendships f1 ON f1.user_id = fof.friend_id
    JOIN user_friends uf ON f1.friend_id = uf.friend_id
    GROUP BY fof.friend_id
  ),
  pending_requests AS (
    -- Get pending friend requests
    SELECT recipient_id
    FROM public.friend_requests
    WHERE sender_id = auth.uid() AND status = 'pending'
  ),
  suggestions AS (
    -- Combine data for suggestions
    SELECT 
      p.user_id,
      p.username,
      p.display_name,
      p.avatar_url,
      p.bio,
      COALESCE(mc.mutual_count, 0) AS mutual_friends_count,
      EXISTS (
        SELECT 1 FROM pending_requests pr WHERE pr.recipient_id = p.user_id
      ) AS has_pending_request
    FROM public.profiles p
    LEFT JOIN mutual_counts mc ON p.user_id = mc.friend_id
    WHERE 
      p.user_id != auth.uid() AND
      p.is_public = true AND
      p.user_id NOT IN (SELECT friend_id FROM user_friends) AND
      p.user_id NOT IN (SELECT recipient_id FROM pending_requests)
    ORDER BY 
      mutual_friends_count DESC,
      p.created_at DESC
    LIMIT limit_count
  )
  SELECT jsonb_build_object(
    'success', true,
    'suggestions', COALESCE(jsonb_agg(s.*), '[]'::jsonb)
  ) INTO result
  FROM suggestions s;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_friendship_status(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  status TEXT;
  request_id UUID;
  is_sender BOOLEAN;
BEGIN
  -- Check if they are friends
  IF EXISTS (
    SELECT 1 FROM public.friendships 
    WHERE user_id = auth.uid() AND friend_id = target_user_id
  ) THEN
    status := 'friends';
  
  -- Check if there's a pending request from current user
  ELSIF EXISTS (
    SELECT 1 FROM public.friend_requests 
    WHERE sender_id = auth.uid() AND recipient_id = target_user_id AND status = 'pending'
  ) THEN
    status := 'request_sent';
    SELECT id INTO request_id FROM public.friend_requests 
    WHERE sender_id = auth.uid() AND recipient_id = target_user_id AND status = 'pending';
    is_sender := true;
  
  -- Check if there's a pending request to current user
  ELSIF EXISTS (
    SELECT 1 FROM public.friend_requests 
    WHERE sender_id = target_user_id AND recipient_id = auth.uid() AND status = 'pending'
  ) THEN
    status := 'request_received';
    SELECT id INTO request_id FROM public.friend_requests 
    WHERE sender_id = target_user_id AND recipient_id = auth.uid() AND status = 'pending';
    is_sender := false;
  
  -- No relationship
  ELSE
    status := 'none';
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'status', status,
    'request_id', request_id,
    'is_sender', is_sender
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_security_audit_logs(limit_count INT DEFAULT 10, offset_count INT DEFAULT 0)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  WITH user_logs AS (
    SELECT *
    FROM public.security_audit_logs
    WHERE user_id = auth.uid()
    ORDER BY created_at DESC
    LIMIT limit_count
    OFFSET offset_count
  )
  SELECT jsonb_build_object(
    'success', true,
    'logs', COALESCE(jsonb_agg(ul.*), '[]'::jsonb)
  ) INTO result
  FROM user_logs ul;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_social_connections()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'success', true,
    'connections', COALESCE(jsonb_agg(sc.*), '[]'::jsonb)
  ) INTO result
  FROM public.social_connections sc
  WHERE sc.user_id = auth.uid();
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.disconnect_social_account(provider TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  DELETE FROM public.social_connections
  WHERE user_id = auth.uid() AND provider = disconnect_social_account.provider;
  
  -- Log the event
  INSERT INTO public.security_audit_logs (user_id, event_type, event_data)
  VALUES (auth.uid(), 'social_account_disconnected', jsonb_build_object('provider', provider));
  
  RETURN jsonb_build_object(
    'success', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_two_factor_status()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  is_enabled BOOLEAN;
BEGIN
  SELECT two_factor_enabled INTO is_enabled
  FROM public.user_security_settings
  WHERE user_id = auth.uid();
  
  RETURN jsonb_build_object(
    'success', true,
    'two_factor_enabled', COALESCE(is_enabled, false)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.enable_two_factor(secret TEXT, recovery_codes TEXT[])
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Check if user already has security settings
  IF EXISTS (SELECT 1 FROM public.user_security_settings WHERE user_id = auth.uid()) THEN
    -- Update existing record
    UPDATE public.user_security_settings
    SET 
      two_factor_enabled = true,
      two_factor_secret = secret,
      recovery_codes = recovery_codes,
      last_security_update = now(),
      updated_at = now()
    WHERE user_id = auth.uid();
  ELSE
    -- Insert new record
    INSERT INTO public.user_security_settings (
      user_id, 
      two_factor_enabled, 
      two_factor_secret, 
      recovery_codes
    )
    VALUES (
      auth.uid(),
      true,
      secret,
      recovery_codes
    );
  END IF;
  
  -- Log the event
  INSERT INTO public.security_audit_logs (user_id, event_type)
  VALUES (auth.uid(), 'two_factor_enabled');
  
  RETURN jsonb_build_object(
    'success', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.disable_two_factor()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  UPDATE public.user_security_settings
  SET 
    two_factor_enabled = false,
    two_factor_secret = NULL,
    recovery_codes = NULL,
    last_security_update = now(),
    updated_at = now()
  WHERE user_id = auth.uid();
  
  -- Log the event
  INSERT INTO public.security_audit_logs (user_id, event_type)
  VALUES (auth.uid(), 'two_factor_disabled');
  
  RETURN jsonb_build_object(
    'success', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.request_account_deletion(reason TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  new_request_id UUID;
BEGIN
  -- Check if there's already a pending request
  IF EXISTS (
    SELECT 1 FROM public.account_deletion_requests
    WHERE user_id = auth.uid() AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You already have a pending account deletion request'
    );
  END IF;
  
  -- Create new deletion request
  INSERT INTO public.account_deletion_requests (
    user_id,
    reason,
    status,
    requested_at
  )
  VALUES (
    auth.uid(),
    reason,
    'pending',
    now()
  )
  RETURNING id INTO new_request_id;
  
  -- Log the event
  INSERT INTO public.security_audit_logs (user_id, event_type, event_data)
  VALUES (auth.uid(), 'account_deletion_requested', jsonb_build_object('reason', reason));
  
  RETURN jsonb_build_object(
    'success', true,
    'request_id', new_request_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cancel_account_deletion(request_id UUID, reason TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Check if the request exists and belongs to the user
  IF NOT EXISTS (
    SELECT 1 FROM public.account_deletion_requests
    WHERE id = request_id AND user_id = auth.uid() AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Deletion request not found or not pending'
    );
  END IF;
  
  -- Update the request
  UPDATE public.account_deletion_requests
  SET 
    status = 'cancelled',
    cancellation_reason = reason,
    updated_at = now()
  WHERE id = request_id;
  
  -- Log the event
  INSERT INTO public.security_audit_logs (user_id, event_type, event_data)
  VALUES (auth.uid(), 'account_deletion_cancelled', jsonb_build_object('reason', reason));
  
  RETURN jsonb_build_object(
    'success', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;