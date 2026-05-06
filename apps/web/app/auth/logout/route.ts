import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * ログアウト POST エンドポイント（フォーム submit から叩かれる）。
 * Supabase の signOut でセッション Cookie を破棄し、トップにリダイレクトする。
 */
export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}

// GET はリダイレクトを許容しつつ、ログアウト確認ページを後で作る場合の入口にしておく
export async function GET(request: NextRequest) {
  return POST(request);
}
