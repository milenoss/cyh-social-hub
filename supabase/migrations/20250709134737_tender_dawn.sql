/*
  # Friend System

  1. New Tables
    - `friend_requests` - Pending friend requests
    - `friendships` - Established friendships

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users

  3. Relationships
    - Friend requests linked to users
    - Friendships linked to users
*/

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

-- Create triggers for automatic timestamp updates
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'update_friend_requests_updated_at') THEN
    CREATE TRIGGER update_friend_requests_updated_at
      BEFORE UPDATE ON public.friend_requests
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'update_friendships_updated_at') THEN
    CREATE TRIGGER update_friendships_updated_at
      BEFORE UPDATE ON public.friendships
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

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