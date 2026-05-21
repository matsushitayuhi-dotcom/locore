'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@locore/ui';
import { ArrowLeft, ArrowRight, Camera, FileText, Send } from 'lucide-react';
import { ModerationBanner } from '@/components/writer/ModerationBanner';
import { useRouter } from 'next/navigation';
import {
  saveDraftArticle,
  publishArticle,
} from '@/app/writer/articles/[id]/edit/actions';
import { runMockModeration } from '@/lib/moderation/mock';
import type { BasicInfoValue } from './BasicInfoSection';
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
 * 記事編集のステップ式ウィザード（Substack 風）。
 *
 * Step 1 (下書き)     : タイトル + 本文 / 写真ジャーナル のみ。書き始めのハードルを最小化。
 * Step 2 (スポット)   : スポット一覧の確認・追加・並び替え
 * Step 3 (旅程)       : 旅程プラン記事のときのみ表示。スポット間移動など
 * Step 4 (公開準備)   : 記事タイプ / スタイル / 価格 / 都市 / タグ / カバー画像 / 動画 → 公開
 *
 * 2026-05 改修:
 *   - メタ情報 (タイプ / 価格 / 都市 / タグ) を Step 4 に集約
 *   - 自動保存を撤去。「下書き保存」ボタン押下時のみ DB 保存
 *   - 未保存変更時に beforeunload 警告 + ステップ移動時に confirm
 *   - 公開ボタンに確認モーダル
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
  tier: _tier,
  googleMapsApiKey,
}: Props) {
  // tier は将来の手数料率表示用。現状は未使用なので参照だけ
  void _tier;

  const [step, setStep] = useState<Step>(1);

  // 共通 state
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
  const [coverImageUrl, setCoverImageUrl] = useState(
    article.coverImageUrl ?? '',
  );
  const [itineraryBlocks, setItineraryBlocks] = useState<ItineraryBlock[]>(
    article.itineraryBlocks ?? [],
  );
  const [photoEntries, setPhotoEntries] = useState<PhotoEntry[]>(
    article.photoEntries ?? [],
  );
  const [spotsForDropdown, setSpotsForDropdown] = useState<SpotRow[]>(spots);

  // 「最後にサーバへ保存した時点」の dirty 判定スナップショット。
  // currentSnapshot と同じ正規化ルール（articleType / bodyStyle に応じた絞り込み）を
  // 使って初期化しないと、開いた瞬間に「未保存」扱いになってしまう。
  const initialSnapshot = useMemo(
    () => {
      const initArticleType = article.articleType;
      const initBodyStyle = article.bodyStyle ?? 'photo_journal';
      return makeSnapshot({
        title: article.title,
        body: article.body,
        bodyPaid: article.bodyPaid ?? '',
        bodyStyle: initBodyStyle,
        basic: {
          priceJpy: article.priceJpy,
          durationType: article.durationType ?? '',
          articleType: initArticleType,
          tagsText: (article.tags ?? []).join(', '),
          cityId: article.cityId,
        },
        coverImageUrl: article.coverImageUrl ?? '',
        itineraryBlocks:
          initArticleType === 'itinerary' ? article.itineraryBlocks ?? [] : [],
        photoEntries:
          initBodyStyle === 'photo_journal' ? article.photoEntries ?? [] : [],
      });
    },
    // 初期スナップショットは article（サーバから渡された初期値）に依存
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const lastSavedSnapshotRef = useRef<string>(initialSnapshot);

  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const router = useRouter();

  const tags = useMemo(
    () =>
      basic.tagsText
        .split(/[,、\n]/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
    [basic.tagsText],
  );

  const isItinerary = basic.articleType === 'itinerary';
  /**
   * 駐在者向け実務情報 (expat_info) は地図上のスポットを必須にしない。
   * 「殺虫剤はここで買えました」「ビザ申請の流れ」のような文章主体の
   * 記事ではスポット登録があっても無くても良いというポリシー。
   */
  const isExpatInfo = basic.articleType === 'expat_info';
  const totalSteps: 3 | 4 = isItinerary ? 4 : 3;
  // itinerary 以外のときは step=3 を飛ばして step=4 を「Step 3 = 公開」として扱う
  const visibleStepIndex = step >= 3 && !isItinerary ? step - 1 : step;

  // ----- dirty 判定 -----
  const currentSnapshot = useMemo(
    () =>
      makeSnapshot({
        title,
        body,
        bodyPaid,
        bodyStyle,
        basic,
        coverImageUrl,
        itineraryBlocks: isItinerary ? itineraryBlocks : [],
        photoEntries: bodyStyle === 'photo_journal' ? photoEntries : [],
      }),
    [
      title,
      body,
      bodyPaid,
      bodyStyle,
      basic,
      coverImageUrl,
      itineraryBlocks,
      photoEntries,
      isItinerary,
    ],
  );
  const isDirty = currentSnapshot !== lastSavedSnapshotRef.current;

  // ページ離脱時の警告。未保存変更があるときだけ beforeunload を発火させる
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome/Safari 互換: returnValue にセットする必要がある
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ----- 明示「下書き保存」 -----
  const [isSavingDraft, startSavingDraft] = useTransition();
  const handleSaveDraft = (silent = false): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!title.trim()) {
        toast.error('タイトルを入力すると保存できます');
        resolve(false);
        return;
      }
      const snapshotAtSave = currentSnapshot;
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
          lastSavedSnapshotRef.current = snapshotAtSave;
          setLastSavedAt(new Date());
          if (!silent) toast.success('下書きを保存しました');
          resolve(true);
        } else {
          toast.error(res.error);
          resolve(false);
        }
      });
    });
  };

  // ----- 簡易モデレーション（クライアント側の事前可視化のみ） -----
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
  }, [title, body, bodyPaid, tags]);

  // ----- 公開条件チェック -----
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
  if (!isExpatInfo && spotsForDropdown.length === 0)
    missing.push('スポット 1 件以上');
  if (!coverImageUrl.trim()) missing.push('カバー画像');
  if (isItinerary && itineraryBlocks.length < 2)
    missing.push('旅程ブロック 2 件以上');

  // ----- 公開モーダル -----
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPublishing, startPublishing] = useTransition();
  const handleConfirmPublish = () => {
    startPublishing(async () => {
      // 公開前に最新を保存
      const saved = await handleSaveDraft(true);
      if (!saved) return;
      const pubRes = await publishArticle(article.id);
      if (pubRes.ok) {
        toast.success('公開しました');
        // 公開直後は dirty を消すため snapshot をリセット
        lastSavedSnapshotRef.current = currentSnapshot;
        setConfirmOpen(false);
        router.push(`/articles/${article.id}`);
      } else {
        toast.error(pubRes.error);
      }
    });
  };

  // ----- ナビゲーション -----
  /** ステップ移動時に「未保存です。続けますか?」確認 */
  const maybeConfirmDirty = (): boolean => {
    if (!isDirty) return true;
    return window.confirm(
      '変更が保存されていません。\n保存せずに移動してもよろしいですか？\n（「下書き保存」ボタンで保存できます）',
    );
  };

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
    // step 2 → 3: スポットチェック (expat_info は任意なのでスキップ)
    if (step === 2 && !isExpatInfo && spotsForDropdown.length === 0) {
      toast.error('スポットを 1 件以上登録してください');
      return;
    }
    // step 3 → 4: 旅程ブロックチェック
    if (step === 3 && isItinerary && itineraryBlocks.length < 2) {
      toast.error('旅程ブロックを 2 件以上追加してください');
      return;
    }
    if (!maybeConfirmDirty()) return;

    // itinerary 以外は step=3 を飛ばす
    if (step === 2 && !isItinerary) {
      setStep(4);
    } else if (step < 4) {
      setStep((step + 1) as Step);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const goPrev = () => {
    if (!maybeConfirmDirty()) return;
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
        isDirty={isDirty}
        lastSavedAt={lastSavedAt}
        articleId={article.id}
        onSaveDraft={() => void handleSaveDraft(false)}
        isSavingDraft={isSavingDraft}
      />

      <ModerationBanner
        finalScore={article.moderationScore}
        warned={article.warned}
        status={article.status}
      />

      <StepProgress
        current={visibleStepIndex}
        total={totalSteps}
        showItinerary={isItinerary}
      />

      {/* ステップ別本体 */}
      {step === 1 ? (
        <Step1TitleBody
          title={title}
          onChangeTitle={setTitle}
          bodyStyle={bodyStyle}
          body={body}
          bodyPaid={bodyPaid}
          onChangeBody={setBody}
          onChangeBodyPaid={setBodyPaid}
          photoEntries={photoEntries}
          onChangePhotoEntries={setPhotoEntries}
        />
      ) : null}

      {step === 2 ? (
        <Step2Spots
          articleId={article.id}
          initial={spots}
          googleMapsApiKey={googleMapsApiKey}
          onChange={setSpotsForDropdown}
          photoEntries={bodyStyle === 'photo_journal' ? photoEntries : []}
          isOptional={isExpatInfo}
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
          basic={basic}
          onChangeBasic={setBasic}
          cities={cities}
          bodyStyle={bodyStyle}
          onChangeBodyStyle={setBodyStyle}
          coverImageUrl={coverImageUrl}
          onChangeCover={setCoverImageUrl}
          articleId={article.id}
          videos={videos}
          isPublished={article.status === 'published'}
          missing={missing}
          modScore={modScore}
        />
      ) : null}

      {/* ナビゲーションフッタ — z-50 でグローバルナビ系より前面に */}
      <nav
        aria-label="ウィザードナビゲーション"
        className="sticky bottom-2 z-50 flex items-center justify-between gap-2 rounded-2xl bg-card/95 p-2 shadow-xl ring-1 ring-border backdrop-blur sm:bottom-4 sm:p-3"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={goPrev}
          disabled={step === 1}
        >
          <ArrowLeft className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">戻る</span>
        </Button>

        <p className="text-[10px] text-foreground/55 sm:text-[11px]">
          {visibleStepIndex} / {totalSteps}
        </p>

        {step === 4 ? (
          <PublishButton
            disabled={missing.length > 0 || isPublishing || isSavingDraft}
            missing={missing}
            onClick={() => setConfirmOpen(true)}
          />
        ) : (
          <Button type="button" variant="primary" size="sm" onClick={goNext}>
            <span className="hidden sm:inline">次へ</span>
            <ArrowRight className="h-4 w-4 sm:ml-1" />
          </Button>
        )}
      </nav>

      {/* 公開確認モーダル */}
      {confirmOpen ? (
        <PublishConfirmDialog
          title={title}
          articleType={basic.articleType}
          priceJpy={basic.priceJpy}
          cityName={
            cities.find((c) => c.id === basic.cityId)?.nameJa ?? '未選択'
          }
          coverImageUrl={coverImageUrl}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={handleConfirmPublish}
          isLoading={isPublishing}
        />
      ) : null}
    </div>
  );
}

