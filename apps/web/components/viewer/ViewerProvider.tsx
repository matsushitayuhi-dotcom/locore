'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

/**
 * クライアント側のログイン状態コンテキスト。
 *
 * ルートレイアウト / ヘッダーが cookie を読まずに済むよう、認証まわりの個人化情報は
 * すべてこの Provider が /api/me を fetch して供給する。これにより公開ページが
 * Vercel Edge Cache (ISR) でキャッシュ可能になり、Origin Data Transfer が激減する。
 *
 * - 初回は loading=true / user=null（＝未ログイン表示）でハイドレート
 * - マウント後に /api/me を叩いて実際の状態に差し替え
 * - mode は httpOnly=false の locore_mode cookie をクライアントから直接読む（即時）
 */

type ViewerUser = {
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
};

export type ViewerMode = 'traveler' | 'resident' | null;

export type ViewerState = {
  /** /api/me の取得が完了したか */
  loading: boolean;
  user: ViewerUser | null;
  unreadChatCount: number;
  isWriter: boolean;
  mode: ViewerMode;
};

const DEFAULT_STATE: ViewerState = {
  loading: true,
  user: null,
  unreadChatCount: 0,
  isWriter: false,
  mode: null,
};

const ViewerContext = createContext<ViewerState>(DEFAULT_STATE);

export function useViewer(): ViewerState {
  return useContext(ViewerContext);
}

function readModeCookie(): ViewerMode {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(
    /(?:^|;\s*)locore_mode=(traveler|resident)\b/,
  );
  return m ? (m[1] as 'traveler' | 'resident') : null;
}

export function ViewerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ViewerState>(DEFAULT_STATE);

  useEffect(() => {
    let cancelled = false;
    const mode = readModeCookie();

    fetch('/api/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        if (!d) {
          setState((s) => ({ ...s, loading: false, mode }));
          return;
        }
        setState({
          loading: false,
          user: d.user ?? null,
          unreadChatCount: typeof d.unreadChatCount === 'number' ? d.unreadChatCount : 0,
          isWriter: !!d.isWriter,
          mode,
        });
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, loading: false, mode }));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ViewerContext.Provider value={state}>{children}</ViewerContext.Provider>
  );
}
