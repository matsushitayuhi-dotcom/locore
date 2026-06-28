'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ApplyButton } from '@/components/community/ApplyButton';
import { OwnerActions } from '@/app/groups/[id]/OwnerActions';
import { RsvpButtons } from './RsvpButtons';
import {
  GROUP_CATEGORY_LABEL,
  FREQUENCY_LABEL,
  LEVEL_LABEL,
  GROUP_LOCATION_FORMAT_LABEL,
  GROUP_LANGUAGE_LABEL,
  type GroupMetadata,
  type GroupCategory,
  type GroupFrequency,
  type GroupLevel,
  type GroupLocationFormat,
  type GroupLanguage,
} from '@/lib/community/constants';
import type { EventRsvpSummary } from '@/lib/community/rsvp';
import { CSS } from './groupDetailCss';

/**
 * /groups/[id] — 集まり詳細ページ（参加者目線・クライアント）。
 *
 * ★ CSS は groupDetailCss.ts の文字列を生 <style dangerouslySetInnerHTML> で描画。
 *   styled-jsx / :global() は使わない（.gr- プレフィックス）。
 *
 * 偽データは出さない:
 *   - 参加予定数・残り枠は実 RSVP（getEventRsvpSummary）の集計のみ。
 *   - 満足度・★評価などは一切出さない。RSVP 0 件は空状態メッセージ。
 *
 * 後方互換: 拡張フィールドは全て任意。データの無いセクション/タグ/枠は描画しない。
 */

export type GroupDetailData = {
  id: string;
  title: string;
  body: string; // markdown → html 済み
  status: 'active' | 'closed' | 'expired';
  photos: string[];
  locationText: string | null;
  cityNameJa: string | null;
  latitude: number | null;
  longitude: number | null;
  priceAmount: number | null;
  priceCurrency: string;
  metadata: GroupMetadata;
  createdAt: string;
  contactEmail: string | null;
  authorId: string;
  authorName: string | null;
  authorAvatarUrl: string | null;
  authorVerified: boolean;
};

type Props = {
  post: GroupDetailData;
  viewerLoggedIn: boolean;
  isOwner: boolean;
  rsvp: EventRsvpSummary;
};

const stroke = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const Ic = {
  share: (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
  ),
  heart: (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><path d="M12 21s-7-4.6-9.4-8.5C1 9.6 2.4 6 6 6c2 0 3.2 1.2 4 2.3C10.8 7.2 12 6 14 6c3.6 0 5 3.6 3.4 6.5C19 16.4 12 21 12 21z" /></svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={3}><path d="M5 12l5 5L20 7" /></svg>
  ),
  chevron: (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2.5}><path d="M9 6l6 6-6 6" /></svg>
  ),
  grid: (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
  ),
  verified: (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2.4}><path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.9 7.2 17.7l.9-5.4L4.2 8.5l5.4-.8z" /></svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><path d="M12 3l8 4v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7z" /><path d="M9 12l2 2 4-4" /></svg>
  ),
  monitor: (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
  ),
  // band icons
  calendar: (
    <svg viewBox="0 0 24 24" {...stroke}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>
  ),
  mapPin: (
    <svg viewBox="0 0 24 24" {...stroke}><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
  ),
  fee: (
    <svg viewBox="0 0 24 24" {...stroke}><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" {...stroke}><path d="M16 19a4 4 0 0 0-8 0M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6M5 19a3 3 0 0 1 4-2.8M19 19a3 3 0 0 0-4-2.8" /></svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" {...stroke}><path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.9 7.2 17.7l.9-5.4L4.2 8.5l5.4-.8z" /></svg>
  ),
  lang: (
    <svg viewBox="0 0 24 24" {...stroke}><path d="M3 5h18M3 12h18M3 19h12" /></svg>
  ),
};

const MONTH_JA = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土'];

function currencySymbol(cur: string): string {
  if (cur === 'EUR') return '€';
  if (cur === 'JPY') return '¥';
  if (cur === 'USD') return '$';
  if (cur === 'GBP') return '£';
  return cur + ' ';
}

function parseYmd(d?: string): Date | null {
  if (!d) return null;
  const date = new Date(d.length === 10 ? d + 'T00:00:00' : d);
  return isNaN(date.getTime()) ? null : date;
}

