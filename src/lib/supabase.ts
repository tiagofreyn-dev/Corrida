import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)
  || 'https://jkhtdhxlsnagyvlxtlkw.supabase.co';
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
  || 'sb_publishable_CD_0THzdyUOtecHUq8u6xQ_n-2QPsM7';

export const cloudEnabled = Boolean(url && anon);

/** Client Supabase (null quando .env.local ainda não configurado → modo offline). */
export const supabase: SupabaseClient | null = cloudEnabled
  ? createClient(url as string, anon as string)
  : null;
