import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://srzhyvmbijywzmlyzpnh.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyemh5dm1iaWp5d3ptbHl6cG5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTU3OTc2MDAsImV4cCI6MjAzMTM3MzYwMH0.Nh1Ow-_KJJiRXVRMXnRMYu_tLFyc2CYnBvBxpCFGXYE';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true, 
      autoRefreshToken: true,
      debug: import.meta.env.DEV
    }
  }
);