/*
  # Fix Profiles Table and Related Functions

  1. New Tables
    - Creates `profiles` table if it doesn't exist
    - Adds columns for user profile information including social links

  2. Functions
    - Creates timestamp update function
    - Creates new user handler function
    - Creates email verification update function

  3. Triggers
    - Adds triggers for timestamp updates
    - Adds trigger for new user creation
    - Adds trigger for email verification updates

  4. Security
    - Enables RLS on profiles table
    - Adds policies for viewing, updating, and inserting profiles
*/

-- Check if profiles table exists before creating
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    -- Create profiles table for additional user information
    CREATE TABLE public.profiles (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
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
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      email_verified BOOLEAN DEFAULT false,
      location TEXT,
      website TEXT,
      social_links JSONB DEFAULT '{}'::jsonb
    );

    -- Enable RLS
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

    -- Create policies for profiles
    CREATE POLICY "Profiles are viewable by everyone" 
    ON public.profiles 
    FOR SELECT 
    USING (is_public = true OR auth.uid() = user_id);

    CREATE POLICY "Users can update their own profile" 
    ON public.profiles 
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own profile" 
    ON public.profiles 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Create function to update timestamps if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$;

-- Create trigger for automatic timestamp updates if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Create function to handle new user signup if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'handle_new_user') THEN
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER SET search_path = ''
    AS $$
    BEGIN
      INSERT INTO public.profiles (user_id, display_name, username)
      VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1))
      );
      RETURN NEW;
    END;
    $$;
  END IF;
END $$;

-- Create trigger to automatically create profile on user signup if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW 
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Create function to update email verification status if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'update_profile_email_verification') THEN
    CREATE OR REPLACE FUNCTION public.update_profile_email_verification()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER SET search_path = ''
    AS $$
    BEGIN
      UPDATE public.profiles
      SET email_verified = (NEW.email_confirmed_at IS NOT NULL)
      WHERE user_id = NEW.id;
      RETURN NEW;
    END;
    $$;
  END IF;
END $$;

-- Add email verification trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'on_auth_user_updated') THEN
    CREATE TRIGGER on_auth_user_updated
      AFTER UPDATE ON auth.users
      FOR EACH ROW
      WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
      EXECUTE FUNCTION public.update_profile_email_verification();
  END IF;
END $$;