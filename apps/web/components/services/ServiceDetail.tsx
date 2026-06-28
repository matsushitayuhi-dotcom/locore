'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ServiceInquiryButton } from '@/components/services/ServiceInquiryButton';
import type { FeaturedService } from '@/lib/services/featured';
import type { ServiceProvider } from '@/lib/services/byId';
import { TAG_LABEL } from '@/lib/services/tagLabels';
import { CSS } from './serviceDetailCss';

/**
 * /services/[id] — Airbnb 風 体験詳細ページ (クライアント)。
 *
 * ★ CSS は serviceDetailCss.ts の文字列を生 <style dangerouslySetInnerHTML> で描画。
 *   styled-jsx / :global() は SSR 初回で当たらないため使わない (.sd- プレフィックス)。
 *
 * 偽データは出さない:
 *   - ★評価 / レビュー件数 / 満足度バーは一切表示しない (実データ無し)。
 *   - レビューセクションは当面非表示 (将来テーブル追加時にここへ差し込む)。
 *   - 日付/人数セレクタ・予約確定・価格内訳は偽予約になるため作らない。
 *     右カラムは「価格 + 連絡 CTA + 注記」のみ。
 */

type Props = {
  service: FeaturedService;
  provider: ServiceProvider;
  viewerUserId: string | null;
};

// ----- インライン SVG (lucide 互換のストロークアイコン) -----
const Ic = {
  back: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
  ),
  share: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
  ),
  heart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7.5-4.7-10-9.3C.6 8.9 2 5.5 5.2 5.5c2 0 3.3 1.2 3.8 2.3C9.5 6.7 10.8 5.5 12.8 5.5 16 5.5 17.4 8.9 16 11.7 13.5 16.3 12 21 12 21z" /></svg>
  ),
  grid: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
  ),
  image: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.5-3.5L9 20" /></svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2" /><path d="M3 19a6 6 0 0 1 12 0" /><path d="M16 6a3 3 0 0 1 0 6M21 19a5 5 0 0 0-4-4.9" /></svg>
  ),
  globe: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" /></svg>
  ),
  briefcase: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
  ),
  pin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
  ),
  checkThin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
  ),
  verified: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /><path d="M9 12l2 2 4-4" /></svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" /></svg>
  ),
  pen: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
  ),
  arrow: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
  ),
};

function priceLabel(priceJpy: number | null, priceUnit: string | null) {
  if (priceJpy == null) return { kind: 'tbd' as const };
  if (priceJpy === 0) return { kind: 'free' as const };
  return {
    kind: 'yen' as const,
    text: `¥${priceJpy.toLocaleString('ja-JP')}`,
    unit: priceUnit,
  };
}

