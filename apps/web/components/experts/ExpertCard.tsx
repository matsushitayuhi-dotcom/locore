import Link from 'next/link';
import { BadgeCheck, Repeat, ShieldCheck } from 'lucide-react';
import type { ExpertCard as ExpertCardData } from '@/lib/experts/list';
import { specialtyLabel } from '@/lib/experts/specialties';
import type { Enrollment } from '@/lib/experts/enrollment';

/**
 * /experts 一覧・トップの「注目エキスパート」で使う縦長カード（Intro 型）。
 * mockups/v2/experts-list-intro.html の .ex を実装。
 *
 * - 4:5 の写真（本人アップロードの avatarUrl）。未登録は黒地に大きなイニシャル。
 * - ホバー / フォーカスで写真がズームし、下から「得意分野」チップ（users.specialties）が
 *   せり上がる。タッチ端末（hover 不可）では写真の下に先頭 3 件をそのまま出す。
 * - 写真の上: 左下に「居住認証済み」ピル、右上に都市名。
 * - 写真の下: 名前 + 認証チェック / 料金 • 30分〜 / 在住・職業 / 自己紹介 3 行。
 */
export type ExpertCardExtra = {
  /** 得意分野（第 2 階層 code）。無ければチップは出ない */
  specialties?: ReadonlyArray<string>;
  /** 国名（日本語）。無ければ国コードを出す */
  countryNameJa?: string | null;
  /**
   * 在学中 / アルムナイ（留学特化）。写真左上のチップと、場所行の学校名に使う。
   * データは lib/experts/list.ts 側（team-lead）で付与される想定。無ければ出さない。
   */
  enrollment?: Enrollment | null;
};

