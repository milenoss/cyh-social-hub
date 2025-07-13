import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Get environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://srzhyvmbijywzmlyzpnh.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyemh5dm1iaWp5d3ptbHl6cG5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5ODIyNjQsImV4cCI6MjA2NzU1ODI2NH0.EgMttRXLWXL1V3Eik9U_GV8LUWSxI5w5UCGKRTvX_vg';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

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