import {
  ExternalLink,
  Database,
  Cloud,
  Mail,
  ShieldCheck,
  Bot,
  CreditCard,
  Globe,
  Github,
  Wrench,
  CheckCircle2,
  AlertCircle,
  MinusCircle,
} from 'lucide-react';
import { AdminPageHeader } from '../../_components/AdminPageHeader';

/**
 * /admin/system/services — Locore を支える外部サービスのリンク集。
 *
 * 用途:
 *  - editor が「あれどこだったっけ」と迷ったときの一発ジャンプ
 *  - 環境変数の設定状況も同時にチェック
 *  - 各サービスの「よく開くサブページ」へのディープリンクも併設
 *
 * env チェックはサーバーサイドで実施。サニタイズはしないが、API キー
 * 本体は表示しない (true/false / 末尾 4 文字のみ)。
 */

export const metadata = { title: '外部サービス — Admin' };
export const dynamic = 'force-dynamic';

type ServiceLink = {
  label: string;
  href: string;
  /** ディープリンク先のメモ */
  hint?: string;
};

type ServiceStatus =
  | { kind: 'ok'; detail?: string } // 環境変数 OK
  | { kind: 'missing'; detail: string } // 必要な env が無い
  | { kind: 'n/a' }; // env チェック対象外

type Service = {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  links: ServiceLink[];
  /** 関連する環境変数 (key, 必須かどうか) */
  envVars?: Array<{ key: string; required: boolean }>;
  /** 自由メモ */
  notes?: string[];
};

type ServiceSection = {
  label: string;
  services: Service[];
};

function checkEnv(key: string): boolean {
  return typeof process.env[key] === 'string' && process.env[key]!.length > 0;
}

function maskTail(key: string): string | null {
  const v = process.env[key];
  if (!v) return null;
  if (v.length <= 8) return '***';
  return `***${v.slice(-4)}`;
}

