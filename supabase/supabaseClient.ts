// =============================================================
// SUPABASE CLIENT FOR FRONTEND
// =============================================================
// This connects your React app to Supabase for magic link login.
// 
// You need to add these to your frontend .env.local file:
//   VITE_SUPABASE_URL=https://your-project.supabase.co
//   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key
//
// Get both from: supabase.com → Your Project → Settings → API
// =============================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in your .env.local file');
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

export default supabase;