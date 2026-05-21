import { AdminBreadcrumb } from './AdminBreadcrumb';

/**
 * Admin ページ共通ヘッダー。パンくず + タイトル + 説明 + 右側アクション。
 *
 * 各 admin ページの一番上で使う。タイトルと説明は serif で目立たせる。
 */
export function AdminPageHeader({
  title,
  description,
  trail,
  kicker,
  actions,
}: {
  title: string;
  description?: string;
  /** パンくずの末尾追加 (例: 個別 ID 名前) */
  trail?: string[];
  /** タイトル上の小さいラベル (例: "Pending 3 件") */
  kicker?: React.ReactNode;
  /** 右側に置くボタン群 */
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-6 space-y-3 border-b border-border pb-5">
      <AdminBreadcrumb trail={trail} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {kicker ? <div className="mb-1.5">{kicker}</div> : null}
          <h1
            className="text-[22px] font-semibold tracking-tight sm:text-[26px]"
          >
            {title}
          </h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-[12px] text-foreground/65 sm:text-[13px]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