// =============================================================================
// dirty 判定スナップショット
// =============================================================================
function makeSnapshot(input: {
  title: string;
  body: string;
  bodyPaid: string;
  bodyStyle: string;
  basic: BasicInfoValue;
  coverImageUrl: string;
  itineraryBlocks: ItineraryBlock[];
  photoEntries: PhotoEntry[];
}) {
  // JSON.stringify でフィールド単位の変更を 1 つの string にまとめる
  return JSON.stringify(input);
}

// =============================================================================
// ヘッダ
// =============================================================================
function Header({
  title,
  isDirty,
  lastSavedAt,
  articleId,
  onSaveDraft,
  isSavingDraft,
}: {
  title: string;
  isDirty: boolean;
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
        <SaveStatus isDirty={isDirty} lastSavedAt={lastSavedAt} />
        <Button
          variant={isDirty ? 'primary' : 'outline'}
          size="sm"
          onClick={onSaveDraft}
          disabled={isSavingDraft}
        >
          {isSavingDraft ? '保存中…' : '下書き保存'}
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

/** 「●未保存」or 「最終保存: 1 分前」を表示する小さなステータス */
function SaveStatus({
  isDirty,
  lastSavedAt,
}: {
  isDirty: boolean;
  lastSavedAt: Date | null;
}) {
  // 相対時間を 30 秒ごとに更新
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!lastSavedAt) return;
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, [lastSavedAt]);

  if (isDirty) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-danger-500">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-danger-500" />
        未保存
      </span>
    );
  }
  if (lastSavedAt) {
    return (
      <span className="text-[11px] text-foreground/55">
        最終保存: {formatRelative(lastSavedAt)}
      </span>
    );
  }
  return null;
}

