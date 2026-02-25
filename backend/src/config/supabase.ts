// =============================================================
// SUPABASE CONFIGURATION
// =============================================================
// This file sets up the connection to your Supabase database.
// Supabase is used for:
//   - User authentication (sign up, login, logout)
//   - Storing data (profiles, images, videos, chats, etc.)
//   - File storage (uploading images, videos, audio files)
// =============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Read the Supabase URL and keys from your .env file
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Make sure the required values exist
if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    console.error('========================================');
    console.error('ERROR: Missing Supabase environment variables!');
    console.error('Make sure your .env file has these values:');
    console.error('  SUPABASE_URL');
    console.error('  SUPABASE_ANON_KEY');
    console.error('  SUPABASE_SERVICE_ROLE_KEY');
    console.error('========================================');
    process.exit(1);
}

// "Anon" client - used for operations that respect Row Level Security (RLS)
// This means users can only access their own data
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// "Admin" client - used for server-side operations that bypass RLS
// Only use this on the backend, never expose this to the frontend
export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

// Helper function to create a Supabase client that acts as a specific user
// This is useful when you want to make database calls on behalf of a logged-in user
export function createUserClient(accessToken: string): SupabaseClient {
    return createClient(supabaseUrl!, supabaseAnonKey!, {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    });
}

export default supabase;
