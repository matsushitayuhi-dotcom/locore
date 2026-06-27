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
 */

type ViewerUser = {
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
};

export type ViewerState = {
  /** /api/me の取得が完了したか */
  loading: boolean;
  user: ViewerUser | null;
  unreadChatCount: number;
  isWriter: boolean;
};

const DEFAULT_STATE: ViewerState = {
  loading: true,
  user: null,
  unreadChatCount: 0,
  isWriter: false,
};

const ViewerContext = createContext<ViewerState>(DEFAULT_STATE);

export function useViewer(): ViewerState {
  return useContext(ViewerContext);
}

export function ViewerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ViewerState>(DEFAULT_STATE);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        if (!d) {
          setState((s) => ({ ...s, loading: false }));
          return;
        }
        setState({
          loading: false,
          user: d.user ?? null,
          unreadChatCount: typeof d.unreadChatCount === 'number' ? d.unreadChatCount : 0,
          isWriter: !!d.isWriter,
        });
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ViewerContext.Provider value={state}>{children}</ViewerContext.Provider>
  );
}
