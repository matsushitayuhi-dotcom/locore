'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@locore/ui';
import { ArrowLeft, ArrowRight, Camera, FileText, Send } from 'lucide-react';
import { ModerationBanner } from '@/components/writer/ModerationBanner';
import {
  autoSaveArticle,
  saveDraftArticle,
} from '@/app/writer/articles/[id]/edit/actions';
import { runMockModeration } from '@/lib/moderation/mock';
import { BasicInfoSection, type BasicInfoValue } from './BasicInfoSection';
import { CoverImageSection } from './CoverImageSection';
import { TitleBodySection } from './TitleBodySection';
import {
  ItineraryBlocksEditor,
  type ItineraryBlock,
} from './ItineraryBlocksEditor';
import { PhotoJournalSection } from './PhotoJournalSection';
import { SpotsSection } from './SpotsSection';
import { VideosSection } from './VideosSection';
import type { PhotoEntry } from '@/lib/mock/types';
import type { SpotRow } from '@/components/writer/SpotList';
import type { VideoRow } from '@/components/writer/VideoEmbedEditor';

/**
 * 記事編集のステップ式ウィザード。
 *
 * Step 1: タイトル + 本文（インスタ / クラシックの 2 エディタをタブ切替）+ メタ情報
 * Step 2: スポット一覧の確認・追加・並び替え
 * Step 3: 旅程プランのとき限定 — スポット間の移動時間
 * Step 4: カバー画像 + 動画 + 確認 → 公開
 *
 * インスタスタイル (photo_journal) が新規記事のデフォルト。
 * 既存記事の bodyStyle が 'classic' ならクラシック側をデフォルト表示。
 */

type ArticleInitial = {
  id: string;
  title: string;
  body: string;
  bodyPaid: string | null;
  itineraryBlocks: ItineraryBlock[] | null;
  photoEntries: PhotoEntry[] | null;
  priceJpy: number;
  durationType: 'half_day' | 'full_day' | 'few_hours' | 'other' | null;
  articleType: 'spot_guide' | 'itinerary' | 'expat_info';
  bodyStyle: 'photo_journal' | 'classic';
  tags: string[];
  cityId: string;
  coverImageUrl: string | null;
  status: 'draft' | 'published' | 'archived' | 'pending_review';
  warned: boolean;
  moderationScore: number | null;
  updatedAt: Date;
};

type Props = {
  article: ArticleInitial;
  spots: SpotRow[];
  videos: VideoRow[];
  cities: { id: string; nameJa: string }[];
  tier: 'S' | 'A' | 'B';
  googleMapsApiKey?: string;
};

type Step = 1 | 2 | 3 | 4;

