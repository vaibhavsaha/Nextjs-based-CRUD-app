import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = 'https://bvkkwosqkrzosrnbqooj.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: {
      getItem: (key) => {
        try {
          return Promise.resolve(localStorage.getItem(key));
        } catch {
          return Promise.resolve(null);
        }
      },
      setItem: (key, value) => {
        try {
          localStorage.setItem(key, value);
          return Promise.resolve();
        } catch {
          return Promise.resolve();
        }
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key);
          return Promise.resolve();
        } catch {
          return Promise.resolve();
        }
      },
    },
  },
});

export const isSupabaseConfigured = () => {
  return supabaseAnonKey !== '';
};