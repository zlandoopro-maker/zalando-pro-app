import { createClient } from '@supabase/supabase-js';

const viteEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env)
  ? (import.meta as any).env
  : (typeof process !== 'undefined' ? process.env : {});

const supabaseUrl = viteEnv.VITE_SUPABASE_URL || 'https://mklzftbjvngwwiivdkhs.supabase.co';
const supabaseAnonKey = viteEnv.VITE_SUPABASE_ANON_KEY || 'sb_publishable_vfa-EIY2FIK0WM1yaRicOQ_FmDXE51x';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  vipTier: string;
  balance: number;
  totalEarnings: number;
  completedTasksCount: number;
  referralCode: string;
  referredBy?: string;
  teamCount?: number;
  createdAt?: string;
  phone?: string;
}

// Fallback/Mock local state if Supabase key is not yet configured
export const getSupabaseSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error fetching Supabase session:', error);
    return null;
  }
  return data.session;
};
