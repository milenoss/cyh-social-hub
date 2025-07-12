import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Get environment variables with fallbacks to prevent "undefined" errors
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://srzhyvmbijywzmlyzpnh.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyemh5dm1iaWp5d3ptbHl6cG5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjA3OTc2NzcsImV4cCI6MjAzNjM3MzY3N30.Rl5Zf9-cZUzgc0iBpZRXEYXAVDa-GjRyRGI-Xj_c1Oc';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true, 
    autoRefreshToken: true,
    debug: import.meta.env.DEV
  }
});