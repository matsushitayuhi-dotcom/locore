'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Google Maps の動作確認用ミニマムページ。
 *
 * @vis.gl/react-google-maps もスタイルもマーカーも介さず、
 * 素の Google Maps JS API ローダー1本で地図を表示する。
 *
 * ここで地図が出るなら → Cloud 設定 (API key / 課金 / API 有効化) は OK。
 * 出ないなら → Cloud 設定が原因（コード側ではない）。
 */
export default function MapTestPage() {
  const ref = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('init');
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) {
      setStatus('NO_API_KEY (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY が空)');
      return;
    }

    setStatus('loading-script');

    // 重複ロード防止
    const existing = document.querySelector(
      'script[data-locore-test="true"]',
    ) as HTMLScriptElement | null;
    if (existing) existing.remove();

    // Google が UI 上に出すエラーを捕捉する gm_authFailure コールバック
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).gm_authFailure = () => {
      setStatus('AUTH_FAILURE');
      setErrorDetail(
        'Google から認証拒否。たぶん API キーの HTTP referrer 制限か、' +
          'API 未有効、または課金未設定。',
      );
    };

    const callbackName = '__locoreMapTestInit_' + Date.now();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)[callbackName] = () => {
      setStatus('script-loaded');
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const G = (window as any).google?.maps;
        if (!G) {
          setStatus('NO_GOOGLE_MAPS_GLOBAL');
          return;
        }
        if (!ref.current) {
          setStatus('NO_CONTAINER_REF');
          return;
        }
        new G.Map(ref.current, {
          center: { lat: 48.8566, lng: 2.3522 },
          zoom: 13,
        });
        setStatus('MAP_CREATED ✓');
      } catch (e) {
        setStatus('MAP_CREATE_ERROR');
        setErrorDetail(String(e));
      }
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&callback=${callbackName}`;
    script.async = true;
    script.dataset.locoreTest = 'true';
    script.onerror = (ev) => {
      setStatus('SCRIPT_LOAD_ERROR');
      setErrorDetail(String(ev));
    };
    document.head.appendChild(script);

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any)[callbackName];
    };
  }, [apiKey]);

  return (
    <main className="mx-auto max-w-screen-md space-y-4 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Map diagnostic</h1>

      <dl className="grid grid-cols-[140px_1fr] gap-y-2 rounded-md bg-card p-4 text-[13px] ring-1 ring-primary-100">
        <dt className="text-foreground/60">Status</dt>
        <dd className="font-mono">{status}</dd>

        <dt className="text-foreground/60">API key</dt>
        <dd className="font-mono">
          {apiKey
            ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)} (length ${apiKey.length})`
            : '(none — 未設定)'}
        </dd>

        <dt className="text-foreground/60">User-Agent host</dt>
        <dd className="font-mono">
          {typeof window !== 'undefined' ? window.location.host : ''}
        </dd>

        {errorDetail ? (
          <>
            <dt className="text-danger-500">Error</dt>
            <dd className="font-mono text-danger-500">{errorDetail}</dd>
          </>
        ) : null}
      </dl>

      <div
        ref={ref}
        className="h-[480px] w-full rounded-md border-2 border-primary-700"
      />

      <p className="text-[12px] text-foreground/60">
        ステータスが <code className="rounded bg-card px-1">MAP_CREATED ✓</code>{' '}
        になり地図が表示されたら、Cloud 側の設定は問題ありません。
        <br />
        <code className="rounded bg-card px-1">NO_API_KEY</code> の場合は Vercel
        の環境変数を Production にも追加して再デプロイ。
        <br />
        <code className="rounded bg-card px-1">AUTH_FAILURE</code> の場合は
        Google Cloud で「Maps JavaScript API を Enable」「リファラ制限に Vercel
        ドメイン追加」「Billing 有効化」のいずれか。
      </p>
    </main>
  );
}
