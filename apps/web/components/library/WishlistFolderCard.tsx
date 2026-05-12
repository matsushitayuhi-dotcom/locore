'use client';

/** 簡易 classnames helper（既存 cn util が web 側には無いのでローカルで用意） */
function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ');
}

/**
 * Airbnb Wishlists 風のフォルダカード。
 *
 * - 2x2 のコラージュにフォルダ内の最初の 4 件のカバー画像を埋める
 * - 4 未満ならグレー（surface-muted）プレースホルダーで埋める
 * - 下部にフォルダ名 + 件数
 * - クリックで親に通知（onClick）
 */

export type WishlistPreview = {
  /** 表示用カバー画像 URL。null/undefined のスロットはグレーで埋める */
  coverImageUrl?: string | null;
};

type Props = {
  name: string;
  count: number;
  previews: WishlistPreview[];
  onClick: () => void;
  /** 強調表示（"すべて" / "未分類" など特殊フォルダで使う） */
  variant?: 'default' | 'special';
};

export function WishlistFolderCard({
  name,
  count,
  previews,
  onClick,
  variant = 'default',
}: Props) {
  // 4 スロット分埋める（足りなければ undefined を入れて placeholder にする）
  const slots = [
    previews[0],
    previews[1],
    previews[2],
    previews[3],
  ];

  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        'group flex flex-col gap-2 text-left transition-transform duration-fast ease-out active:scale-[0.98]',
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
        <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5">
          {slots.map((s, i) => (
            <div key={i} className="relative bg-surface-muted overflow-hidden">
              {s?.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.coverImageUrl}
                  alt=""
                  loading="lazy"
                  className={classNames(
                    'h-full w-full object-cover transition-transform duration-slow ease-out',
                    'group-hover:scale-[1.04]',
                  )}
                />
              ) : (
                <div className="h-full w-full bg-muted" />
              )}
            </div>
          ))}
        </div>
        {/* 空フォルダのときだけ大きいオーバーレイで分かりやすく */}
        {count === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-[12px] font-medium text-foreground/40">
            まだ保存なし
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-0.5 px-0.5">
        <p
          className={classNames(
            'truncate text-[14px] font-semibold leading-snug',
            variant === 'special' ? 'text-primary-300' : 'text-foreground',
          )}
        >
          {name}
        </p>
        <p className="text-[11px] text-foreground/55">
          <span className="tabular">{count}</span> 件
        </p>
      </div>
    </button>
  );
}
