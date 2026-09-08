import Link from 'next/link';
import { BadgeCheck, Repeat } from 'lucide-react';
import type { ExpertCard as ExpertCardData } from '@/lib/experts/list';
import { specialtyLabel } from '@/lib/experts/specialties';
import type { Enrollment } from '@/lib/experts/enrollment';

/**
 * カード下部（タッチ端末）で出す得意分野チップの数。残りは「+N」に畳む。
 * 1 件なのは幅の実測から: 402px の 2 列でカードは 174px、320px では 133px しか無い。
 * 「+N」約 20px と gap を引いた残りを 2 分割すると 1 チップ 53〜73px = 4〜6 文字で、
 * 「カレッジ選び・ランキングの読み方」「奨学金（JASSO・大学奨学金など）」のような
 * 実データのラベルは『カレ…』まで潰れて読めない。先頭 1 件は読めることを基準にする。
 */
const CHIPS_VISIBLE = 1;
/** 写真の上（ホバー）で出す得意分野チップの数。写真幅ぶん余裕があるので 1 つ多い */
const CHIPS_VISIBLE_HOVER = 3;

/**
 * /experts 一覧・トップの「注目エキスパート」で使う縦長カード（Intro 型）。
 * mockups/v2/experts-list-intro.html の .ex を実装。
 *
 * 情報量は「誰か（名前・在籍確認）／どこの何年目か（バッジ・大学）／いくらか（価格）」に絞る。
 * 自己紹介は 2 行、得意分野は先頭 1 件 +N までで、続きは詳細ページに送る（視線を迷わせない）。
 *
 * - 4:5 の写真（本人アップロードの avatarUrl）。未登録は黒地に大きなイニシャル。
 * - 写真に重ねるのは都市名チップだけ。在学中/アルムナイのバッジは顔に被るので写真の外（大学名の行）に出す。
 * - ホバー / フォーカスで写真がズームし、下から「得意分野」チップ（users.specialties）が
 *   せり上がる。タッチ端末（hover 不可）では写真の下に先頭 1 件をそのまま出す。
 * - 写真の下: 名前 + 認証チェック / バッジ + 大学 / 料金 • 30分〜 / 在住地 / 自己紹介 2 行。
 */