export function WizardShell({
  article,
  spots,
  videos,
  cities,
  tier,
  googleMapsApiKey,
}: Props) {
  const [step, setStep] = useState<Step>(1);

  // 共通 state（既存 EditorShell と同じ）
  const [title, setTitle] = useState(article.title);
  const [body, setBody] = useState(article.body);
  const [bodyPaid, setBodyPaid] = useState(article.bodyPaid ?? '');
  const [bodyStyle, setBodyStyle] = useState<'photo_journal' | 'classic'>(
    article.bodyStyle ?? 'photo_journal',
  );
  const [basic, setBasic] = useState<BasicInfoValue>({
    priceJpy: article.priceJpy,
    durationType: article.durationType ?? '',
    articleType: article.articleType,
    tagsText: (article.tags ?? []).join(', '),
    cityId: article.cityId,
  });
  const [coverImageUrl, setCoverImageUrl] = useState(article.coverImageUrl ?? '');
  const [itineraryBlocks, setItineraryBlocks] = useState<ItineraryBlock[]>(
    article.itineraryBlocks ?? [],
  );
  const [photoEntries, setPhotoEntries] = useState<PhotoEntry[]>(
    article.photoEntries ?? [],
  );
  const [spotsForDropdown, setSpotsForDropdown] = useState<SpotRow[]>(spots);

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  );
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const tags = useMemo(
    () =>
      basic.tagsText
        .split(/[,、\n]/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
    [basic.tagsText],
  );

  const isItinerary = basic.articleType === 'itinerary';
  const totalSteps: 3 | 4 = isItinerary ? 4 : 3;
  // itinerary 以外のときは step=3 を飛ばして step=4 を「Step 3 = 公開」として扱う
  const visibleStepIndex = step >= 3 && !isItinerary ? step - 1 : step;

  // 自動保存
  useEffect(() => {
    if (!title.trim()) {
      setSaveState('idle');
      return;
    }
    setSaveState('saving');
    const handle = setTimeout(async () => {
      const res = await autoSaveArticle({
        id: article.id,
        title: title || undefined,
        body,
        bodyPaid,
        bodyStyle,
        itineraryBlocks: isItinerary ? itineraryBlocks : null,
        photoEntries: bodyStyle === 'photo_journal' ? photoEntries : [],
        priceJpy: basic.priceJpy,
        durationType: basic.durationType || undefined,
        articleType: basic.articleType,
        tags,
        coverImageUrl: coverImageUrl || '',
        cityId: basic.cityId,
      });
      if (res.ok) {
        setSaveState('saved');
        setLastSavedAt(new Date());
      } else {
        setSaveState('error');
        toast.error(res.error);
      }
    }, 3000);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    title,
    basic,
    body,
    bodyPaid,
    bodyStyle,
    coverImageUrl,
    tags,
    itineraryBlocks,
    photoEntries,
  ]);

  // 明示的「下書きを保存」
  const [isSavingDraft, startSavingDraft] = useTransition();
  const handleSaveDraft = () => {
    if (!title.trim()) {
      toast.error('タイトルを入力すると保存できます');
      return;
    }
    setSaveState('saving');
    startSavingDraft(async () => {
      const res = await saveDraftArticle({
        id: article.id,
        title,
        body,
        bodyPaid,
        bodyStyle,
        itineraryBlocks: isItinerary ? itineraryBlocks : null,
        photoEntries: bodyStyle === 'photo_journal' ? photoEntries : [],
        priceJpy: basic.priceJpy,
        durationType: basic.durationType || undefined,
        articleType: basic.articleType,
        tags,
        coverImageUrl: coverImageUrl || '',
        cityId: basic.cityId,
      });
      if (res.ok) {
        setSaveState('saved');
        setLastSavedAt(new Date());
        toast.success('保存しました');
      } else {
        setSaveState('error');
        toast.error(res.error);
      }
    });
  };

  // モデレーション（簡易）
  const [modScore, setModScore] = useState<{
    finalScore: number;
    action: string;
  } | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      const r = runMockModeration({
        title,
        body: body + (bodyPaid ? '\n' + bodyPaid : ''),
        tags,
      });
      setModScore({ finalScore: r.finalScore, action: r.action });
    }, 800);
    return () => clearTimeout(t);
  }, [title, body, bodyPaid]);

  // 公開条件チェック
  const totalBodyLength = body.trim().length + bodyPaid.trim().length;
  const photoEntriesValid =
    bodyStyle !== 'photo_journal' ||
    photoEntries.filter((e) => e.imageUrl).length >= 1;

  const missing: string[] = [];
  if (!title.trim()) missing.push('タイトル');
  if (bodyStyle === 'classic' && totalBodyLength < 100)
    missing.push('本文 100 字以上');
  if (bodyStyle === 'photo_journal' && !photoEntriesValid)
    missing.push('写真 1 枚以上');
  if (spotsForDropdown.length === 0) missing.push('スポット 1 件以上');
  if (!coverImageUrl.trim()) missing.push('カバー画像');
  if (isItinerary && itineraryBlocks.length < 2) missing.push('旅程ブロック 2 件以上');

  // ナビゲーション
  const goNext = () => {
    // step 1 → 2: ボディ入力チェック
    if (step === 1) {
      if (!title.trim()) {
        toast.error('タイトルを入力してください');
        return;
      }
      if (bodyStyle === 'classic' && totalBodyLength < 20) {
        toast.error('本文を 20 文字以上書いてください');
        return;
      }
      if (bodyStyle === 'photo_journal' && photoEntries.length === 0) {
        toast.error('写真を 1 枚以上追加してください');
        return;
      }
    }
    // step 2 → 3: スポットチェック
    if (step === 2 && spotsForDropdown.length === 0) {
      toast.error('スポットを 1 件以上登録してください');
      return;
    }
    // step 3 → 4: 旅程ブロックチェック
    if (step === 3 && isItinerary && itineraryBlocks.length < 2) {
      toast.error('旅程ブロックを 2 件以上追加してください');
      return;
    }

    // itinerary 以外は step=3 を飛ばす
    if (step === 2 && !isItinerary) {
      setStep(4);
    } else if (step < 4) {
      setStep((step + 1) as Step);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const goPrev = () => {
    if (step === 4 && !isItinerary) {
      setStep(2);
    } else if (step > 1) {
      setStep((step - 1) as Step);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      <Header
        title={title || '新しい記事'}
        saveState={saveState}
        lastSavedAt={lastSavedAt}
        articleId={article.id}
        onSaveDraft={handleSaveDraft}
        isSavingDraft={isSavingDraft}
      />

      <ModerationBanner
        finalScore={article.moderationScore}
        warned={article.warned}
        status={article.status}
      />

      <StepProgress current={visibleStepIndex} total={totalSteps} />

      {/* ステップ別本体 */}
      {step === 1 ? (
        <Step1TitleBody
          title={title}
          onChangeTitle={setTitle}
          bodyStyle={bodyStyle}
          onChangeBodyStyle={setBodyStyle}
          body={body}
          bodyPaid={bodyPaid}
          onChangeBody={setBody}
          onChangeBodyPaid={setBodyPaid}
          photoEntries={photoEntries}
          onChangePhotoEntries={setPhotoEntries}
          basic={basic}
          onChangeBasic={setBasic}
          cities={cities}
          tier={tier}
        />
      ) : null}

      {step === 2 ? (
        <Step2Spots
          articleId={article.id}
          initial={spots}
          googleMapsApiKey={googleMapsApiKey}
          onChange={setSpotsForDropdown}
          photoEntries={bodyStyle === 'photo_journal' ? photoEntries : []}
        />
      ) : null}

      {step === 3 && isItinerary ? (
        <Step3Itinerary
          blocks={itineraryBlocks}
          onChange={setItineraryBlocks}
          spots={spotsForDropdown}
          googleMapsApiKey={googleMapsApiKey}
        />
      ) : null}

      {step === 4 ? (
        <Step4Publish
          coverImageUrl={coverImageUrl}
          onChangeCover={setCoverImageUrl}
          articleId={article.id}
          videos={videos}
          isPublished={article.status === 'published'}
          missing={missing}
          modScore={modScore}
        />
      ) : null}

      {/* ナビゲーションフッタ */}
      <nav
        aria-label="ウィザードナビゲーション"
        className="sticky bottom-4 z-20 flex items-center justify-between rounded-2xl bg-card/95 p-3 shadow-xl ring-1 ring-border backdrop-blur"
      >
        <Button
          type="button"
          variant="outline"
          onClick={goPrev}
          disabled={step === 1}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          戻る
        </Button>

        <p className="text-[11px] text-foreground/55">
          ステップ {visibleStepIndex} / {totalSteps}
        </p>

        {step === 4 ? (
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              if (missing.length > 0) {
                toast.error(`未入力: ${missing.join(' / ')}`);
                return;
              }
              // TODO: 実際の publish action へ。今は保存だけ。
              handleSaveDraft();
              toast.info(
                '公開アクションは別 PR で追加します。今は下書き保存にとどめています。',
              );
            }}
          >
            <Send className="mr-1 h-4 w-4" />
            投稿する
          </Button>
        ) : (
          <Button type="button" variant="primary" onClick={goNext}>
            次へ
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </nav>
    </div>
  );
}

// =============================================================================
// ヘッダ
// =============================================================================
function Header({
  title,
  saveState,
  lastSavedAt,
  articleId,
  onSaveDraft,
  isSavingDraft,
}: {
  title: string;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt: Date | null;
  articleId: string;
  onSaveDraft: () => void;
  isSavingDraft: boolean;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
          記事を編集
        </p>
        <h1
          className="mt-1 line-clamp-1 text-[20px] font-bold tracking-tight"
          style={{
            fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
          }}
        >
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-foreground/55">
          {saveState === 'saving'
            ? '自動保存中…'
            : saveState === 'saved'
              ? `保存済 ${lastSavedAt ? formatTime(lastSavedAt) : ''}`
              : saveState === 'error'
                ? '保存エラー'
                : ''}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onSaveDraft}
          disabled={isSavingDraft}
        >
          {isSavingDraft ? '保存中…' : '下書きを保存'}
        </Button>
        <Link
          href={`/writer/articles/${articleId}/preview`}
          target="_blank"
          className="text-[11px] text-primary-300 underline-offset-4 hover:underline"
        >
          プレビュー →
        </Link>
      </div>
    </header>
  );
}

function formatTime(d: Date) {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// =============================================================================
// ステップインジケータ
// =============================================================================
function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <ol className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em]">
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
        const on = n === current;
        const done = n < current;
        return (
          <li key={n} className="flex items-center gap-2">
            <span
              className={
                'inline-flex h-7 w-7 items-center justify-center rounded-full ring-1 ' +
                (on
                  ? 'bg-primary-500 text-neutral-950 ring-primary-500'
                  : done
                    ? 'bg-primary-500/15 text-primary-300 ring-primary-300/40'
                    : 'bg-card text-foreground/45 ring-border')
              }
            >
              {n}
            </span>
            {n < total ? (
              <span
                className={
                  'h-[2px] w-8 ' + (done ? 'bg-primary-300/60' : 'bg-border')
                }
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

// =============================================================================
// Step 1: タイトル + 本文（タブ切替）+ メタ情報
// =============================================================================
function Step1TitleBody({
  title,
  onChangeTitle,
  bodyStyle,
  onChangeBodyStyle,
  body,
  bodyPaid,
  onChangeBody,
  onChangeBodyPaid,
  photoEntries,
  onChangePhotoEntries,
  basic,
  onChangeBasic,
  cities,
  tier,
}: {
  title: string;
  onChangeTitle: (v: string) => void;
  bodyStyle: 'photo_journal' | 'classic';
  onChangeBodyStyle: (v: 'photo_journal' | 'classic') => void;
  body: string;
  bodyPaid: string;
  onChangeBody: (v: string) => void;
  onChangeBodyPaid: (v: string) => void;
  photoEntries: PhotoEntry[];
  onChangePhotoEntries: (v: PhotoEntry[]) => void;
  basic: BasicInfoValue;
  onChangeBasic: (v: BasicInfoValue) => void;
  cities: { id: string; nameJa: string }[];
  tier: 'S' | 'A' | 'B';
}) {
  return (
    <div className="space-y-6">
      {/* タイトル + エディタタブ + 本文 */}
      <section className="space-y-4 rounded-md bg-card p-5 ring-1 ring-border sm:p-6">
        <div>
          <label
            htmlFor="wz-title"
            className="mb-1 block text-[12px] font-bold uppercase tracking-[0.14em] text-foreground/55"
          >
            タイトル <span className="text-danger-500">*</span>
          </label>
          <input
            id="wz-title"
            type="text"
            value={title}
            onChange={(e) => onChangeTitle(e.target.value)}
            maxLength={200}
            placeholder="記事のタイトル"
            className="h-11 w-full rounded-md border border-border bg-background px-3 text-[16px] font-bold focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
          />
        </div>

        {/* エディタタブ */}
        <div role="tablist" aria-label="エディタの種類" className="flex gap-1">
          <TabButton
            active={bodyStyle === 'photo_journal'}
            onClick={() => onChangeBodyStyle('photo_journal')}
            icon={Camera}
            label="インスタスタイル"
            sub="写真 + 場所 + キャプション（推奨）"
          />
          <TabButton
            active={bodyStyle === 'classic'}
            onClick={() => onChangeBodyStyle('classic')}
            icon={FileText}
            label="クラシック"
            sub="従来のブログ風テキスト本文"
          />
        </div>

        {/* 選んだエディタを描画 */}
        {bodyStyle === 'photo_journal' ? (
          <PhotoJournalSection
            value={photoEntries}
            onChange={onChangePhotoEntries}
          />
        ) : (
          <TitleBodySection
            title={title}
            bodyFree={body}
            bodyPaid={bodyPaid}
            onChangeTitle={onChangeTitle}
            onChangeBodyFree={onChangeBody}
            onChangeBodyPaid={onChangeBodyPaid}
          />
        )}
      </section>

      {/* メタ情報 */}
      <BasicInfoSection
        value={basic}
        onChange={onChangeBasic}
        cities={cities}
        tier={tier}
      />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        'flex flex-1 items-start gap-2 rounded-md border px-3 py-2.5 text-left text-[12px] transition ' +
        (active
          ? 'border-primary-500 bg-primary-500/10'
          : 'border-border bg-background hover:border-foreground/30')
      }
    >
      <Icon
        className={
          'mt-0.5 h-4 w-4 shrink-0 ' +
          (active ? 'text-primary-500' : 'text-foreground/55')
        }
      />
      <span>
        <span
          className={
            'block text-[13px] font-bold ' +
            (active ? 'text-foreground' : 'text-foreground/80')
          }
        >
          {label}
        </span>
        <span className="block text-[10px] leading-relaxed text-foreground/55">
          {sub}
        </span>
      </span>
    </button>
  );
}

// =============================================================================
// Step 2: スポット一覧の確認
// =============================================================================
function Step2Spots({
  articleId,
  initial,
  googleMapsApiKey,
  onChange,
  photoEntries,
}: {
  articleId: string;
  initial: SpotRow[];
  googleMapsApiKey?: string;
  onChange: (next: SpotRow[]) => void;
  photoEntries: PhotoEntry[];
}) {
  const hinted = photoEntries
    .map((e) => e.locationName)
    .filter((s): s is string => !!s)
    .filter((s, i, arr) => arr.indexOf(s) === i);

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
          ステップ 2
        </p>
        <h2
          className="text-[22px] font-bold tracking-tight"
          style={{
            fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
          }}
        >
          紹介しているスポットを確認する
        </h2>
        <p className="text-[12px] text-foreground/65">
          前のステップで写真に付けた場所名はカードとして並びます。追加・並び替えもここからどうぞ。
        </p>
      </header>

      {hinted.length > 0 ? (
        <aside className="rounded-md bg-primary-500/10 px-3 py-2 text-[11px] text-primary-300">
          フォト日記の場所として入力済み:{' '}
          <span className="font-bold">{hinted.join(' / ')}</span>
          <span className="ml-2 text-foreground/55">
            該当する Google Place を選んでスポット化してください
          </span>
        </aside>
      ) : null}

      <SpotsSection
        articleId={articleId}
        initial={initial}
        googleMapsApiKey={googleMapsApiKey}
        onSpotsChange={onChange}
      />
    </div>
  );
}

// =============================================================================
// Step 3: 旅程ブロック（itinerary のみ）
// =============================================================================
function Step3Itinerary({
  blocks,
  onChange,
  spots,
  googleMapsApiKey,
}: {
  blocks: ItineraryBlock[];
  onChange: (next: ItineraryBlock[]) => void;
  spots: SpotRow[];
  googleMapsApiKey?: string;
}) {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
          ステップ 3
        </p>
        <h2
          className="text-[22px] font-bold tracking-tight"
          style={{
            fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
          }}
        >
          旅程を組み立てる
        </h2>
        <p className="text-[12px] text-foreground/65">
          スポットの順序、開始時刻、スポット間の移動手段と時間を入力します。
        </p>
      </header>
      <ItineraryBlocksEditor
        blocks={blocks}
        onChange={onChange}
        spots={spots}
        googleMapsApiKey={googleMapsApiKey}
      />
    </div>
  );
}

// =============================================================================
// Step 4: 公開準備
// =============================================================================
function Step4Publish({
  coverImageUrl,
  onChangeCover,
  articleId,
  videos,
  isPublished,
  missing,
  modScore,
}: {
  coverImageUrl: string;
  onChangeCover: (v: string) => void;
  articleId: string;
  videos: VideoRow[];
  isPublished: boolean;
  missing: string[];
  modScore: { finalScore: number; action: string } | null;
}) {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
          最終ステップ
        </p>
        <h2
          className="text-[22px] font-bold tracking-tight"
          style={{
            fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
          }}
        >
          公開の準備
        </h2>
        <p className="text-[12px] text-foreground/65">
          カバー画像と任意の動画を設定したら、投稿ボタンで公開できます。
        </p>
      </header>

      <CoverImageSection
        value={coverImageUrl}
        onChange={onChangeCover}
        isPublished={isPublished}
      />

      <VideosSection articleId={articleId} initial={videos} />

      {modScore && (modScore.action === 'warned' || modScore.action === 'held') ? (
        <div className="rounded-md border border-warning-500 bg-warning-50 p-3 text-[12px] text-warning-700">
          事前モデレーション: 映え過剰度 {modScore.finalScore} / 100。
          観光客向けに寄り過ぎていないか確認してください。
        </div>
      ) : null}

      {missing.length > 0 ? (
        <aside
          role="alert"
          className="rounded-md border border-danger-500/40 bg-danger-50 p-3 text-[12px] text-danger-500"
        >
          公開前に必要な項目: {missing.join(' / ')}
        </aside>
      ) : (
        <aside className="rounded-md border border-emerald-500/40 bg-emerald-50/60 p-3 text-[12px] text-emerald-700">
          すべての必須項目が揃いました。「投稿する」で公開できます。
        </aside>
      )}
    </div>
  );
}
