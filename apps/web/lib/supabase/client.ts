'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Client Component 用の Supabase クライアント。
 * ブラウザ側のセッション（localStorage / cookie）と同期する。
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定です。',
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