export type ExpertCardExtra = {
  /** 得意分野（第 2 階層 code）。無ければチップは出ない */
  specialties?: ReadonlyArray<string>;
  /** 国名（日本語）。無ければ国コードを出す */
  countryNameJa?: string | null;
  /**
   * 在学中 / アルムナイ（留学特化）。大学名の行に置くバッジに使う。
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
  // 在住地はここでは国だけ。都市名は写真右上のチップで出しているので、
  // 同じカードに「ボストン」と「アメリカ・ボストン在住」が二重で出ないようにする。
  // 在住年数と職業は詳細ページに送って 1 行に収める
  const country = countryNameJa ?? expert.countryCode?.toUpperCase() ?? null;
  const place = country ? `${country}在住` : '';
  // 立場はバッジ（在学中 / アルムナイ）が語るので、バッジが無いときだけ職業で補う
  const role = enrollment ? null : expert.occupation;

  return (
    // カルーセル / グリッドの中で高さを揃える（h-full）。得意分野チップは mt-auto で底に寄せる
    <Link
      href={`/experts/${expert.userId}`}
      className="group flex h-full flex-col outline-none"
      aria-label={`${expert.displayName}のプロフィール`}
    >
      {/* ===== photo ===== */}
      <div className="relative aspect-[4/5] shrink-0 overflow-hidden rounded-[10px] bg-neutral-900 ring-0 transition duration-300 group-focus-visible:ring-[3px] group-focus-visible:ring-primary-500">
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

        {/* 都市名（右上）。写真に重ねるのはこれ 1 つだけにして顔を隠さない。
            在学中 / アルムナイのバッジを写真の外へ出したので、以前スマホで
            この都市名を隠していた max-sm:hidden はもう要らない */}
        {expert.cityNameJa ? (
          <span
            // 10.5px は 402px の実機で読めないので、スマホだけ 11px に上げる（PC は据え置き）
            className="absolute right-2 top-2 whitespace-nowrap rounded-md bg-black/45 px-1.5 py-0.5 text-[11px] font-bold tracking-[0.06em] text-white backdrop-blur-sm sm:text-[10.5px]"
          >
            {expert.cityNameJa}
          </span>
        ) : null}

        {/* ホバー: 得意分野がせり上がる。カード下部と同じく上位数件 + 「+N」に畳む */}
        {chips.length > 0 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-2 flex-col justify-end bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 pb-3 pt-14 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 motion-reduce:transition-none">
            {/* focus-visible ではタッチ端末でも出る見出し。10px → スマホ 11px（PC は据え置き） */}
            <span className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-500 sm:text-[10px]">
              得意分野
            </span>
            <ul className="flex flex-wrap items-center gap-1">
              {chips.slice(0, CHIPS_VISIBLE_HOVER).map((c) => (
                <li
                  key={c.code}
                  className="max-w-full truncate rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-bold text-neutral-900"
                >
                  {c.label}
                </li>
              ))}
              {chips.length > CHIPS_VISIBLE_HOVER ? (
                <li className="shrink-0 text-[11px] font-bold text-white/80">
                  +{chips.length - CHIPS_VISIBLE_HOVER}
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>

      {/* ===== text ===== */}
      <div className="mt-2.5 flex items-center gap-1.5 text-[15px] font-bold leading-tight text-foreground">
        <span className="truncate">{expert.displayName}</span>
        {/* 「在籍確認済み」は写真の上のピルと二重だったので、このチェック 1 つに寄せた。
            在籍確認はこのサービスの価値の芯なので、アイコン 1 つになるぶん意味は落とさない:
            role の無い <svg> の aria-label は読み上げに乗らない実装があるため、
            span 側に role="img" + aria-label を置き、hover のツールチップ（title）も付ける */}
        {expert.isVerified ? (
          <span
            role="img"
            aria-label="在籍確認済み"
            title="在籍確認済み"
            className="inline-flex shrink-0"
          >
            <BadgeCheck className="h-[15px] w-[15px] text-primary-700" aria-hidden />
          </span>
        ) : null}
      </div>

      {/* バッジ + 大学名。バッジは縮まない側（shrink-0）、大学名は縮む側（flex-1 + truncate）。
          shrink-0 のバッジ（「在学中」「24卒」で約 48px）と同じ行に置くと、402px の
          カード 174px では大学名に 120px、320px の 133px では 79px しか残らず
          『カリフォルニ…』まで削れる。大学は情報の芯なので、min-w-[7rem]（112px）を
          割り込む幅では flex-wrap で次の行（カード全幅）に落とす。
          flex-1 は flex-basis:0 なので min-w の併記が折り返しの引き金になる。
          いずれの行も 1 行（truncate）に切って、カードの高さは動かさない */}
      {enrollment ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12.5px] font-medium text-neutral-700">
          <EnrollmentChip enrollment={enrollment} placement="inline" />
          {enrollment.school ? (
            <span className="min-w-[7rem] max-w-full flex-1 truncate">{enrollment.school}</span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-1 text-[13px] text-neutral-700">
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
          // カード幅 174px（320px では 133px）の行末に来ると inline-flex が潰れて
          // 「継 / 続 / プ / ラ / ン」と 1 文字ずつ縦に割れるので nowrap。文字も 11px 以上に
          <span
            className="ml-2 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-neutral-900 px-2 py-[1px] align-[1px] text-[11px] font-bold text-primary-500 sm:text-[10.5px]"
            title="月額の継続プラン（伴走）があります"
          >
            <Repeat className="h-3 w-3 shrink-0" aria-hidden />
            継続プラン
          </span>
        ) : null}
      </div>

      {/* 在住地。都市名は写真右上のチップが担当するので、ここは国だけにして重複させない
          （在住年数と職業は詳細ページへ。職業はバッジが無いときだけ立場の代わりに出す） */}
      {place || role ? (
        <div className="mt-0.5 line-clamp-1 text-[11.5px] text-neutral-500">
          {place}
          {role ? `${place ? ' ・ ' : ''}${role}` : ''}
        </div>
      ) : null}

      {/* 自己紹介は 2 行まで。続きは詳細ページで読ませる（4〜5 行あると視線が定まらない）。
          カードの高さがばらつく最大の原因はここ（0 / 1 / 2 行）なので、
          自己紹介が無い人・1 行の人でも 2 行ぶん（12.5px × 1.6 × 2 = 40px）は場所を取り、
          隣のカードと下端が揃うようにする */}
      <p className="mt-1.5 line-clamp-2 min-h-[40px] text-[12.5px] leading-[1.6] text-neutral-500">
        {expert.bio}
      </p>

      {/* タッチ端末（hover 不可）向け: 得意分野の先頭 1 件 + 「+N」。
          折り返さず 1 行に固定して（flex-wrap なし + truncate）カードの高さを揃える。
          このリストは hover 可（= PC）では display:none なので、max-sm: を付けずに
          無条件にしても PC の見た目は変わらない。iPad（hover:none で sm/md 幅）も救う。
          mt-auto は hidden にならない外側の div に置く（ul 側だと PC で消えて効かない） */}
      <div className="mt-auto">
        {chips.length > 0 ? (
          <ul className="flex min-w-0 items-center gap-1 pt-2 [@media(hover:hover)]:hidden">
            {chips.slice(0, CHIPS_VISIBLE).map((c) => (
              // スマホ（hover 不可）専用のリストなので、10.5px は実機で読めない。11px のまま
              // 文字は詰められないぶん、パディングを px-1.5/py-[1px] まで詰めて小ぶりにする
              <li
                key={c.code}
                className="min-w-0 truncate rounded-full bg-muted px-1.5 py-[1px] text-[11px] font-medium text-neutral-700"
              >
                {c.label}
              </li>
            ))}
            {chips.length > CHIPS_VISIBLE ? (
              <li className="shrink-0 text-[11px] font-semibold text-neutral-500">
                +{chips.length - CHIPS_VISIBLE}
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </Link>
  );
}

/**
 * 在学中 / アルムナイのチップ。
 * 在学中 = ライム地（「いま現地にいる」を最優先で伝える）、
 * アルムナイ = 卒業年つき（overlay は「アルムナイ ’24」、inline は「24卒」）。
 *
 * placement: 'overlay' は写真の上に絶対配置（詳細ページのヘッダー写真）。既定でここは従来どおり。
 * 'inline' は文字列の行に混ぜる用（一覧カードの大学名の行）。顔に被らないよう写真の外に出す
 * 想定なので、白背景でも読める地色にして、幅も隣の大学名に譲れるところまで詰める。
 */
export function EnrollmentChip({
  enrollment,
  size = 'sm',
  placement = 'overlay',
}: {
  enrollment: Enrollment;
  size?: 'sm' | 'md';
  placement?: 'overlay' | 'inline';
}) {
  const current = enrollment.status === 'current';
  const yy = !current && enrollment.year != null ? `’${String(enrollment.year).slice(-2)}` : '';
  const overlay = placement === 'overlay';
  // inline は隣に大学名が並ぶ。320px（カード 133px）だと「アルムナイ ’21」で 87px 使って
  // 大学名が 3 文字しか残らないので、卒業年があれば「21卒」に縮める（意味は同じ）
  const alumniShort = enrollment.year != null ? `${String(enrollment.year).slice(-2)}卒` : '卒業生';
  return (
    <span
      className={
        // 402px の 2 列（カード 174px）でも 1 行に保つ: whitespace-nowrap
        'inline-flex items-center gap-1 whitespace-nowrap rounded-md font-bold ' +
        (overlay ? 'absolute left-2.5 top-2.5 shadow-sm ' : 'shrink-0 ') +
        // sm は写真の上（スマホの 2 列カード）で使う。10.5px は実機で読めないので
        // スマホだけ 11px に上げ、PC は sm: で従来どおり 10.5px に戻す。
        // inline は白背景の文字列に混ぜるので、顔を隠さない代わりに 11px 固定で詰める
        (size === 'md'
          ? 'px-2.5 py-1 text-[12px]'
          : overlay
            ? 'px-2 py-0.5 text-[11px] sm:text-[10.5px]'
            : 'px-1.5 py-[1px] text-[11px]') +
        (current
          ? ' bg-primary-500 text-neutral-950'
          : overlay
            ? ' bg-white/95 text-neutral-900'
            : ' bg-muted text-neutral-700')
      }
    >
      {/* ドットは写真の上（overlay）だけ。inline では 10px ぶんを大学名に回す */}
      {current && overlay ? (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-950" aria-hidden />
      ) : null}
      {current ? '在学中' : overlay ? 'アルムナイ' : alumniShort}
      {yy && overlay ? (
        <span className="font-semibold tabular-nums text-neutral-500">{yy}</span>
      ) : null}
    </span>
  );
}
