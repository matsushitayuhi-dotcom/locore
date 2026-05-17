/**
 * Admin Sidebar のナビゲーション定義。
 *
 * - 全 admin ページを 1 箇所で管理
 * - status: 'ready' | 'stub'  → stub のページは「準備中」表示で出すがリンクは通す
 * - 各セクションは sidebar の見出しでグルーピング
 */

import {
  LayoutDashboard,
  Newspaper,
  Megaphone,
  Calendar,
  Users2,
  Flag,
  UserCheck,
  Sparkles,
  CircleDollarSign,
  Wallet,
  Bot,
  Mail,
  Settings,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';

export type AdminNavStatus = 'ready' | 'stub';

export type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  status: AdminNavStatus;
  /** 内部メモ・将来実装内容 */
  description?: string;
};

export type AdminNavSection = {
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV: AdminNavSection[] = [
  {
    label: 'Overview',
    items: [
      {
        label: 'ダッシュボード',
        href: '/admin',
        icon: LayoutDashboard,
        status: 'ready',
      },
    ],
  },
  {
    label: 'Content',
    items: [
      {
        label: '記事',
        href: '/admin/articles',
        icon: Newspaper,
        status: 'ready',
        description: '全ライターの記事を横断管理',
      },
      {
        label: '掲示板',
        href: '/admin/board',
        icon: Megaphone,
        status: 'ready',
      },
      {
        label: 'イベントカレンダー',
        href: '/calendar',
        icon: Calendar,
        status: 'ready',
        description: '/calendar への外部リンク (admin 用フィルタ無し)',
      },
    ],
  },
  {
    label: 'Community',
    items: [
      {
        label: 'コミュニティ投稿',
        href: '/admin/community',
        icon: MessageSquare,
        status: 'ready',
        description: '6 カテゴリ横断のモデレーション',
      },
      {
        label: '通報',
        href: '/admin/reports',
        icon: Flag,
        status: 'ready',
      },
    ],
  },
  {
    label: 'People',
    items: [
      {
        label: 'ユーザー',
        href: '/admin/users',
        icon: Users2,
        status: 'ready',
        description: '検索 / ロール変更 / 停止',
      },
      {
        label: '本人確認',
        href: '/admin/verifications',
        icon: UserCheck,
        status: 'ready',
      },
      {
        label: 'Founders 50',
        href: '/admin/founders',
        icon: Sparkles,
        status: 'stub',
        description: '応募管理・特典付与状況',
      },
    ],
  },
  {
    label: 'Revenue',
    items: [
      {
        label: '売上',
        href: '/admin/revenue',
        icon: CircleDollarSign,
        status: 'stub',
        description: '日次・月次推移、手数料内訳',
      },
      {
        label: 'ライター払い出し',
        href: '/admin/payouts',
        icon: Wallet,
        status: 'stub',
        description: 'Stripe Connect 連携前提',
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        label: 'AI 実行履歴',
        href: '/admin/system/ai-logs',
        icon: Bot,
        status: 'stub',
        description: 'Anthropic Claude cron の履歴と失敗',
      },
      {
        label: 'メールログ',
        href: '/admin/system/email-logs',
        icon: Mail,
        status: 'stub',
        description: 'Resend 送信履歴・bounce',
      },
      {
        label: '設定',
        href: '/admin/system/settings',
        icon: Settings,
        status: 'stub',
        description: '環境変数・機能フラグ等',
      },
    ],
  },
];

/** 指定パスのナビアイテムを検索 (パンくず用) */
export function findNavItem(pathname: string): AdminNavItem | null {
  for (const section of ADMIN_NAV) {
    for (const item of section.items) {
      if (item.href === pathname) return item;
      // /admin/users/[id] のような階層も親アイテムにヒットさせる
      if (item.href !== '/admin' && pathname.startsWith(item.href + '/')) {
        return item;
      }
    }
  }
  return null;
}