const SECTIONS: ServiceSection[] = [
  // ---------- インフラ ----------
  {
    label: 'インフラ',
    services: [
      {
        name: 'Vercel',
        icon: Cloud,
        description:
          'Web ホスティング・デプロイ・ドメイン・環境変数・Cron。',
        links: [
          { label: 'Dashboard', href: 'https://vercel.com/dashboard' },
          {
            label: 'Project Settings',
            href: 'https://vercel.com/dashboard',
            hint: 'プロジェクトを開いて Settings → Environment Variables / Domains',
          },
          {
            label: 'Logs (Runtime)',
            href: 'https://vercel.com/dashboard',
            hint: 'プロジェクト → Logs タブ',
          },
        ],
        notes: [
          'デプロイは git push で自動。preview は Pull Request ごと',
          '本番ドメイン: www.locore.app (apex は 307 redirect)',
        ],
      },
      {
        name: 'Supabase',
        icon: Database,
        description:
          'Postgres + Auth + Storage。DB の全データ・ユーザー認証・ファイル。',
        links: [
          { label: 'Dashboard', href: 'https://supabase.com/dashboard' },
          {
            label: 'SQL Editor',
            href: 'https://supabase.com/dashboard',
            hint: 'プロジェクト選択 → 左メニュー SQL Editor',
          },
          {
            label: 'Authentication',
            href: 'https://supabase.com/dashboard',
            hint: 'プロジェクト → Authentication → Users / URL Configuration',
          },
          {
            label: 'Storage',
            href: 'https://supabase.com/dashboard',
            hint: 'プロジェクト → Storage → article-images / verification-docs 等',
          },
          {
            label: 'Logs',
            href: 'https://supabase.com/dashboard',
            hint: 'プロジェクト → Logs → Postgres / Auth / API',
          },
        ],
        envVars: [
          { key: 'NEXT_PUBLIC_SUPABASE_URL', required: true },
          { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', required: true },
          { key: 'SUPABASE_SERVICE_ROLE_KEY', required: false },
        ],
      },
    ],
  },

  // ---------- 通信 ----------
  {
    label: '通信・通知',
    services: [
      {
        name: 'Resend',
        icon: Mail,
        description: 'トランザクションメール送信 (本人確認の通知など)。',
        links: [
          { label: 'Dashboard', href: 'https://resend.com/dashboard' },
          {
            label: 'Domains',
            href: 'https://resend.com/domains',
            hint: 'locore.app の DKIM/SPF 認証状況',
          },
          { label: 'API Keys', href: 'https://resend.com/api-keys' },
          {
            label: 'Email Logs',
            href: 'https://resend.com/emails',
            hint: '実送信履歴 / bounce / complaint',
          },
        ],
        envVars: [
          { key: 'RESEND_API_KEY', required: true },
          { key: 'LOCORE_FROM_EMAIL', required: false },
          { key: 'LOCORE_SUPPORT_EMAIL', required: false },
        ],
        notes: [
          'ドメイン未認証中は LOCORE_FROM_EMAIL を onboarding@resend.dev に',
          '無料枠: 3,000 通/月 (Founders 50 のフェーズなら十分)',
        ],
      },
    ],
  },

  // ---------- 認証 ----------
  {
    label: '認証',
    services: [
      {
        name: 'Google Cloud Console',
        icon: ShieldCheck,
        description: 'Google OAuth (Sign in with Google) のクライアント設定。',
        links: [
          {
            label: 'Console Home',
            href: 'https://console.cloud.google.com/',
          },
          {
            label: 'OAuth Credentials',
            href: 'https://console.cloud.google.com/apis/credentials',
            hint: 'OAuth 2.0 Client IDs → 認証 URL / origin 設定',
          },
          {
            label: 'OAuth Consent Screen',
            href: 'https://console.cloud.google.com/apis/credentials/consent',
            hint: 'Publishing status / Test users 管理',
          },
        ],
        notes: [
          'Authorized redirect URI: https://<supabase-ref>.supabase.co/auth/v1/callback',
          'Testing モードのときは Test users に gmail を追加しないとログイン不可',
        ],
      },
    ],
  },

  // ---------- AI ----------
  {
    label: 'AI',
    services: [
      {
        name: 'Anthropic Console',
        icon: Bot,
        description:
          'Claude API キー管理・使用量・ログ。パリイベント自動収集に利用。',
        links: [
          { label: 'Console', href: 'https://console.anthropic.com/' },
          {
            label: 'API Keys',
            href: 'https://console.anthropic.com/settings/keys',
          },
          {
            label: 'Usage',
            href: 'https://console.anthropic.com/settings/usage',
            hint: 'トークン消費・課金状況',
          },
          {
            label: 'Workbench',
            href: 'https://console.anthropic.com/workbench',
            hint: 'プロンプトを手動でテスト',
          },
        ],
        envVars: [
          { key: 'ANTHROPIC_API_KEY', required: true },
          { key: 'CRON_SECRET', required: true },
        ],
        notes: [
          'パリイベント取得 1 回 ≒ $0.10 (web_search 含む)',
          '/admin/board の「AI テスト実行」で疎通確認可能',
        ],
      },
    ],
  },

  // ---------- 決済 ----------
  {
    label: '決済',
    services: [
      {
        name: 'Stripe Dashboard',
        icon: CreditCard,
        description: '記事購入・サブスク・ライター払い出し (Connect)。',
        links: [
          { label: 'Dashboard', href: 'https://dashboard.stripe.com/' },
          {
            label: 'Payments',
            href: 'https://dashboard.stripe.com/payments',
          },
          {
            label: 'Connect',
            href: 'https://dashboard.stripe.com/connect/accounts/overview',
            hint: 'ライター連結アカウント管理',
          },
          {
            label: 'Webhooks',
            href: 'https://dashboard.stripe.com/webhooks',
          },
          { label: 'API Keys', href: 'https://dashboard.stripe.com/apikeys' },
        ],
        envVars: [
          { key: 'STRIPE_SECRET_KEY', required: false },
          { key: 'STRIPE_WEBHOOK_SECRET', required: false },
          { key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', required: false },
        ],
        notes: [
          '現状: 未連携。決済導入は Founders 50 募集の次フェーズ',
          'ライター取り分は Stripe Connect の transfer_data で実装予定',
        ],
      },
    ],
  },

  // ---------- ドメイン ----------
  {
    label: 'ドメイン・DNS',
    services: [
      {
        name: 'Squarespace Domains',
        icon: Globe,
        description: 'locore.app の DNS 管理 (旧 Google Domains)。',
        links: [
          {
            label: 'Domains',
            href: 'https://account.squarespace.com/domains',
            hint: 'locore.app → DNS 設定',
          },
        ],
        notes: [
          'A レコードと CNAME で Vercel に向いている',
          'メール用: Google Workspace MX + DKIM が apex に既存',
          'Resend 用: send サブドメイン (SPF/MX) + resend._domainkey (DKIM)',
        ],
      },
      {
        name: 'DNS Checker',
        icon: Wrench,
        description: 'DNS 伝播状況を世界中から確認できるツール。',
        links: [
          {
            label: 'locore.app の NS',
            href: 'https://dnschecker.org/ns-lookup.php?query=locore.app',
          },
          {
            label: 'TXT (SPF / DKIM)',
            href: 'https://dnschecker.org/all-dns-records-of-domain.php?query=locore.app',
          },
        ],
      },
    ],
  },

  // ---------- コード ----------
  {
    label: 'コード',
    services: [
      {
        name: 'GitHub',
        icon: Github,
        description: 'ソースコード・PR・Actions・Issues。',
        links: [
          {
            label: 'Repository',
            href: 'https://github.com/matsushitayuhi-dotcom/locore',
          },
          {
            label: 'Actions',
            href: 'https://github.com/matsushitayuhi-dotcom/locore/actions',
            hint: 'CI ステータス (lint / typecheck / build)',
          },
          {
            label: 'Pull Requests',
            href: 'https://github.com/matsushitayuhi-dotcom/locore/pulls',
          },
        ],
      },
    ],
  },
];

// ============================================================================
// ページ本体
// ============================================================================

export default function AdminServicesPage() {
  return (
    <div>
      <AdminPageHeader
        title="外部サービス"
        description="Locore を支える各種サービスへのリンク集。環境変数の設定状況も併記。"
      />

      <div className="space-y-8">
        {SECTIONS.map((section) => (
          <section key={section.label}>
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/55">
              {section.label}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {section.services.map((svc) => (
                <ServiceCard key={svc.name} service={svc} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-10 rounded-xl border border-dashed border-border bg-card p-5 text-[11px] text-foreground/55">
        <p className="font-semibold text-foreground/70">補足</p>
        <ul className="mt-2 space-y-1 list-disc pl-5">
          <li>
            環境変数のチェックは <strong>サーバーサイドで現在のランタイム</strong>
            を見ています。Vercel の env を変更したら再デプロイで反映
          </li>
          <li>
            API キーの値は <strong>末尾 4 文字</strong>
            だけ表示。完全な値は Vercel / 各サービス Dashboard で確認してください
          </li>
          <li>
            サブページの hint
            は「ダッシュボードを開いてからどう辿るか」のメモ。直接ディープリンクできないものは hint に手順
          </li>
        </ul>
      </footer>
    </div>
  );
}

// ============================================================================
// パーツ
// ============================================================================

function ServiceCard({ service }: { service: Service }) {
  const Icon = service.icon;
  const envStatuses =
    service.envVars?.map((v) => {
      const exists = checkEnv(v.key);
      const status: ServiceStatus = exists
        ? { kind: 'ok', detail: maskTail(v.key) ?? undefined }
        : v.required
          ? { kind: 'missing', detail: '未設定' }
          : { kind: 'missing', detail: '未設定 (任意)' };
      return { key: v.key, required: v.required, status };
    }) ?? [];

  // カード全体のヘルスサインを決める
  const hasMissingRequired = envStatuses.some(
    (e) => e.required && e.status.kind === 'missing',
  );
  const healthColor = hasMissingRequired
    ? 'border-danger-500/30 bg-danger-500/5'
    : 'border-border bg-card';

  return (
    <div className={`rounded-xl border p-4 ${healthColor}`}>
      <div className="mb-3 flex items-start gap-2.5">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-300">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-semibold leading-tight">
            {service.name}
            {hasMissingRequired ? (
              <span className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-danger-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-danger-500">
                <AlertCircle className="h-2.5 w-2.5" />
                env 未設定
              </span>
            ) : null}
          </h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-foreground/65">
            {service.description}
          </p>
        </div>
      </div>

      {/* リンク群 */}
      <ul className="space-y-1">
        {service.links.map((link, i) => (
          <li key={i}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-1.5 rounded-md px-2 py-1 text-[12px] transition hover:bg-muted"
            >
              <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-foreground/40 group-hover:text-primary-300" />
              <div className="min-w-0 flex-1">
                <span className="font-medium text-foreground group-hover:text-primary-300">
                  {link.label}
                </span>
                {link.hint ? (
                  <span className="ml-1.5 text-[10px] text-foreground/45">
                    — {link.hint}
                  </span>
                ) : null}
              </div>
            </a>
          </li>
        ))}
      </ul>

      {/* 環境変数 */}
      {envStatuses.length > 0 ? (
        <div className="mt-3 border-t border-border pt-2">
          <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-foreground/50">
            環境変数 (Vercel)
          </p>
          <ul className="space-y-0.5">
            {envStatuses.map(({ key, required, status }) => (
              <li
                key={key}
                className="flex items-center justify-between gap-2 text-[10px] tabular"
              >
                <span className="font-mono text-foreground/70">
                  {key}
                  {required ? null : (
                    <span className="ml-1 text-foreground/40">(任意)</span>
                  )}
                </span>
                <EnvStatusBadge status={status} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* 自由メモ */}
      {service.notes && service.notes.length > 0 ? (
        <ul className="mt-3 border-t border-border pt-2 space-y-0.5 text-[10px] text-foreground/55">
          {service.notes.map((n, i) => (
            <li key={i} className="flex items-start gap-1">
              <span className="text-foreground/30">·</span>
              <span>{n}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function EnvStatusBadge({ status }: { status: ServiceStatus }) {
  if (status.kind === 'ok') {
    return (
      <span className="inline-flex items-center gap-0.5 text-success-500">
        <CheckCircle2 className="h-2.5 w-2.5" />
        {status.detail ?? 'OK'}
      </span>
    );
  }
  if (status.kind === 'missing') {
    return (
      <span className="inline-flex items-center gap-0.5 text-danger-500">
        <AlertCircle className="h-2.5 w-2.5" />
        {status.detail}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-foreground/40">
      <MinusCircle className="h-2.5 w-2.5" />
      n/a
    </span>
  );
}
