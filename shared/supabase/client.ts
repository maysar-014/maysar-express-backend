import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key';

// Client for frontend applications (with RLS)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Admin client for backend services (bypasses RLS)
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Real-time subscriptions helper
export const createRealtimeSubscription = (
  table: string,
  filter?: string,
  callback?: (payload: any) => void
) => {
  const channel = supabase.channel(`${table}_changes`);
  return (channel as any).on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table,
      filter
    },
    callback || ((payload: any) => console.log('Change received!', payload))
  ).subscribe();
};

// Database event listener
export const listenToTableChanges = (
  table: string,
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*',
  callback: (payload: any) => void
) => {
  const channel = supabase.channel(`${table}_${event}`);
  return (channel as any).on(
    'postgres_changes',
    { event, schema: 'public', table },
    callback
  ).subscribe();
};

// Helper functions for common operations
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
};

export const signUpWithEmail = async (email: string, password: string, metadata?: any) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// Analytics helpers
export const getAnalytics = async (
  table: string,
  userId: string,
  dateRange?: { start: string; end: string }
) => {
  let query = supabase
    .from(table)
    .select('*')
    .eq(`${table.replace('_analytics', '')}_id`, userId);
  
  if (dateRange) {
    query = query
      .gte('date', dateRange.start)
      .lte('date', dateRange.end);
  }
  
  const { data, error } = await query.order('date', { ascending: false });
  if (error) throw error;
  return data;
};

// Database health check
export const healthCheck = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    return { healthy: !error, error };
  } catch (error) {
    return { healthy: false, error };
  }
};