export function ServiceDetail({ service: s, provider, viewerUserId }: Props) {
  const [saved, setSaved] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  // cover を先頭に、gallery_images を連結。重複は除去。
  const photos = [s.coverImageUrl, ...(s.galleryImages ?? [])].filter(
    (u): u is string => !!u,
  );
  const uniquePhotos = Array.from(new Set(photos));
  const hasPhotos = uniquePhotos.length > 0;

  const tagList =
    s.tags && s.tags.length > 0 ? s.tags : s.category ? [s.category] : [];

  const yearsLabel =
    provider.residencyYears != null && provider.residencyYears > 0
      ? `在住${provider.residencyYears}年`
      : null;

  const participantsLabel = (() => {
    const { minParticipants: mn, maxParticipants: mx } = s;
    if (mn != null && mx != null)
      return mn === mx ? `${mn}名` : `${mn}〜${mx}名`;
    if (mx != null) return `最大${mx}名`;
    if (mn != null) return `${mn}名〜`;
    return null;
  })();

  const languagesLabel =
    s.languages && s.languages.length > 0 ? s.languages.join(' / ') : null;
  const categoryLabel = tagList[0] ? (TAG_LABEL[tagList[0]] ?? tagList[0]) : null;

  const facts: { ic: keyof typeof Ic; b: string; s?: string }[] = [];
  if (s.durationLabel)
    facts.push({ ic: 'clock', b: `所要 ${s.durationLabel}` });
  if (participantsLabel) facts.push({ ic: 'users', b: participantsLabel });
  if (languagesLabel) facts.push({ ic: 'globe', b: languagesLabel });
  if (categoryLabel) facts.push({ ic: 'briefcase', b: categoryLabel });

  const price = priceLabel(s.priceJpy, s.priceUnit);

  // 集合場所マップ (キーレス Google Maps embed)。座標 > 都市名 の順。
  const mapQuery =
    s.meetingPointLat != null && s.meetingPointLng != null
      ? `${s.meetingPointLat},${s.meetingPointLng}`
      : s.meetingPointName
        ? s.meetingPointName
        : s.cityNameJa
          ? s.cityNameJa
          : null;
  const mapSrc = mapQuery
    ? `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=14&output=embed`
    : null;

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) {
        await navigator.share({ title: s.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('リンクをコピーしました');
      }
    } catch {
      /* ユーザーキャンセル等は無視 */
    }
  };

  const initial = provider.displayName?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="sd">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="sd-wrap">
        <Link href="/services" className="sd-back">
          {Ic.back}
          サービス一覧に戻る
        </Link>

        {/* ===== title ===== */}
        <div className="sd-head">
          <h1>{s.title}</h1>
          <div className="sd-sub">
            {s.cityNameJa ? <span className="sd-loc">{s.cityNameJa}</span> : null}
            {tagList.map((t) => (
              <span key={t} className="sd-tag">
                {TAG_LABEL[t] ?? t}
              </span>
            ))}
            <div className="sd-acts">
              <button type="button" onClick={handleShare}>
                {Ic.share}
                共有
              </button>
              <button
                type="button"
                className={saved ? 'on' : ''}
                onClick={() => {
                  setSaved((v) => !v);
                  toast.success(saved ? '保存を解除しました' : '保存しました');
                }}
                aria-pressed={saved}
              >
                {Ic.heart}
                {saved ? '保存済み' : '保存'}
              </button>
            </div>
          </div>
        </div>

        {/* ===== gallery ===== */}
        {hasPhotos ? (
          <div className={`sd-gallery${uniquePhotos.length === 1 ? ' one' : ''}`}>
            {uniquePhotos.slice(0, 5).map((url, i) => (
              <button
                key={url}
                type="button"
                className={`cell${i === 0 ? ' big' : ''}`}
                onClick={() => setLightbox(true)}
                aria-label={`写真 ${i + 1} を拡大`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`${s.title} の写真 ${i + 1}`} />
              </button>
            ))}
            {uniquePhotos.length > 1 ? (
              <button
                type="button"
                className="sd-allphotos"
                onClick={() => setLightbox(true)}
              >
                {Ic.grid}
                すべての写真（{uniquePhotos.length}枚）
              </button>
            ) : null}
          </div>
        ) : (
          <div className="sd-gallery one">
            <div className="cell big">
              <div className="sd-ph">{Ic.image}</div>
            </div>
          </div>
        )}

        {/* ===== two-column ===== */}
        <div className="sd-cols">
          {/* LEFT */}
          <div className="sd-main">
            {/* host row */}
            <div className="sd-hostrow">
              {provider.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="ava" src={provider.avatarUrl} alt="" />
              ) : (
                <div className="avaf">{initial}</div>
              )}
              <div>
                <div className="t">
                  {provider.displayName} が案内
                  {yearsLabel ? <span className="yrs">{yearsLabel}</span> : null}
                  {provider.isVerified ? (
                    <span className="sd-vbadge">
                      {Ic.verified}本人確認済み
                    </span>
                  ) : null}
                </div>
                {(s.durationLabel || languagesLabel || participantsLabel) ? (
                  <div className="s">
                    {[
                      s.durationLabel ? `所要 ${s.durationLabel}` : null,
                      languagesLabel,
                      participantsLabel,
                    ]
                      .filter(Boolean)
                      .join(' ・ ')}
                  </div>
                ) : null}
              </div>
            </div>

            {/* quick facts */}
            {facts.length > 0 ? (
              <div className="sd-sec">
                <div className="sd-facts">
                  {facts.map((f, i) => (
                    <div className="sd-fact" key={i}>
                      <span className="ic">{Ic[f.ic]}</span>
                      <div>
                        <b>{f.b}</b>
                        {f.s ? <span>{f.s}</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* この体験について */}
            {s.description ? (
              <div className="sd-sec">
                <h2>この体験について</h2>
                <div className="sd-lead">{s.description}</div>
              </div>
            ) : null}

            {/* 特徴 */}
            {s.highlights && s.highlights.length > 0 ? (
              <div className="sd-sec">
                <h2>この体験の特徴</h2>
                <ul className="sd-hl">
                  {s.highlights.map((h, i) => (
                    <li key={i}>
                      <span className="ck">{Ic.check}</span>
                      <div>
                        <b>{h}</b>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* 含まれるもの */}
            {s.inclusions && s.inclusions.length > 0 ? (
              <div className="sd-sec">
                <h2>含まれるもの</h2>
                <div className="sd-inc">
                  {s.inclusions.map((inc, i) => (
                    <div key={i}>
                      {Ic.checkThin}
                      {inc}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* ホスト紹介 */}
            <div className="sd-sec">
              <h2>ホスト紹介</h2>
              <div className="sd-hostcard">
                {provider.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="ava" src={provider.avatarUrl} alt="" />
                ) : (
                  <div className="avaf">{initial}</div>
                )}
                <div>
                  <div>
                    <span className="nm">{provider.displayName}</span>
                    {provider.isVerified ? (
                      <span className="sd-vbadge" style={{ marginLeft: 8 }}>
                        {Ic.verified}本人確認済み
                      </span>
                    ) : null}
                  </div>
                  <div className="meta">
                    {[
                      s.cityNameJa ? `${s.cityNameJa}在住` : null,
                      yearsLabel,
                      provider.tier ? `Tier ${provider.tier}` : null,
                    ]
                      .filter(Boolean)
                      .join(' ・ ')}
                  </div>
                  {provider.bio ? <p className="bio">{provider.bio}</p> : null}
                  <Link href={`/users/${provider.id}`} className="link">
                    プロフィールを見る {Ic.arrow}
                  </Link>
                </div>
              </div>
            </div>

            {/* 集合場所 */}
            {mapSrc ? (
              <div className="sd-sec">
                <h2>集合場所</h2>
                {s.meetingPointName ? (
                  <p className="sd-lead" style={{ marginBottom: 16 }}>
                    {s.meetingPointName}
                  </p>
                ) : null}
                <div className="sd-mapframe">
                  <iframe
                    title="集合場所"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={mapSrc}
                  />
                </div>
              </div>
            ) : null}

            {/*
              レビューセクションは当面非表示。
              サービス専用レビューテーブルが追加されたら、ここに
              <div className="sd-sec"><h2>レビュー</h2>…</div> を差し込む。
              ★評価・件数・満足度バーは実データが無いため出さない。
            */}
          </div>

          {/* RIGHT: contact card (sticky) */}
          <aside>
            <div className="sd-book">
              <div className="price">
                {price.kind === 'yen' ? (
                  <>
                    <b>{price.text}</b>
                    {price.unit ? <span>/ {price.unit}</span> : null}
                  </>
                ) : price.kind === 'free' ? (
                  <b className="free">無料</b>
                ) : (
                  <b className="free">応相談</b>
                )}
              </div>

              <div className="ctawrap">
                <ServiceInquiryButton
                  serviceId={s.id}
                  serviceTitle={s.title}
                  ownerId={provider.id}
                  ownerName={provider.displayName}
                  viewerUserId={viewerUserId}
                  contactMethod={s.contactMethod}
                  externalUrl={s.externalUrl}
                  variant="footer"
                />
              </div>
              <div className="note">
                {s.contactMethod === 'external_url'
                  ? '外部サイトで詳細・申込ができます'
                  : 'いますぐ予約は確定しません'}
              </div>

              {/* クイックファクト要約 (データのある項目のみ) */}
              {(s.durationLabel ||
                participantsLabel ||
                languagesLabel) ? (
                <div className="qf">
                  {s.durationLabel ? (
                    <div>
                      <span>所要時間</span>
                      <b>{s.durationLabel}</b>
                    </div>
                  ) : null}
                  {participantsLabel ? (
                    <div>
                      <span>人数</span>
                      <b>{participantsLabel}</b>
                    </div>
                  ) : null}
                  {languagesLabel ? (
                    <div>
                      <span>言語</span>
                      <b>{languagesLabel}</b>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="safe">
                {Ic.shield}
                <span>
                  {provider.isVerified ? '本人確認済みホスト。' : ''}
                  {s.cancellationPolicy
                    ? s.cancellationPolicy
                    : '予約・決済は双方の合意のうえチャットで進めます。'}
                </span>
              </div>
            </div>
          </aside>
        </div>

        {/* ===== この駐在員の記事 / 他サービス (現行を維持) ===== */}
        {provider.articles.length > 0 ? (
          <div className="sd-other">
            <h3>
              {Ic.pen}
              {provider.displayName} さんの記事
            </h3>
            <div className="sd-scroll">
              {provider.articles.map((a) => (
                <Link key={a.id} href={`/articles/${a.id}`} className="sd-acard">
                  <div className="th">
                    {a.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.coverImageUrl} alt="" loading="lazy" />
                    ) : null}
                  </div>
                  <div className="body">
                    <p>{a.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {provider.otherServices.length > 0 ? (
          <div className="sd-other">
            <h3>
              {Ic.briefcase}
              {provider.displayName} さんの他のサービス
            </h3>
            <div className="sd-scroll">
              {provider.otherServices.map((os) => (
                <Link key={os.id} href={`/services/${os.id}`} className="sd-acard">
                  <div className="th">
                    {os.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={os.coverImageUrl} alt="" loading="lazy" />
                    ) : (
                      <div className="sd-ph">{Ic.image}</div>
                    )}
                  </div>
                  <div className="body">
                    <p>{os.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
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
            {uniquePhotos.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt={`${s.title} の写真 ${i + 1}`}
                style={{ width: '100%', borderRadius: 14 }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
