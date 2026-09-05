'use client';

import { useEffect, useState } from 'react';
import { browserTz, formatSlotInTz } from '@/lib/bookings/time';

/**
 * 空き枠の開始時刻を「相談者の現地時間」で表示する小さな Client 部品。
 *
 * サーバー描画時は日本時間で出し、マウント後にブラウザの TZ（browserTz）で描き直す。
 * JST 以外の閲覧者は一瞬だけ表示が切り替わるが、レイアウトは変わらない。
 * ラベル（<LocalTzLabel />）も同じ TZ を出すので、時刻と説明がずれない。
 */
const JST = 'Asia/Tokyo';

export function useViewerTz(): string {
  const [tz, setTz] = useState(JST);
  useEffect(() => {
    try {
      setTz(browserTz() || JST);
    } catch {
      /* noop: JST のまま */
    }
  }, []);
  return tz;
}

export function LocalSlotTime({ iso, suffix = '〜' }: { iso: string; suffix?: string }) {
  const tz = useViewerTz();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return (
    <span suppressHydrationWarning>
      {formatSlotInTz(d, tz)}
      {suffix}
    </span>
  );
}

/** 「あなたの現地時間」＋ TZ 名。JST のときは「日本時間」 */
export function LocalTzLabel() {
  const tz = useViewerTz();
  const short = tz === JST ? '日本時間' : `あなたの現地時間（${tz.split('/').pop()?.replace(/_/g, ' ') ?? tz}）`;
  return <span suppressHydrationWarning>{short}</span>;
}
