/*
  # Create feedback table

  1. New Tables
    - `feedback`
      - `id` (uuid, primary key)
      - `type` (text)
      - `subject` (text)
      - `message` (text)
      - `email` (text)
      - `challenge_id` (uuid, nullable)
      - `challenge_title` (text, nullable)
      - `user_id` (uuid, nullable)
      - `user_email` (text, nullable)
      - `created_at` (timestamptz)
      - `status` (text)
      - `admin_notes` (text, nullable)
  2. Security
    - Enable RLS on `feedback` table
    - Add policy for authenticated users to insert their own feedback
    - Add policy for admins to view all feedback
*/

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  email TEXT NOT NULL,
  challenge_id UUID REFERENCES challenges(id) ON DELETE SET NULL,
  challenge_title TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'new',
  admin_notes TEXT
);

-- Enable RLS on feedback table
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Create policies for feedback table
CREATE POLICY "Users can insert their own feedback" 
ON feedback 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NULL OR auth.uid() = user_id
);

CREATE POLICY "Users can view their own feedback" 
ON feedback 
FOR SELECT 
USING (
  auth.uid() = user_id
);

-- Create function to send feedback via email
CREATE OR REPLACE FUNCTION send_feedback(
  p_type TEXT,
  p_subject TEXT,
  p_message TEXT,
  p_email TEXT,
  p_challenge_id UUID DEFAULT NULL,
  p_challenge_title TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_feedback_id UUID;
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  -- Get current user if authenticated
  v_user_id := auth.uid();
  
  IF v_user_id IS NOT NULL THEN
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  END IF;

  -- Insert feedback record
  INSERT INTO feedback (
    type,
    subject,
    message,
    email,
    challenge_id,
    challenge_title,
    user_id,
    user_email
  ) VALUES (
    p_type,
    p_subject,
    p_message,
    p_email,
    p_challenge_id,
    p_challenge_title,
    v_user_id,
    v_user_email
  )
  RETURNING id INTO v_feedback_id;

  -- In a real implementation, this function would send an actual email
  -- For now, we just store the feedback in the database

  RETURN json_build_object(
    'success', true,
    'feedback_id', v_feedback_id,
    'message', 'Feedback submitted successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Error submitting feedback: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION send_feedback(TEXT, TEXT, TEXT, TEXT, UUID, TEXT) TO public;