function formatRelative(d: Date): string {
  const ms = Date.now() - d.getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 30) return 'たった今';
  const min = Math.floor(sec / 60);
  if (min < 1) return `${sec} 秒前`;
  if (min < 60) return `${min} 分前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} 時間前`;
  return d.toLocaleDateString('ja-JP');
}

// =============================================================================
// ステップインジケータ
// =============================================================================
const STEP_LABELS: { key: 'draft' | 'spots' | 'itinerary' | 'publish'; label: string }[] = [
  { key: 'draft', label: '下書き' },
  { key: 'spots', label: 'スポット' },
  { key: 'itinerary', label: '旅程' },
  { key: 'publish', label: '公開準備' },
];

function StepProgress({
  current,
  total,
  showItinerary,
}: {
  current: number;
  total: number;
  /** 旅程ステップを表示するか（articleType === 'itinerary' のときのみ true） */
  showItinerary: boolean;
}) {
  const labels = showItinerary
    ? STEP_LABELS
    : STEP_LABELS.filter((s) => s.key !== 'itinerary');
  return (
    <ol className="flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-[0.05em]">
      {labels.map((s, i) => {
        const n = i + 1;
        const on = n === current;
        const done = n < current;
        return (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className={
                'inline-flex h-7 min-w-7 items-center justify-center gap-1.5 rounded-full px-2.5 ring-1 ' +
                (on
                  ? 'bg-primary-500 text-neutral-950 ring-primary-500'
                  : done
                    ? 'bg-primary-500/15 text-primary-300 ring-primary-300/40'
                    : 'bg-card text-foreground/45 ring-border')
              }
            >
              <span className="tabular text-[11px]">{n}</span>
              <span className="text-[11px]">{s.label}</span>
            </span>
            {n < total ? (
              <span
                className={
                  'h-[2px] w-6 ' + (done ? 'bg-primary-300/60' : 'bg-border')
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
// Step 1: タイトル + 本文（タブ切替）
// =============================================================================

function Step1TitleBody({
  title,
  onChangeTitle,
  bodyStyle,
  body,
  bodyPaid,
  onChangeBody,
  onChangeBodyPaid,
  photoEntries,
  onChangePhotoEntries,
}: {
  title: string;
  onChangeTitle: (v: string) => void;
  bodyStyle: 'photo_journal' | 'classic';
  body: string;
  bodyPaid: string;
  onChangeBody: (v: string) => void;
  onChangeBodyPaid: (v: string) => void;
  photoEntries: PhotoEntry[];
  onChangePhotoEntries: (v: PhotoEntry[]) => void;
}) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <header className="space-y-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
          ステップ 1
        </p>
        <h2
          className="text-[22px] font-bold tracking-tight"
          style={{
            fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
          }}
        >
          書き始める
        </h2>
        <p className="text-[12px] text-foreground/65">
          まずはタイトルと中身だけ。記事の種類や価格はあとで決められます。
        </p>
      </header>

      {/* タイトル + 本文を 1 つのカードに統合 */}
      <section className="space-y-4 rounded-md bg-card p-4 ring-1 ring-border sm:space-y-5 sm:p-6">
        {/* タイトル */}
        <div>
          <label
            htmlFor="wz-title"
            className="mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/55"
          >
            タイトル <span className="text-danger-500">*</span>
          </label>
          <input
            id="wz-title"
            type="text"
            value={title === '新しい記事' ? '' : title}
            onChange={(e) => onChangeTitle(e.target.value || '新しい記事')}
            maxLength={200}
            placeholder="記事のタイトル"
            className="h-11 w-full rounded-md border border-border bg-background px-3 text-[15px] font-bold focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none sm:text-[16px]"
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
            bodyFree={body}
            bodyPaid={bodyPaid}
            onChangeBodyFree={onChangeBody}
            onChangeBodyPaid={onChangeBodyPaid}
          />
        )}
      </section>
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
  isOptional = false,
}: {
  articleId: string;
  initial: SpotRow[];
  googleMapsApiKey?: string;
  onChange: (next: SpotRow[]) => void;
  photoEntries: PhotoEntry[];
  /** expat_info 記事のときに true。「任意」表示に切り替える */
  isOptional?: boolean;
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
          {isOptional
            ? 'スポットを追加する (任意)'
            : '紹介しているスポットを確認する'}
        </h2>
        <p className="text-[12px] text-foreground/65">
          {isOptional
            ? '駐在者情報の記事ではスポットの登録は任意です。「ここで買えた」など具体的な店舗を紹介したい場合のみ追加してください。'
            : '前のステップで写真に付けた場所名はカードとして並びます。追加・並び替えもここからどうぞ。'}
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
// Step 4: 公開準備（メタ + カバー + 動画 + 公開）
// =============================================================================
const ARTICLE_TYPE_OPTIONS: {
  value: 'spot_guide' | 'itinerary' | 'expat_info';
  label: string;
}[] = [
  { value: 'spot_guide', label: 'スポット紹介' },
  { value: 'itinerary', label: '旅程プラン' },
  { value: 'expat_info', label: '駐在者情報' },
];

function Step4Publish({
  basic,
  onChangeBasic,
  cities,
  bodyStyle,
  onChangeBodyStyle,
  coverImageUrl,
  onChangeCover,
  articleId,
  videos,
  isPublished,
  missing,
  modScore,
}: {
  basic: BasicInfoValue;
  onChangeBasic: (v: BasicInfoValue) => void;
  cities: { id: string; nameJa: string }[];
  bodyStyle: 'photo_journal' | 'classic';
  onChangeBodyStyle: (v: 'photo_journal' | 'classic') => void;
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
          記事の種類・価格・カバー画像をまとめて設定したら、最後に「公開する」を押してください。
        </p>
      </header>

      {/* 記事タイプ + 本文スタイル */}
      <section className="space-y-4 rounded-md bg-card p-4 ring-1 ring-border sm:p-6">
        <h3 className="text-[14px] font-semibold tracking-tight">
          記事の種類とスタイル
        </h3>

        <div>
          <p className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/55">
            記事の種類 <span className="text-danger-500">*</span>
          </p>
          <div role="radiogroup" className="flex flex-wrap gap-1.5">
            {ARTICLE_TYPE_OPTIONS.map((opt) => {
              const on = basic.articleType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() =>
                    onChangeBasic({ ...basic, articleType: opt.value })
                  }
                  className={
                    'rounded-full px-3 py-1.5 text-[12px] font-semibold transition ' +
                    (on
                      ? 'bg-primary-500 text-neutral-950'
                      : 'bg-primary-500/10 text-primary-300 hover:bg-primary-500/15')
                  }
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/55">
            本文のスタイル
          </p>
          <div
            role="tablist"
            aria-label="本文スタイル"
            className="flex flex-col gap-1.5 sm:flex-row"
          >
            <TabButton
              active={bodyStyle === 'photo_journal'}
              onClick={() => onChangeBodyStyle('photo_journal')}
              icon={Camera}
              label="インスタスタイル"
              sub="写真 + 場所 + キャプション"
            />
            <TabButton
              active={bodyStyle === 'classic'}
              onClick={() => onChangeBodyStyle('classic')}
              icon={FileText}
              label="クラシック"
              sub="従来のブログ風テキスト"
            />
          </div>
          <p className="mt-1.5 text-[11px] text-foreground/55">
            ※ スタイルを切り替えると、Step 1 の編集領域も変わります
          </p>
        </div>
      </section>

      {/* 価格 / 都市 / 所要時間 / タグ */}
      <BasicMetaSection value={basic} onChange={onChangeBasic} cities={cities} />

      {/* カバー画像 */}
      <CoverImageSection
        value={coverImageUrl}
        onChange={onChangeCover}
        isPublished={isPublished}
      />

      {/* 動画埋め込み */}
      <VideosSection articleId={articleId} initial={videos} />

      {modScore &&
      (modScore.action === 'warned' || modScore.action === 'held') ? (
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
          すべての必須項目が揃いました。「公開する」で読者に届きます。
        </aside>
      )}
    </div>
  );
}

/**
 * 価格 / 所要時間 / 都市 / タグの簡易セクション。
 */
function BasicMetaSection({
  value,
  onChange,
  cities,
}: {
  value: BasicInfoValue;
  onChange: (next: BasicInfoValue) => void;
  cities: { id: string; nameJa: string }[];
}) {
  return (
    <section className="space-y-4 rounded-md bg-card p-4 ring-1 ring-border sm:p-6">
      <h3 className="text-[14px] font-semibold tracking-tight">
        価格・タグ・都市
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="wz-price"
            className="mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/55"
          >
            価格（円）<span className="text-danger-500">*</span>
          </label>
          <div className="flex items-stretch gap-1.5">
            <input
              id="wz-price"
              type="number"
              inputMode="numeric"
              min={0}
              max={99999}
              step={50}
              value={value.priceJpy}
              onChange={(e) =>
                onChange({
                  ...value,
                  priceJpy: Math.max(
                    0,
                    Math.floor(Number(e.target.value) || 0),
                  ),
                })
              }
              className="h-11 w-full min-w-0 rounded-md border border-border bg-background px-3 text-[15px] font-bold tabular focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
            />
            <span className="inline-flex h-11 items-center rounded-md bg-muted px-3 text-[12px] font-semibold text-foreground/65">
              円
            </span>
          </div>
          <p className="mt-1 text-[10px] text-foreground/55">
            自由に設定できます。手数料はクリエイターランクに応じます。
          </p>
        </div>

        <div>
          <label
            htmlFor="wz-duration"
            className="mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/55"
          >
            所要時間
          </label>
          <select
            id="wz-duration"
            value={value.durationType}
            onChange={(e) =>
              onChange({
                ...value,
                durationType: e.target.value as BasicInfoValue['durationType'],
              })
            }
            className="h-11 w-full rounded-md border border-border bg-background px-3 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
          >
            <option value="">未指定</option>
            <option value="few_hours">数時間</option>
            <option value="half_day">半日</option>
            <option value="full_day">終日</option>
            <option value="other">その他</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="wz-city"
            className="mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/55"
          >
            都市
          </label>
          <select
            id="wz-city"
            value={value.cityId}
            onChange={(e) => onChange({ ...value, cityId: e.target.value })}
            className="h-11 w-full rounded-md border border-border bg-background px-3 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
          >
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameJa}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="wz-tags"
            className="mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/55"
          >
            タグ（カンマ区切り）
          </label>
          <input
            id="wz-tags"
            type="text"
            value={value.tagsText}
            onChange={(e) =>
              onChange({ ...value, tagsText: e.target.value })
            }
            placeholder="例: 朝食, カフェ, マレ"
            className="h-11 w-full rounded-md border border-border bg-background px-3 text-[13px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
          />
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// 公開ボタン（tooltip + disabled）
// =============================================================================
function PublishButton({
  disabled,
  missing,
  onClick,
}: {
  disabled: boolean;
  missing: string[];
  onClick: () => void;
}) {
  const tooltip =
    missing.length > 0
      ? `未入力: ${missing.join(' / ')}`
      : 'この内容で公開します';
  return (
    <span title={tooltip}>
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={onClick}
        disabled={disabled}
      >
        <Send className="mr-1 h-4 w-4" />
        公開する
      </Button>
    </span>
  );
}

// =============================================================================
// 公開確認ダイアログ
// =============================================================================
function PublishConfirmDialog({
  title,
  articleType,
  priceJpy,
  cityName,
  coverImageUrl,
  onCancel,
  onConfirm,
  isLoading,
}: {
  title: string;
  articleType: 'spot_guide' | 'itinerary' | 'expat_info';
  priceJpy: number;
  cityName: string;
  coverImageUrl: string;
  onCancel: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  const typeLabel =
    articleType === 'itinerary'
      ? '旅程プラン'
      : articleType === 'expat_info'
        ? '駐在者情報'
        : 'スポット紹介';
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-900/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-confirm-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
          公開の確認
        </p>
        <h3
          id="publish-confirm-title"
          className="mt-1 text-[20px] font-bold leading-snug"
          style={{
            fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
          }}
        >
          この内容で公開しますか？
        </h3>

        <div className="mt-4 flex gap-3">
          {coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverImageUrl}
              alt=""
              className="h-20 w-28 shrink-0 rounded-md border border-border bg-muted object-cover"
            />
          ) : (
            <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted text-[10px] text-foreground/40">
              カバー未設定
            </div>
          )}
          <dl className="grid flex-1 grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px]">
            <dt className="text-foreground/55">タイトル</dt>
            <dd className="line-clamp-2 font-medium">{title || '（無題）'}</dd>
            <dt className="text-foreground/55">種類</dt>
            <dd>{typeLabel}</dd>
            <dt className="text-foreground/55">価格</dt>
            <dd className="tabular font-medium">
              ¥{priceJpy.toLocaleString('ja-JP')}
            </dd>
            <dt className="text-foreground/55">都市</dt>
            <dd>{cityName}</dd>
          </dl>
        </div>

        <p className="mt-4 rounded-md bg-warning-50 px-3 py-2 text-[11px] leading-relaxed text-warning-700">
          公開後はすぐに読者に表示されます。価格やカバー画像はあとから変更可能ですが、
          公開後の購入者には旧バージョンが届きます。
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
            キャンセル
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? '公開中…' : '公開する'}
          </Button>
        </div>
      </div>
    </div>
  );
}
