import { NextResponse } from 'next/server';
import { searchUniversities } from '@/lib/universities/search';

/**
 * GET /api/universities/search?q=<query>
 *
 * 大学オートコンプリートの公開読み取りエンドポイント（0081 マスタ）。
 * Server Action ではなく GET にする — キーストロークごとの直列 POST を避け、
 * CDN / ブラウザキャッシュを効かせるため（マスタはほぼ不変なので 5 分キャッシュ）。
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? '';
  const hits = await searchUniversities(q);
  return NextResponse.json(
    { hits },
    {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=3600',
      },
    },
  );
}