export function ExpertCard({
  expert,
  specialties = [],
  countryNameJa = null,
  enrollment = null,
  priority = false,
}: {
  expert: ExpertCardData;
  /** 画像の遅延読込を切る（最初の列など） */
  priority?: boolean;
} & ExpertCardExtra) {
  const chips = specialties.map((c) => ({ code: c, label: specialtyLabel(c) }));
  const place = [
    countryNameJa ?? expert.countryCode?.toUpperCase() ?? null,
    expert.cityNameJa ? `${expert.cityNameJa}在住` : null,
  ]
    .filter(Boolean)
    .join('・');

  return (
    <Link
      href={`/experts/${expert.userId}`}
      className="group block outline-none"
      aria-label={`${expert.displayName}のプロフィール`}
    >
      {/* ===== photo ===== */}
      <div className="relative aspect-[4/5] overflow-hidden rounded-[10px] bg-neutral-900 ring-0 transition duration-300 group-focus-visible:ring-[3px] group-focus-visible:ring-primary-500">
        {expert.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={expert.avatarUrl}
            alt=""
            loading={priority ? 'eager' : 'lazy'}
            className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.06]"
          />
        ) : (
          <div
            className="grid h-full w-full place-items-center bg-[radial-gradient(120%_90%_at_20%_10%,#2b3a12_0%,#141513_55%,#0e0e0f_100%)] transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.06]"
            aria-hidden
          >
            <span className="select-none text-[64px] font-bold leading-none text-primary-500 sm:text-[72px]">
              {expert.displayName.charAt(0)}
            </span>
          </div>
        )}

        {/* 在学中 / アルムナイ（左上）。在学中はライム、アルムナイは白 */}
        {enrollment ? <EnrollmentChip enrollment={enrollment} /> : null}

        {/* 都市名（右上） */}
        {expert.cityNameJa ? (
          <span className="absolute right-2.5 top-2.5 rounded-md bg-black/45 px-2 py-0.5 text-[10.5px] font-bold tracking-[0.06em] text-white backdrop-blur-sm">
            {expert.cityNameJa}
          </span>
        ) : null}

        {/* 認証ピル（左下）。ホバー時は得意分野に譲って消える */}
        {expert.isVerified ? (
          <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-lg bg-neutral-900/95 px-2.5 py-1.5 text-[11.5px] font-bold text-white transition-opacity duration-200 group-hover:opacity-0">
            <ShieldCheck className="h-3 w-3 text-primary-500" aria-hidden />
            居住認証済み
          </span>
        ) : null}

        {/* ホバー: 得意分野がせり上がる */}
        {chips.length > 0 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-2 flex-col justify-end bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 pb-3 pt-14 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 motion-reduce:transition-none">
            <span className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-500">
              得意分野
            </span>
            <ul className="flex flex-wrap gap-1">
              {chips.map((c) => (
                <li
                  key={c.code}
                  className="rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-bold text-neutral-900"
                >
                  {c.label}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* ===== text ===== */}
      <div className="mt-2.5 flex items-center gap-1.5 text-[15px] font-bold leading-tight text-foreground">
        <span className="truncate">{expert.displayName}</span>
        {expert.isVerified ? (
          <BadgeCheck
            className="h-[15px] w-[15px] shrink-0 text-primary-700"
            aria-label="居住認証済み"
          />
        ) : null}
      </div>
      <div className="mt-0.5 text-[13px] text-neutral-700">
        {expert.minPriceJpy != null ? (
          <>
            <b className="font-semibold tabular-nums text-foreground">
              ¥{expert.minPriceJpy.toLocaleString()}
            </b>
            <span className="mx-1.5 text-neutral-300">•</span>
            30分〜
          </>
        ) : (
          <b className="font-semibold text-foreground">応相談</b>
        )}
        {expert.hasPlan ? (
          <span
            className="ml-2 inline-flex items-center gap-1 rounded-full bg-neutral-900 px-2 py-[1px] align-[1px] text-[10.5px] font-bold text-primary-500"
            title="月額の継続プラン（伴走）があります"
          >
            <Repeat className="h-3 w-3" aria-hidden />
            継続プラン
          </span>
        ) : null}
      </div>
      {enrollment?.school ? (
        <div className="mt-0.5 line-clamp-1 text-[12.5px] font-medium text-neutral-700">
          {enrollment.school}
        </div>
      ) : null}
      {place || expert.occupation ? (
        <div className="mt-0.5 line-clamp-1 text-[12px] text-neutral-500">
          {place}
          {expert.yearsInCity != null ? ` ${expert.yearsInCity}年` : ''}
          {expert.occupation ? ` ・ ${expert.occupation}` : ''}
        </div>
      ) : null}
      {expert.bio ? (
        <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-[1.6] text-neutral-500">
          {expert.bio}
        </p>
      ) : null}

      {/* タッチ端末（hover 不可）向け: 得意分野の先頭 3 件 */}
      {chips.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1 [@media(hover:hover)]:hidden">
          {chips.slice(0, 3).map((c) => (
            <li
              key={c.code}
              className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-neutral-700"
            >
              {c.label}
            </li>
          ))}
        </ul>
      ) : null}
    </Link>
  );
}

/**
 * 在学中 / アルムナイのチップ。写真の上に置く前提（背景は不透明）。
 * 在学中 = ライム地（「いま現地にいる」を最優先で伝える）、
 * アルムナイ = 白地 + 卒業年（'24 のような 2 桁）。
 */
export function EnrollmentChip({
  enrollment,
  size = 'sm',
}: {
  enrollment: Enrollment;
  size?: 'sm' | 'md';
}) {
  const current = enrollment.status === 'current';
  const yy =
    !current && enrollment.year != null ? `’${String(enrollment.year).slice(-2)}` : '';
  return (
    <span
      className={
        'absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-md font-bold shadow-sm ' +
        (size === 'md' ? 'px-2.5 py-1 text-[12px]' : 'px-2 py-0.5 text-[10.5px]') +
        (current ? ' bg-primary-500 text-neutral-950' : ' bg-white/95 text-neutral-900')
      }
    >
      {current ? (
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-950" aria-hidden />
      ) : null}
      {current ? '在学中' : 'アルムナイ'}
      {yy ? <span className="font-semibold tabular-nums text-neutral-500">{yy}</span> : null}
    </span>
  );
}
