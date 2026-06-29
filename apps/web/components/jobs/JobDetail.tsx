'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ApplyButton } from '@/components/community/ApplyButton';
import { OwnerActions } from '@/app/jobs/[id]/OwnerActions';
import {
  JOB_EMPLOYMENT_TYPE_LABEL,
  JOB_CONTRACT_TYPE_LABEL,
  JOB_INDUSTRY_LABEL,
  JOB_REMOTE_TYPE_LABEL,
  JOB_SALARY_KIND_LABEL,
  JOB_LANGUAGE_LEVEL_LABEL,
  JOB_LANGUAGE_LEVEL_METER,
  JOB_JAPANESE_OK_LABEL,
  JOB_BENEFITS,
  JOB_BENEFIT_LABEL,
  type JobMetadata,
  type JobEmploymentType,
  type JobContractType,
  type JobIndustry,
  type JobRemoteType,
  type JobSalaryKind,
  type JobLanguageLevel,
  type JobJapaneseOk,
} from '@/lib/community/constants';
import { CSS } from './jobDetailCss';

/**
 * /jobs/[id] — 求人詳細ページ (応募者目線・クライアント)。
 *
 * ★ CSS は jobDetailCss.ts の文字列を生 <style dangerouslySetInnerHTML> で描画。
 *   styled-jsx / :global() は SSR 初回で当たらないため使わない (.job- プレフィックス)。
 *
 * 偽データは出さない:
 *   - ★評価 / 口コミ / 満足度は一切表示しない (実データ無し)。
 *   - 応募は既存 ApplyButton (問い合わせ導線) を流用。偽の自動マッチングはしない。
 *   - 手取りは投稿者が任意入力した salary_net_note がある時だけ表示。偽の自動計算はしない。
 *
 * 後方互換: 拡張フィールドは全て任意。該当データが無いセクション/タグ/枠は描画しない。
 */

export type JobDetailData = {
  id: string;
  title: string;
  body: string; // markdown → html 済み
  status: 'active' | 'closed' | 'expired';
  photos: string[];
  locationText: string | null;
  cityNameJa: string | null;
  priceAmount: number | null;
  priceCurrency: string;
  priceUnit: string | null;
  metadata: JobMetadata;
  createdAt: string;
  expiresAt: string | null;
  contactEmail: string | null;
  authorId: string;
  authorName: string | null;
  authorAvatarUrl: string | null;
  authorVerified: boolean;
};

type Props = {
  post: JobDetailData;
  viewerLoggedIn: boolean;
  isOwner: boolean;
};

type Lang = 'ja' | 'fr' | 'en';
const LANG_LABEL: Record<Lang, string> = {
  ja: '日本語',
  fr: 'フランス語',
  en: '英語',
};

// ----- インライン SVG (lucide 互換のストロークアイコン) -----
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
  alert: (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v4h1" /></svg>
  ),
  // band icons
  salary: (
    <svg viewBox="0 0 24 24" {...stroke}><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
  ),
  briefcase: (
    <svg viewBox="0 0 24 24" {...stroke}><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
  ),
  mapPin: (
    <svg viewBox="0 0 24 24" {...stroke}><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
  ),
  lang: (
    <svg viewBox="0 0 24 24" {...stroke}><path d="M3 5h18M3 12h18M3 19h12" /></svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" {...stroke}><path d="M12 3l8 4v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7z" /><path d="M9 12l2 2 4-4" /></svg>
  ),
};

// ----- 福利厚生アイコン (JOB_BENEFITS の icon キーに対応) -----
const BenIc: Record<string, JSX.Element> = {
  shield: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><path d="M12 3l8 4v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7z" /></svg>,
  card: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18" /></svg>,
  check: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><path d="M5 12l5 5L20 7" /></svg>,
  home: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><path d="M4 11l8-7 8 7M6 10v9h12v-9" /></svg>,
  up: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><path d="M12 2v20M5 9l7-7 7 7" /></svg>,
  clock: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  book: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 12h6" /></svg>,
  pulse: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><path d="M3 12h4l3 8 4-16 3 8h4" /></svg>,
  remote: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>,
  plane: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><path d="M2 12l20-8-8 20-2.5-7.5L2 12z" /></svg>,
};