function fmtEventDate(d: Date, withWeekday = true): string {
  const base = `${d.getMonth() + 1}月${d.getDate()}日`;
  return withWeekday ? `${base}(${WEEKDAY_JA[d.getDay()]})` : base;
}

function fmtDeadline(d: string): { label: string; soon: boolean } | null {
  const date = parseYmd(d);
  if (!date) return null;
  const label = `${date.getMonth() + 1}月${date.getDate()}日`;
  const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return { label, soon: days >= 0 && days <= 7 };
}

export function GroupDetail({ post, viewerLoggedIn, isOwner, rsvp }: Props) {
  const [saved, setSaved] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  const meta: GroupMetadata = post.metadata ?? ({} as GroupMetadata);
  const closed = post.status !== 'active';
  const sym = currencySymbol(post.priceCurrency);

  const photos = post.photos ?? [];
  const hasPhotos = photos.length > 0;
  const galleryClass =
    photos.length === 1 ? ' one' : photos.length === 2 ? ' two' : photos.length === 3 ? ' three' : '';

  const category = meta.category as GroupCategory | undefined;
  const frequency = meta.meeting_frequency as GroupFrequency | undefined;
  const skillLevel = meta.skill_level as GroupLevel | undefined;
  const locationFormat = meta.location_format as GroupLocationFormat | undefined;
  const languages = (meta.languages ?? []) as GroupLanguage[];

  const startDate = parseYmd(meta.event_start_date);
  const timeStart = meta.event_time_start;
  const timeEnd = meta.event_time_end;
  const timeRange =
    timeStart && timeEnd ? `${timeStart}–${timeEnd}` : timeStart ? timeStart : '';

  // 参加費
  const fee = post.priceAmount;
  const isFree = !fee || fee <= 0;
  const feeMain = isFree ? '無料' : `${sym}${new Intl.NumberFormat('fr-FR').format(fee)}`;

  // 残り枠（capacity と RSVP going から算出。capacity 未設定なら null）
  const capacity = meta.capacity ?? null;
  const going = rsvp.going;
  const remaining = capacity != null ? Math.max(0, capacity - going) : null;
  const fillPct = capacity != null && capacity > 0 ? Math.min(100, Math.round((going / capacity) * 100)) : 0;

  const locLabel =
    locationFormat === 'online'
      ? 'オンライン'
      : post.locationText || post.cityNameJa || null;

  const deadline = meta.application_deadline ? fmtDeadline(meta.application_deadline) : null;

  const recommendedFor = meta.recommended_for ?? [];
  const whatToBring = meta.what_to_bring ?? [];
  const schedule = meta.schedule ?? [];
  const tags = meta.tags ?? [];

  // ===== バンド: 6 枠固定（欠落はミュートのプレースホルダ） =====
  type BandItem = { ic: keyof typeof Ic; k: string; v?: string; sub?: string; ok?: boolean };

  const dateValue = startDate
    ? `${fmtEventDate(startDate)}${timeRange ? ` ${timeRange}` : ''}`
    : undefined;
  const dateSub = startDate
    ? frequency
      ? `${FREQUENCY_LABEL[frequency]}・出入り自由`
      : undefined
    : undefined;

  const placeValue =
    locationFormat === 'online'
      ? 'オンライン開催'
      : post.locationText || post.cityNameJa || undefined;
  const placeSub =
    locationFormat && locationFormat !== 'online'
      ? GROUP_LOCATION_FORMAT_LABEL[locationFormat]
      : undefined;

  // 定員 / 残り枠
  let capValue: string | undefined;
  let capSub: string | undefined;
  let capOk = false;
  if (capacity != null) {
    capValue = remaining != null && remaining > 0 ? `残り${remaining}枠` : remaining === 0 ? '満員' : undefined;
    capSub = `定員${capacity}名・${going}名参加予定`;
    capOk = remaining != null && remaining > 0;
  } else if (!rsvp.unavailable && going > 0) {
    capValue = `${going}名参加予定`;
    capOk = true;
  }

  // 対象
  const audienceParts = [
    skillLevel ? LEVEL_LABEL[skillLevel] : null,
    meta.age_range || null,
  ].filter(Boolean) as string[];

  const band: BandItem[] = [
    { ic: 'calendar', k: '開催日時', v: dateValue, sub: dateSub },
    { ic: 'mapPin', k: '場所', v: placeValue, sub: placeSub },
    {
      ic: 'fee',
      k: '参加費',
      v: isFree ? '無料' : feeMain,
      sub: meta.fee_note || (isFree ? undefined : undefined),
      ok: true,
    },
    { ic: 'users', k: '定員', v: capValue, sub: capSub, ok: capOk },
    {
      ic: 'star',
      k: '対象',
      v: audienceParts[0],
      sub: audienceParts[1],
    },
    {
      ic: 'lang',
      k: '言語',
      v: languages.length > 0 ? languages.map((l) => GROUP_LANGUAGE_LABEL[l]).join(' / ') : undefined,
    },
  ];

  // 参加費は常に値があるので空判定から除外（無料表示）。
  // 地図
  const hasGeo = post.latitude != null && post.longitude != null;
  const showMap =
    locationFormat !== 'online' &&
    (hasGeo || !!post.locationText || !!post.cityNameJa);
  const mapQuery = hasGeo
    ? `${post.latitude},${post.longitude}`
    : post.locationText || post.cityNameJa || null;
  const mapSrc =
    showMap && mapQuery
      ? `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=${hasGeo ? 15 : 13}&output=embed`
      : null;

  const hostName = post.authorName || 'Locore メンバー';
  const initial = hostName[0]?.toUpperCase() ?? 'L';

  // 参加予定アバター（実データのみ）
  const avatars = rsvp.goingAvatars;
  const avatarExtra = Math.max(0, going - avatars.length);

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('リンクをコピーしました');
      }
    } catch {
      /* キャンセル等は無視 */
    }
  };

  const toggleSaved = () => {
    setSaved((v) => !v);
    toast.success(saved ? '保存を解除しました' : '保存しました');
  };

  return (
    <div className="gr">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="gr-wrap">
        {/* breadcrumb */}
        <div className="gr-crumb">
          <Link href="/expat">コミュニティ</Link> ／ <Link href="/groups">集まり</Link>
          {locLabel ? <> ／ {locLabel}</> : null}
        </div>

        {/* ===== title ===== */}
        <div className="gr-head">
          <div className="badges">
            {closed ? (
              <span className="status closed">{post.status === 'closed' ? '締切' : '受付終了'}</span>
            ) : (
              <span className="status">
                <i />
                受付中
              </span>
            )}
            {category ? <span className="tag">{GROUP_CATEGORY_LABEL[category]}</span> : null}
            {locationFormat ? (
              <span className="tag dk">{GROUP_LOCATION_FORMAT_LABEL[locationFormat]}</span>
            ) : null}
            <span className="tag">{isFree ? '参加無料' : '有料'}</span>
            {frequency ? <span className="tag dk">{FREQUENCY_LABEL[frequency]}</span> : null}
          </div>
          <h1>{post.title}</h1>
          <div className="sub">
            <span className="org">主催：{hostName}</span>
            {locLabel ? (
              <>
                <span className="dot">·</span>
                <span className="loc">{locLabel}</span>
              </>
            ) : null}
            {startDate ? (
              <>
                <span className="dot">·</span>
                <span>次回 {fmtEventDate(startDate)}</span>
              </>
            ) : null}
            <div className="acts">
              <button type="button" onClick={handleShare}>
                {Ic.share}共有
              </button>
              <button
                type="button"
                className={saved ? 'on' : ''}
                onClick={toggleSaved}
                aria-pressed={saved}
              >
                {Ic.heart}
                {saved ? '保存済み' : '保存'}
              </button>
            </div>
          </div>
        </div>

        {/* ===== gallery (1大+4小) — 写真がある時だけ ===== */}
        {hasPhotos ? (
          <div className={`gr-gallery${galleryClass}`}>
            {photos.slice(0, 5).map((url, i) => (
              <button
                key={url + i}
                type="button"
                className={`cell${i === 0 ? ' big' : ''}`}
                onClick={() => setLightbox(true)}
                aria-label={`写真 ${i + 1} を拡大`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`${post.title} の写真 ${i + 1}`} />
              </button>
            ))}
            {photos.length > 4 ? (
              <button type="button" className="gr-allphotos" onClick={() => setLightbox(true)}>
                {Ic.grid}すべての写真（{photos.length}枚）
              </button>
            ) : null}
          </div>
        ) : null}

        {/* status banner */}
        {closed ? (
          <div className="gr-banner">
            {Ic.lock}
            <div>
              <b>{post.status === 'closed' ? 'この集まりは締切られました' : '受付期間が終了しました'}</b>
              <p>現在、新規の参加表明は受け付けていません。</p>
            </div>
          </div>
        ) : null}

        {/* owner controls */}
        {isOwner ? (
          <div className="gr-owner">
            <p>あなたが主催する集まりです。ステータスを変更できます。</p>
            <OwnerActions postId={post.id} closed={post.status === 'closed'} />
          </div>
        ) : null}

        {/* ===== key facts band (6 枠固定) ===== */}
        <div className="gr-band">
          {band.map((b, i) => {
            const empty = !b.v;
            return (
              <div className={`c${b.ok && !empty ? ' ok' : ''}${empty ? ' empty' : ''}`} key={i}>
                <span className="ic">{Ic[b.ic]}</span>
                <div>
                  <div className="k">{b.k}</div>
                  {empty ? (
                    <div className="ph">
                      <span className="bar" />
                      <small>未設定</small>
                    </div>
                  ) : (
                    <div className="v">
                      {b.v}
                      {b.sub ? <small>{b.sub}</small> : null}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ===== two-column ===== */}
        <div className="gr-cols">
          {/* LEFT */}
          <div>
            {/* この集まりについて */}
            {post.body ? (
              <div className="gr-sec">
                <h2>この集まりについて</h2>
                <div className="gr-lead" dangerouslySetInnerHTML={{ __html: post.body }} />
              </div>
            ) : null}

            {/* 当日の流れ */}
            {schedule.length > 0 ? (
              <div className="gr-sec">
                <h2>当日の流れ</h2>
                <div className="gr-steps">
                  {schedule.map((s, i) => (
                    <div className="gr-step" key={i}>
                      <div className="tm">{s.time}</div>
                      <div className="dot">
                        <i />
                      </div>
                      <div>
                        <div className="t">{s.title}</div>
                        {s.detail ? <div className="d">{s.detail}</div> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* こんな方におすすめ */}
            {recommendedFor.length > 0 ? (
              <div className="gr-sec">
                <h2>こんな方におすすめ</h2>
                <ul className="gr-checks">
                  {recommendedFor.map((r, i) => (
                    <li key={i}>
                      <span className="ck">{Ic.check}</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* 持ち物・注意 */}
            {whatToBring.length > 0 ? (
              <div className="gr-sec">
                <h2>持ち物・注意</h2>
                <ul className="gr-checks">
                  {whatToBring.map((w, i) => (
                    <li key={i}>
                      <span className="ck">{Ic.check}</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* 参加予定のメンバー（実データのみ） */}
            <div className="gr-sec">
              <h2>参加予定のメンバー</h2>
              {rsvp.unavailable || going === 0 ? (
                <div className="gr-empty">
                  まだ参加表明がありません。最初の参加者になりましょう。
                </div>
              ) : (
                <div className="gr-parts">
                  <div className="gr-ava-stack">
                    {avatars.map((a, i) =>
                      a.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={a.avatarUrl} alt={a.name ?? ''} />
                      ) : (
                        <span className="ava-f" key={i}>
                          {(a.name?.[0] ?? 'L').toUpperCase()}
                        </span>
                      ),
                    )}
                    {avatarExtra > 0 ? <span className="more">+{avatarExtra}</span> : null}
                  </div>
                  <div className="ptxt">
                    <b>{going}人が参加予定</b>
                    {rsvp.interested > 0 ? <span>興味あり {rsvp.interested}人</span> : null}
                  </div>
                </div>
              )}
            </div>

            {/* 場所 */}
            {locationFormat === 'online' ? (
              <div className="gr-sec">
                <h2>場所</h2>
                <div className="gr-online">
                  {Ic.monitor}
                  <div>
                    <b>オンライン開催</b>
                    <p>参加用のリンクは申込後にメッセージでお知らせします。</p>
                  </div>
                </div>
              </div>
            ) : mapSrc ? (
              <div className="gr-sec">
                <h2>場所</h2>
                <div className="gr-mapframe">
                  <iframe
                    title="開催エリア"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={mapSrc}
                  />
                </div>
                {post.locationText || post.cityNameJa ? (
                  <div className="gr-maploc">
                    <b>{post.locationText || post.cityNameJa}</b>
                    <p>正確な会場・住所は参加申込後にメッセージでお知らせすることがあります。</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* 主催者について */}
            <div className="gr-sec">
              <h2>主催者について</h2>
              <div className="gr-hostcard">
                {post.authorAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="ava" src={post.authorAvatarUrl} alt="" />
                ) : (
                  <div className="avaf">{initial}</div>
                )}
                <div>
                  <div className="nm">
                    {hostName}
                    {post.authorVerified ? (
                      <span className="badge">{Ic.verified}本人確認済み</span>
                    ) : null}
                  </div>
                  {post.locationText ? <div className="meta">{post.locationText}</div> : null}
                  {post.authorId ? (
                    <Link href={`/users/${post.authorId}`} className="link">
                      主催者のプロフィールを見る{Ic.chevron}
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: join card (sticky) */}
          <aside>
            <div className="gr-join">
              <div className="fee">参加費</div>
              <div className="feev">
                <b>{feeMain}</b>
                {meta.fee_note ? <span>{meta.fee_note}</span> : null}
              </div>

              {/* 日付カレンダー型 + 時間 + frequency */}
              {startDate ? (
                <div className="when">
                  <div className="cal">
                    <div className="m">{MONTH_JA[startDate.getMonth()]}</div>
                    <div className="d">{startDate.getDate()}</div>
                  </div>
                  <div className="wt">
                    <b>
                      {WEEKDAY_JA[startDate.getDay()]}曜
                      {timeRange ? ` ${timeRange}` : ''}
                    </b>
                    <span>出入り自由・途中参加OK</span>
                    {frequency ? (
                      <div className="rec">{FREQUENCY_LABEL[frequency]}に開催</div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* 残り枠バー or 参加予定数のみ */}
              {capacity != null && capacity > 0 ? (
                <div className="seats">
                  <span className="trk">
                    <i style={{ width: `${fillPct}%` }} />
                  </span>
                  <b>
                    {going}/{capacity}
                  </b>
                  {remaining != null && remaining > 0 ? (
                    <span className="left">残り{remaining}枠</span>
                  ) : (
                    <span className="left">満員</span>
                  )}
                </div>
              ) : !rsvp.unavailable && going > 0 ? (
                <div className="seatsline">
                  <b>{going}人</b>が参加予定です
                </div>
              ) : null}

              {closed ? (
                <div className="closed">この集まりは現在受付していません</div>
              ) : (
                <RsvpButtons
                  postId={post.id}
                  initialStatus={rsvp.viewerStatus}
                  viewerLoggedIn={viewerLoggedIn}
                  isOwner={isOwner}
                />
              )}

              {deadline ? (
                <div className="ddl">
                  申込締切：<b>{deadline.label}</b>
                  {deadline.soon ? '（まもなく）' : ''}
                </div>
              ) : null}

              {/* 主催者へメッセージ（既存 ApplyButton 流用） */}
              {!closed ? (
                <div className="msgwrap">
                  <ApplyButton
                    postId={post.id}
                    postTitle={post.title}
                    applyLabel="主催者にメッセージ"
                    viewerLoggedIn={viewerLoggedIn}
                    isOwnPost={isOwner}
                    closed={closed}
                    contactEmail={post.contactEmail}
                  />
                </div>
              ) : null}

              <div className="note">
                {Ic.shield}
                <span>
                  初対面の集まりです。公共の場で・無理のない範囲で。金銭の事前送金を求められたら運営に通報してください。
                </span>
              </div>
            </div>
          </aside>
        </div>

        <div className="gr-foot">
          Locore — 集まり詳細 / 参加者数は実際の参加表明（RSVP）から集計しています。
        </div>
      </div>

      {/* ===== lightbox ===== */}
      {lightbox && hasPhotos ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="写真一覧"
          onClick={() => setLightbox(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: 'rgba(15,15,12,.92)',
            overflowY: 'auto',
            padding: '48px 16px',
          }}
        >
          <button
            type="button"
            onClick={() => setLightbox(false)}
            aria-label="閉じる"
            style={{
              position: 'fixed',
              top: 16,
              right: 16,
              background: '#fff',
              border: 0,
              borderRadius: 10,
              padding: '8px 14px',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            閉じる ✕
          </button>
          <div
            style={{
              maxWidth: 880,
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {photos.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url + i}
                src={url}
                alt={`${post.title} の写真 ${i + 1}`}
                style={{ width: '100%', borderRadius: 14 }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
