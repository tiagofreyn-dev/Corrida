import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const cloudEnabled = Boolean(url && anon);

/** Client Supabase (null quando .env.local ainda não configurado → modo offline). */
export const supabase: SupabaseClient | null = cloudEnabled
  ? createClient(url as string, anon as string)
  : null;
