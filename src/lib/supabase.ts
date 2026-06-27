import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://rqcqdcfptwghqwpvbhss.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxY3FkY2ZwdHdnaHF3cHZiaHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMzM2NjQsImV4cCI6MjA5NzkwOTY2NH0.05ehi_hHTtOaiZZqrm0F17-NfxuHhmBPb5cvE-ueCp4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
