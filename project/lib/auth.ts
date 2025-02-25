import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';
import { User } from './types';

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
};

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getBaseUrl()}/auth/callback`,
      data: {
        email_confirm: true,
      }
    }
  });
  
  if (error) {
    console.error('Signup error:', error);
    throw error;
  }
  
  if (data?.user?.identities?.length === 0) {
    throw new Error('This email is already registered. Please sign in instead.');
  }
  
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
}

export async function signOut() {
  try {
    // Clear local storage first to ensure it's always cleaned up
    localStorage.removeItem('anonymousUserId');
    localStorage.removeItem('anonymousUser');
    
    // Clear all Supabase-related items from localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    });
    
    // Attempt to sign out from Supabase
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn('Supabase signOut error:', error);
      }
    } catch (supabaseError) {
      console.warn('Supabase signOut error:', supabaseError);
    }

    // Final cleanup of any remaining auth-related items
    const authKeys = Object.keys(localStorage).filter(key => 
      key.includes('auth') || key.includes('anonymous')
    );
    
    authKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn(`Failed to remove key ${key}:`, e);
      }
    });

  } catch (error) {
    // Log the error but don't throw - we want the UI to update regardless
    console.warn('Sign out cleanup error:', error);
  }
}

export async function getCurrentUser() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
  } catch (error) {
    console.warn('Get current user error:', error);
    return null;
  }
}

export async function getSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Error getting session:', error);
      return null;
    }
    return session;
  } catch (error) {
    console.warn('Session retrieval error:', error);
    return null;
  }
}

export function createAnonymousUser(): User {
  const id = uuidv4();
  localStorage.setItem('anonymousUserId', id);
  return {
    id,
    isAnonymous: true,
  };
}