function currencySymbol(cur: string): string {
  if (cur === 'EUR') return '€';
  if (cur === 'JPY') return '¥';
  if (cur === 'USD') return '$';
  if (cur === 'GBP') return '£';
  return cur + ' ';
}

function salaryPeriodLabel(period: string | undefined): string {
  switch (period) {
    case 'annual':
      return '年収';
    case 'monthly':
      return '月給';
    case 'hourly':
      return '時給';
    default:
      return '';
  }
}

function fmtPostedRelative(d: string): string {
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const h = Math.floor(diffMs / (1000 * 60 * 60));
  if (h < 1) return 'たった今 掲載';
  if (h < 24) return `${h}時間前に掲載`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day}日前に掲載`;
  const m = Math.floor(day / 30);
  return `${m}ヶ月前に掲載`;
}

function fmtDeadline(d: string): { label: string; soon: boolean } | null {
  const date = new Date(d.length === 10 ? d + 'T00:00:00Z' : d);
  if (isNaN(date.getTime())) return null;
  const label = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return { label, soon: days >= 0 && days <= 14 };
}

export function JobDetail({ post, viewerLoggedIn, isOwner }: Props) {
  const [saved, setSaved] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  const photos = post.photos ?? [];
  const hasPhotos = photos.length > 0;
  const galleryClass =
    photos.length === 1
      ? ' one'
      : photos.length === 2
        ? ' two'
        : photos.length === 3
          ? ' three'
          : '';

  const meta: JobMetadata = post.metadata ?? ({} as JobMetadata);
  const sym = currencySymbol(post.priceCurrency);
  const closed = post.status !== 'active';

  const employmentType = meta.employment_type as JobEmploymentType | undefined;
  const contractType = meta.contract_type as JobContractType | undefined;
  const industry = meta.industry as JobIndustry | undefined;
  const remoteType = meta.remote_type as JobRemoteType | undefined;
  const salaryKind = (meta.salary_kind ?? 'gross') as JobSalaryKind;
  const japaneseOk = meta.japanese_language_ok as JobJapaneseOk | undefined;

  const period = meta.salary_period ?? post.priceUnit ?? undefined;
  const periodLabel = salaryPeriodLabel(period);

  // 給与レンジ文字列 (下限=priceAmount, 上限=salary_max)
  const min = post.priceAmount;
  const max = meta.salary_max ?? null;
  let salaryRange: string | null = null;
  let salaryUnitSuffix = '';
  if (min != null && min > 0) {
    const minStr = `${sym}${new Intl.NumberFormat('fr-FR').format(min)}`;
    if (max != null && max > min) {
      salaryRange = `${minStr}〜${sym}${new Intl.NumberFormat('fr-FR').format(max)}`;
    } else {
      salaryRange = minStr;
    }
    salaryUnitSuffix = period === 'hourly' ? '/ 時' : period === 'annual' ? '/ 年' : '/ 月';
  } else if (period === 'negotiable' || meta.salary_period === 'negotiable') {
    salaryRange = '応相談';
  }

  const companyName = meta.company_name || post.authorName || 'Locore メンバー';
  const locLabel = post.locationText || post.cityNameJa || null;
  const remoteLabel = remoteType ? JOB_REMOTE_TYPE_LABEL[remoteType] : null;

  // 語学サマリ (band 用) — language_levels 優先、無ければ language_requirements
  const langLevels = meta.language_levels ?? [];
  const langReqs = meta.language_requirements ?? [];
  let langSummaryMain: string | null = null;
  let langSummarySub: string | null = null;
  const primary = langLevels[0];
  if (primary) {
    langSummaryMain = `${LANG_LABEL[primary.lang as Lang]} ${JOB_LANGUAGE_LEVEL_LABEL[primary.level as JobLanguageLevel]}`;
    if (langLevels.length > 1) {
      const rest = langLevels
        .slice(1)
        .map((l) => `${LANG_LABEL[l.lang as Lang]} ${JOB_LANGUAGE_LEVEL_LABEL[l.level as JobLanguageLevel]}`)
        .join(' / ');
      langSummarySub = `＋${rest}`;
    }
  } else if (langReqs.length > 0) {
    langSummaryMain = langReqs.map((l) => LANG_LABEL[l as Lang]).join(' / ');
  } else if (japaneseOk) {
    langSummaryMain = JOB_JAPANESE_OK_LABEL[japaneseOk];
  }

  // ===== 条件バンド: 6 枠を固定でレンダリング =====
  // データのある枠は値を表示。無い枠はミュートのプレースホルダ・バー（「未設定」）。
  // これにより欠落枠数に関係なくグリッドが常に揃う（レイアウトが崩れない）。
  // 偽の値は入れない。
  type BandItem = {
    ic: keyof typeof Ic;
    k: string;
    v?: string;
    sub?: string;
    ok?: boolean;
  };
  const band: BandItem[] = [
    {
      ic: 'salary',
      k: '給与',
      v: salaryRange
        ? salaryRange === '応相談'
          ? '応相談'
          : `${periodLabel} ${salaryRange}`.trim()
        : undefined,
      sub:
        salaryRange && salaryRange !== '応相談'
          ? `${JOB_SALARY_KIND_LABEL[salaryKind]}・経験により決定`
          : undefined,
    },
    {
      ic: 'briefcase',
      k: '雇用形態',
      v:
        employmentType || contractType
          ? employmentType
            ? JOB_EMPLOYMENT_TYPE_LABEL[employmentType]
            : JOB_CONTRACT_TYPE_LABEL[contractType!]
          : undefined,
      sub:
        employmentType || contractType
          ? contractType
            ? employmentType
              ? JOB_CONTRACT_TYPE_LABEL[contractType]
              : meta.trial_period || undefined
            : meta.trial_period || undefined
          : undefined,
    },
    {
      ic: 'mapPin',
      k: '勤務地',
      v: locLabel ?? undefined,
      sub: locLabel
        ? remoteLabel
          ? `${remoteLabel}（リモート対応）`
          : meta.remote_ok
            ? 'リモート可'
            : undefined
        : undefined,
    },
    {
      ic: 'clock',
      k: '勤務時間',
      v: meta.hours_per_week ? `週${meta.hours_per_week}時間` : undefined,
      sub: meta.hours_per_week ? meta.overtime || undefined : undefined,
    },
    {
      ic: 'lang',
      k: '語学',
      v: langSummaryMain ?? undefined,
      sub: langSummaryMain ? langSummarySub ?? undefined : undefined,
      ok: !!langSummaryMain,
    },
    {
      ic: 'shield',
      k: '就労資格',
      v: meta.visa_sponsorship ? 'ビザサポートあり' : undefined,
      sub: meta.visa_sponsorship ? '就労ビザ・更新の手続き支援' : undefined,
      ok: !!meta.visa_sponsorship,
    },
  ];

  // ===== 勤務条件 spec (値のある項目のみ) =====
  const specRows: { k: string; v: string; icon?: JSX.Element }[] = [];
  if (employmentType)
    specRows.push({ k: '雇用形態', v: JOB_EMPLOYMENT_TYPE_LABEL[employmentType], icon: Ic.briefcase });
  if (contractType) specRows.push({ k: '契約形態', v: JOB_CONTRACT_TYPE_LABEL[contractType] });
  if (meta.trial_period) specRows.push({ k: '試用期間', v: meta.trial_period });
  if (salaryRange && salaryRange !== '応相談')
    specRows.push({ k: '給与', v: `${periodLabel} ${salaryRange}（${JOB_SALARY_KIND_LABEL[salaryKind]}）`.trim() });
  if (meta.hours_per_week)
    specRows.push({ k: '勤務時間', v: `週${meta.hours_per_week}時間`, icon: Ic.clock });
  if (meta.holidays) specRows.push({ k: '休日', v: meta.holidays });
  if (meta.overtime) specRows.push({ k: '残業', v: meta.overtime });
  if (locLabel)
    specRows.push({
      k: '勤務地',
      v: remoteLabel ? `${locLabel}（${remoteLabel}）` : locLabel,
      icon: Ic.mapPin,
    });
  if (meta.smoking_policy) specRows.push({ k: '受動喫煙対策', v: meta.smoking_policy });
  if (meta.start_date) specRows.push({ k: '入社時期', v: meta.start_date });

  // ===== 福利厚生 =====
  const benefitKeys = meta.benefits ?? [];
  const benefitItems = JOB_BENEFITS.filter((b) =>
    (benefitKeys as string[]).includes(b.key),
  );
  // 既知キーに無いものも素直に表示
  const knownKeys = new Set<string>(JOB_BENEFITS.map((b) => b.key));
  const extraBenefits = benefitKeys.filter((k) => !knownKeys.has(k));

  // ===== 会社チップ =====
  const companyChips: string[] = [];
  if (japaneseOk === 'required' || japaneseOk === 'preferred') companyChips.push('日本語OK');
  if (meta.japanese_staff) companyChips.push('日本人在籍');

  const deadline = meta.application_deadline ? fmtDeadline(meta.application_deadline) : null;

  const essentialSkills = meta.essential_skills ?? [];
  const preferredSkills = meta.preferred_skills ?? [];
  const jobDuties = meta.job_duties ?? [];
  const selectionSteps = meta.selection_steps ?? [];

  const initial = companyName[0]?.toUpperCase() ?? 'L';

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
    <div className="job">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="job-wrap">
        {/* breadcrumb */}
        <div className="job-crumb">
          <Link href="/expat">コミュニティ</Link> ／ <Link href="/jobs">求人</Link>
          {locLabel ? <> ／ {locLabel}</> : null}
        </div>

        {/* ===== title ===== */}
        <div className="job-head">
          <div className="badges">
            {closed ? (
              <span className="status closed">
                {post.status === 'closed' ? '締切' : '掲載終了'}
              </span>
            ) : (
              <span className="status">
                <i />
                募集中
              </span>
            )}
            {contractType ? <span className="tag">{JOB_CONTRACT_TYPE_LABEL[contractType]}</span> : null}
            {meta.visa_sponsorship ? <span className="tag">ビザサポートあり</span> : null}
            {meta.urgent ? <span className="urgent">急募</span> : null}
          </div>
          <h1>{post.title}</h1>
          <div className="sub">
            <span className="co">{companyName}</span>
            {locLabel ? (
              <>
                <span className="dot">·</span>
                <span className="loc">
                  {locLabel}
                  {remoteLabel ? `（${remoteLabel}可）` : ''}
                </span>
              </>
            ) : null}
            <span className="dot">·</span>
            <span className="posted">{fmtPostedRelative(post.createdAt)}</span>
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

        {/* ===== hero (ドン！) — 写真がある時だけ ===== */}
        {hasPhotos ? (
          <button
            type="button"
            className="job-hero"
            onClick={() => setLightbox(true)}
            aria-label="写真を拡大"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photos[0]} alt={`${post.title} の写真`} />
            {photos.length > 1 ? (
              <span className="job-herocount">
                {Ic.grid}
                {photos.length}枚
              </span>
            ) : null}
          </button>
        ) : null}

        {/* status banner */}
        {closed ? (
          <div className="job-banner">
            {Ic.lock}
            <div>
              <b>{post.status === 'closed' ? 'この求人は締切られました' : '掲載期限が終了しました'}</b>
              <p>現在、応募は受け付けていません。</p>
            </div>
          </div>
        ) : null}

        {/* owner controls */}
        {isOwner ? (
          <div className="job-owner">
            <p>あなたの投稿です。ステータスを変更できます。</p>
            <OwnerActions postId={post.id} closed={post.status === 'closed'} />
          </div>
        ) : null}

        {/* ===== key conditions band (6 枠固定・欠落はプレースホルダ) ===== */}
        <div className="job-band">
          {band.map((b, i) => {
            const empty = !b.v;
            return (
              <div
                className={`c${b.ok ? ' ok' : ''}${empty ? ' empty' : ''}`}
                key={i}
              >
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
        <div className="job-cols">
          {/* LEFT */}
          <div>
            {/* 仕事内容 */}
            {post.body ? (
              <div className="job-sec">
                <h2>仕事内容</h2>
                <div className="job-lead" dangerouslySetInnerHTML={{ __html: post.body }} />
              </div>
            ) : null}

            {/* 主な業務 */}
            {jobDuties.length > 0 ? (
              <div className="job-sec">
                <h2>主な業務</h2>
                <ul className="job-checks">
                  {jobDuties.map((d, i) => (
                    <li key={i}>
                      <span className="ck">{Ic.check}</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* 応募資格 (必須 / 歓迎) */}
            {essentialSkills.length > 0 || preferredSkills.length > 0 ? (
              <div className="job-sec">
                <h2>応募資格</h2>
                <div className="job-reqgrid">
                  {essentialSkills.length > 0 ? (
                    <div className="must">
                      <div className="label">必須</div>
                      <ul className="job-checks">
                        {essentialSkills.map((s, i) => (
                          <li key={i}>
                            <span className="ck">{Ic.check}</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {preferredSkills.length > 0 ? (
                    <div className="pref">
                      <div className="label">歓迎</div>
                      <ul className="job-checks">
                        {preferredSkills.map((s, i) => (
                          <li key={i}>
                            <span className="ck">{Ic.check}</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* 語学要件 */}
            {langLevels.length > 0 ? (
              <div className="job-sec">
                <h2>語学要件</h2>
                <div className="job-langs">
                  {langLevels.map((l, i) => {
                    const meterOn = JOB_LANGUAGE_LEVEL_METER[l.level as JobLanguageLevel] ?? 0;
                    return (
                      <div className="job-lang" key={i}>
                        <span className="nm">{LANG_LABEL[l.lang as Lang]}</span>
                        <div className="meter">
                          {[0, 1, 2, 3, 4].map((n) => (
                            <i key={n} className={n < meterOn ? 'on' : ''} />
                          ))}
                        </div>
                        <span className="lvl">
                          <b>{JOB_LANGUAGE_LEVEL_LABEL[l.level as JobLanguageLevel]}</b>
                          {l.required ? ' 必須' : ' あれば尚可'}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {japaneseOk ? (
                  <div className="job-langnote">
                    {Ic.info}
                    <span>{JOB_JAPANESE_OK_LABEL[japaneseOk]}。</span>
                  </div>
                ) : null}
              </div>
            ) : null}

          </div>

          {/* RIGHT: apply card (sticky) */}
          <aside>
            <div className="job-apply">
              <div className="pay">
                給与{periodLabel ? `（${periodLabel}・${JOB_SALARY_KIND_LABEL[salaryKind]}）` : ''}
              </div>
              <div className="payv">
                {salaryRange ? (
                  salaryRange === '応相談' ? (
                    <b>応相談</b>
                  ) : (
                    <>
                      <b>{salaryRange}</b>
                      <span>{salaryUnitSuffix}</span>
                    </>
                  )
                ) : (
                  <b>応相談</b>
                )}
              </div>
              {salaryKind === 'gross' && salaryRange && salaryRange !== '応相談' ? (
                <div className="gross">
                  ※ 額面（社会保険料・税の控除前）。
                  {meta.salary_net_note ? `手取り目安は ${meta.salary_net_note}。` : ''}
                </div>
              ) : meta.salary_net_note ? (
                <div className="gross">手取り目安：{meta.salary_net_note}</div>
              ) : null}

              <div className="facts">
                {employmentType ? (
                  <div className="row">
                    <span>雇用形態</span>
                    <span>{JOB_EMPLOYMENT_TYPE_LABEL[employmentType]}</span>
                  </div>
                ) : null}
                {locLabel ? (
                  <div className="row">
                    <span>勤務地</span>
                    <span>{remoteLabel ? `${locLabel} / ${remoteLabel}` : locLabel}</span>
                  </div>
                ) : null}
                <div className="row">
                  <span>就労資格</span>
                  <span>{meta.visa_sponsorship ? 'ビザサポートあり' : '要・就労可能な資格'}</span>
                </div>
                {meta.open_positions ? (
                  <div className="row">
                    <span>募集人数</span>
                    <span>{meta.open_positions}名</span>
                  </div>
                ) : null}
                {deadline ? (
                  <div className="row">
                    <span>応募締切</span>
                    <span className={deadline.soon ? 'hot' : ''}>{deadline.label}</span>
                  </div>
                ) : null}
              </div>

              {closed ? (
                <div className="closed">この求人は現在募集していません</div>
              ) : (
                <div className="ctawrap">
                  <ApplyButton
                    postId={post.id}
                    postTitle={post.title}
                    applyLabel="この求人に応募する"
                    viewerLoggedIn={viewerLoggedIn}
                    isOwnPost={isOwner}
                    closed={closed}
                    contactEmail={post.contactEmail}
                  />
                </div>
              )}

              <button
                type="button"
                className={`save${saved ? ' on' : ''}`}
                onClick={toggleSaved}
              >
                {saved ? '♥ 保存済み' : '♡ 保存する'}
              </button>

              <div className="docs">
                <b>提出書類：</b>
                履歴書（和文）または CV（仏文）。職務経歴があれば添えてください。
                応募メッセージから直接やり取りできます。
              </div>

              <div className="note">
                {Ic.alert}
                <span>
                  選考前に保証金・手数料を求める求人は詐欺です。金銭の支払いや Locore
                  外への誘導には応じないでください。
                </span>
              </div>
            </div>
          </aside>

          {/* ===== 全幅セクション（待遇以降は2カラムをまたいで中央・全幅） ===== */}
          <div className="job-below">
            {/* 待遇・福利厚生 */}
            {benefitItems.length > 0 || extraBenefits.length > 0 ? (
              <div className="job-sec">
                <h2>待遇・福利厚生</h2>
                <div className="job-ben">
                  {benefitItems.map((b) => (
                    <div key={b.key}>
                      {BenIc[b.icon] ?? BenIc.check}
                      <span>{b.label}</span>
                    </div>
                  ))}
                  {extraBenefits.map((k) => (
                    <div key={k}>
                      {BenIc.check}
                      <span>{JOB_BENEFIT_LABEL[k] ?? k}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* 勤務条件 */}
            {specRows.length > 0 ? (
              <div className="job-sec">
                <h2>勤務条件</h2>
                <div className="job-spec">
                  {specRows.map((r, i) => (
                    <div key={i}>
                      <div className="k">
                        {r.icon ? r.icon : null}
                        {r.k}
                      </div>
                      <div className="v">{r.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* 選考の流れ */}
            {selectionSteps.length > 0 ? (
              <div className="job-sec">
                <h2>選考の流れ</h2>
                <div className="job-steps">
                  {selectionSteps.map((s, i) => (
                    <div className="job-step" key={i}>
                      <span className="n">{i + 1}</span>
                      <div>
                        <div className="t">{s.title}</div>
                        {s.detail ? <div className="d">{s.detail}</div> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* 仕事の様子 (ギャラリー) — 会社概要の直前。写真0枚なら非表示 */}
            {hasPhotos ? (
              <div className="job-sec">
                <h2>仕事の様子</h2>
                <div className={`job-gallery${galleryClass}`}>
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
                    <button
                      type="button"
                      className="job-allphotos"
                      onClick={() => setLightbox(true)}
                    >
                      {Ic.grid}すべての写真を表示（{photos.length}枚）
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* 募集している会社について */}
            <div className="job-sec">
              <h2>募集している会社について</h2>
              <div className="job-cocard">
                {post.authorAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="lg" src={post.authorAvatarUrl} alt="" />
                ) : (
                  <div className="lgf">{initial}</div>
                )}
                <div>
                  <div className="nm">
                    {companyName}
                    {post.authorVerified ? (
                      <span className="badge">
                        {Ic.verified}本人確認済み
                      </span>
                    ) : null}
                  </div>
                  {(industry || meta.company_size || meta.company_founded) ? (
                    <div className="meta">
                      {[
                        industry ? JOB_INDUSTRY_LABEL[industry] : null,
                        meta.company_size || null,
                        meta.company_founded ? `設立 ${meta.company_founded}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  ) : null}
                  {companyChips.length > 0 ? (
                    <div className="chips">
                      {companyChips.map((c) => (
                        <span key={c}>{c}</span>
                      ))}
                    </div>
                  ) : null}
                  {meta.notes ? <div className="bio">{meta.notes}</div> : null}
                  {post.authorId ? (
                    <Link href={`/users/${post.authorId}`} className="link">
                      投稿者のプロフィールを見る{Ic.chevron}
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* fraud notice */}
        <div className="job-fraud">
          <div className="ft">
            {Ic.alert}
            応募の前に — 注意したいポイント
          </div>
          <ul>
            <li>
              保証金・登録料の前払い要求：選考の前後を問わず、応募者に金銭を求める正規の求人はありません。
            </li>
            <li>
              Locore 外への誘導：個人メール・SNS への急な誘導や、外部サイトでの個人情報入力には応じないでください。
            </li>
            <li>
              条件が良すぎる求人：相場とかけ離れた高待遇・在宅高収入をうたう案件は慎重に確認を。
            </li>
          </ul>
          <p style={{ marginTop: 8, fontSize: 13 }}>
            不審な点があれば <Link href="/contact" style={{ textDecoration: 'underline' }}>運営に通報</Link>{' '}
            してください。
          </p>
        </div>
      </div>

      {/* ===== lightbox (ヒーロー・ギャラリー共有) ===== */}
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
