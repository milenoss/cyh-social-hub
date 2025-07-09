/*
  # Initial Schema Setup

  1. New Tables
    - `profiles` - User profiles with stats and preferences
    - `users` - Authentication users (managed by Supabase Auth)
  
  2. Security
    - Enable RLS on all tables
    - Add policies for proper data access
    
  3. Triggers
    - Add trigger for updating timestamps
    - Add trigger for handling new users
*/

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  display_name text,
  avatar_url text,
  bio text,
  challenges_completed integer DEFAULT 0,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  total_points integer DEFAULT 0,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  email_verified boolean DEFAULT false,
  location text,
  website text,
  social_links jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create profiles update trigger
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create email verification update function
CREATE OR REPLACE FUNCTION update_profile_email_verification()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET email_verified = TRUE
  WHERE user_id = NEW.id AND NEW.email_confirmed_at IS NOT NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for email verification
CREATE TRIGGER on_auth_user_email_verified
AFTER UPDATE ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION update_profile_email_verification();

-- Create RLS policies for profiles
CREATE POLICY "Profiles are viewable by everyone" 
ON profiles 
FOR SELECT 
TO public 
USING ((is_public = true) OR (auth.uid() = user_id));

CREATE POLICY "Users can insert their own profile" 
ON profiles 
FOR INSERT 
TO public 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON profiles 
FOR UPDATE 
TO public 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);