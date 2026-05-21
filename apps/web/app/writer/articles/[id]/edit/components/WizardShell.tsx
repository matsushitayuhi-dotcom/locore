'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@locore/ui';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Copy,
  FileText,
  Link2,
  Link2Off,
  Send,
  ChevronDown,
} from 'lucide-react';
import { ModerationBanner } from '@/components/writer/ModerationBanner';
import { useRouter } from 'next/navigation';
import {
  saveDraftArticle,
  publishArticle,
  updateArticlePrice,
  generatePreviewToken,
  revokePreviewToken,
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
  /** 共有プレビュー magic-link 用トークン。NULL なら未発行。 */
  previewToken: string | null;
  /** 共有プレビュートークンの有効期限。 */
  previewTokenExpiresAt: Date | null;
  /**
   * 公開日時。予約公開 (status='draft' + publishedAt が未来日時) を判定するのに使う。
   * NULL なら未公開・未予約。
   */
  publishedAt: Date | null;
};

type CityOption = { id: string; nameJa: string; nameEn: string | null };

type Props = {
  article: ArticleInitial;
  spots: SpotRow[];
  videos: VideoRow[];
  cities: CityOption[];
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

  // ----- 公開タイミング (#16) -----
  // 'now': 今すぐ公開 / 'scheduled': 予約公開
  const [publishMode, setPublishMode] = useState<'now' | 'scheduled'>(() => {
    if (
      article.status === 'draft' &&
      article.publishedAt &&
      article.publishedAt.getTime() > Date.now()
    ) {
      return 'scheduled';
    }
    return 'now';
  });
  // datetime-local の生 string（"2026-05-25T10:00"）。空のときは未設定。
  const [scheduledAtLocal, setScheduledAtLocal] = useState<string>(() => {
    if (
      article.status === 'draft' &&
      article.publishedAt &&
      article.publishedAt.getTime() > Date.now()
    ) {
      return toDatetimeLocalValue(article.publishedAt);
    }
    return '';
  });

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
    // 予約公開時のクライアント側バリデーション
    let scheduledAtIso: string | null = null;
    if (publishMode === 'scheduled') {
      scheduledAtIso = parseScheduledAt(scheduledAtLocal);
      if (!scheduledAtIso) {
        toast.error('予約日時を入力してください');
        return;
      }
      if (new Date(scheduledAtIso).getTime() < Date.now()) {
        toast.error('予約日時は未来の日時を指定してください');
        return;
      }
    }

    startPublishing(async () => {
      // 公開前に最新を保存
      const saved = await handleSaveDraft(true);
      if (!saved) return;
      const pubRes = await publishArticle({
        articleId: article.id,
        scheduledAt: scheduledAtIso,
      });
      if (pubRes.ok) {
        toast.success(
          pubRes.data?.scheduled ? '公開を予約しました' : '公開しました',
        );
        // 公開直後は dirty を消すため snapshot をリセット
        lastSavedSnapshotRef.current = currentSnapshot;
        setConfirmOpen(false);
        // 予約公開のときは記事一覧へ。即時公開のときは公開ページへ。
        if (pubRes.data?.scheduled) {
          router.push('/writer/articles');
        } else {
          router.push(`/articles/${article.id}`);
        }
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

  /**
   * 公開条件 alert のジャンプリンクから呼ばれる。
   * missing 項目に応じて該当ステップへ移動し、フィールド ID が分かる場合は
   * Step 描画後にスクロール + フォーカスを行う。
   */
  const jumpToMissing = (item: string) => {
    const goStep = (s: Step, anchor?: string) => {
      setStep(s);
      // ステップ切替後のレンダリングを待ってからスクロール
      setTimeout(() => {
        if (anchor) {
          const el = document.getElementById(anchor);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            (el as HTMLElement).focus?.();
            return;
          }
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
    };

    if (item === 'タイトル') {
      goStep(1, 'wz-title');
    } else if (item === '本文 100 字以上' || item === '写真 1 枚以上') {
      goStep(1);
    } else if (item === 'スポット 1 件以上') {
      goStep(2);
    } else if (item === '旅程ブロック 2 件以上') {
      goStep(3);
    } else if (item === 'カバー画像') {
      goStep(4, 'wz-cover-anchor');
    } else {
      // 価格 / 都市 / 等の Step 4 系
      goStep(4);
    }
  };

  const goNext = () => {
    // 2026-05 改修:
    //   旧実装はステップ移動時に missing 項目を toast.error で警告していたが、
    //   Step 4 の alert と二重表示になっていたため Toast 系は撤去。
    //   未入力があってもステップ移動は許可し、Step 4 alert に集約する
    //   （alert からはジャンプリンクで該当ステップへ戻れる）。
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
          // ----- SEO チェック用の入力 -----
          title={title}
          body={body}
          bodyPaid={bodyPaid}
          bodyStyleForSeo={bodyStyle}
          photoEntries={photoEntries}
          tags={tags}
          articleType={basic.articleType}
          // ----- 共有プレビュー link 用 -----
          initialPreviewToken={article.previewToken}
          initialPreviewExpiresAt={article.previewTokenExpiresAt}
          onJumpToMissing={jumpToMissing}
          // ----- 公開タイミング (#16) -----
          publishMode={publishMode}
          onChangePublishMode={setPublishMode}
          scheduledAtLocal={scheduledAtLocal}
          onChangeScheduledAt={setScheduledAtLocal}
          // ----- 価格変更 (#17) -----
          articleStatus={article.status}
          articleInitialPriceJpy={article.priceJpy}
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
            // #16: 予約公開モードのときはラベルを変える
            label={
              publishMode === 'scheduled' ? '公開を予約する' : '今すぐ公開'
            }
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
          // #16: 予約公開情報をモーダルにも表示
          scheduledAt={
            publishMode === 'scheduled'
              ? parseScheduledAt(scheduledAtLocal)
              : null
          }
        />
      ) : null}
    </div>
  );
}

// =============================================================================
// 予約公開の datetime ヘルパー
// =============================================================================

/**
 * Date を `<input type="datetime-local">` の value 形式
 * "YYYY-MM-DDTHH:MM" (ローカルタイムゾーン) に変換する。
 */
function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    d.getFullYear() +
    '-' +
    pad(d.getMonth() + 1) +
    '-' +
    pad(d.getDate()) +
    'T' +
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes())
  );
}

/**
 * `<input type="datetime-local">` の value（ローカルタイム）を ISO string に変換する。
 * 空文字 / 不正値のときは null。
 */
function parseScheduledAt(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
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
  title,
  body,
  bodyPaid,
  bodyStyleForSeo,
  photoEntries,
  tags,
  articleType,
  initialPreviewToken,
  initialPreviewExpiresAt,
  onJumpToMissing,
  publishMode,
  onChangePublishMode,
  scheduledAtLocal,
  onChangeScheduledAt,
  articleStatus,
  articleInitialPriceJpy,
}: {
  basic: BasicInfoValue;
  onChangeBasic: (v: BasicInfoValue) => void;
  cities: CityOption[];
  bodyStyle: 'photo_journal' | 'classic';
  onChangeBodyStyle: (v: 'photo_journal' | 'classic') => void;
  coverImageUrl: string;
  onChangeCover: (v: string) => void;
  articleId: string;
  videos: VideoRow[];
  isPublished: boolean;
  missing: string[];
  modScore: { finalScore: number; action: string } | null;
  // SEO チェック向け
  title: string;
  body: string;
  bodyPaid: string;
  bodyStyleForSeo: 'photo_journal' | 'classic';
  photoEntries: PhotoEntry[];
  tags: string[];
  articleType: 'spot_guide' | 'itinerary' | 'expat_info';
  // 共有プレビュー link 向け
  initialPreviewToken: string | null;
  initialPreviewExpiresAt: Date | null;
  /** missing 項目クリックで該当ステップ・該当フィールドへジャンプ */
  onJumpToMissing: (item: string) => void;
  // ----- 公開タイミング (#16) -----
  publishMode: 'now' | 'scheduled';
  onChangePublishMode: (v: 'now' | 'scheduled') => void;
  scheduledAtLocal: string;
  onChangeScheduledAt: (v: string) => void;
  // ----- 価格変更 (#17) -----
  articleStatus: 'draft' | 'published' | 'archived' | 'pending_review';
  articleInitialPriceJpy: number;
}) {
  const currentCity = cities.find((c) => c.id === basic.cityId) ?? null;
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
      <BasicMetaSection
        value={basic}
        onChange={onChangeBasic}
        cities={cities}
        // #17: 公開済みでも価格は変更可。価格変更時の確認モーダルを出すために必要
        articleId={articleId}
        isPublished={articleStatus === 'published'}
        initialPriceJpy={articleInitialPriceJpy}
      />

      {/* #16: 公開タイミング (今すぐ / 予約公開) */}
      <PublishTimingSection
        mode={publishMode}
        onChangeMode={onChangePublishMode}
        scheduledAtLocal={scheduledAtLocal}
        onChangeScheduledAt={onChangeScheduledAt}
      />

      {/* カバー画像 — alert からのジャンプ先 (wz-cover-anchor) */}
      <div id="wz-cover-anchor" tabIndex={-1}>
        <CoverImageSection
          value={coverImageUrl}
          onChange={onChangeCover}
          isPublished={isPublished}
        />
      </div>

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
          className="space-y-2 rounded-md border border-warning-500/50 bg-warning-50 p-3 text-[12px] text-warning-700"
        >
          <p className="font-bold">公開前に必要な項目があります</p>
          <ul className="flex flex-wrap gap-1.5">
            {missing.map((m) => (
              <li key={m}>
                <button
                  type="button"
                  onClick={() => onJumpToMissing(m)}
                  className="inline-flex items-center gap-1 rounded-full border border-warning-500/60 bg-card px-2.5 py-1 text-[11px] font-semibold text-warning-700 underline-offset-2 transition hover:bg-warning-500/15 hover:underline focus:outline-none focus:ring-2 focus:ring-warning-500"
                >
                  {m}
                  <span aria-hidden>→</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-warning-700/80">
            項目をクリックすると、該当ステップ・該当フィールドへ移動します。
          </p>
        </aside>
      ) : (
        <aside className="rounded-md border border-emerald-500/40 bg-emerald-50/60 p-3 text-[12px] text-emerald-700">
          すべての必須項目が揃いました。「公開する」で読者に届きます。
        </aside>
      )}

      {/* SEO 簡易チェック ( missing alert の下、品質向上の提案レベル ) */}
      <SeoChecklist
        title={title}
        body={body}
        bodyPaid={bodyPaid}
        bodyStyle={bodyStyleForSeo}
        photoEntries={photoEntries}
        tags={tags}
        articleType={articleType}
        coverImageUrl={coverImageUrl}
        city={currentCity}
      />

      {/* プレビューを共有 ( magic-link 発行 / 無効化 ) */}
      <SharePreviewSection
        articleId={articleId}
        initialToken={initialPreviewToken}
        initialExpiresAt={initialPreviewExpiresAt}
      />
    </div>
  );
}

/**
 * 価格 / 所要時間 / 都市 / タグの簡易セクション。
 *
 * 2026-05 改修 (#17): 公開済み記事でも価格は変更可能。確認モーダル経由で
 * `updateArticlePrice` を即時呼び出す。価格以外のフィールドは従来どおり
 * 親 state を更新するのみで、保存は親の handleSaveDraft 経由。
 */
function BasicMetaSection({
  value,
  onChange,
  cities,
  articleId,
  isPublished,
  initialPriceJpy,
}: {
  value: BasicInfoValue;
  onChange: (next: BasicInfoValue) => void;
  cities: CityOption[];
  articleId: string;
  isPublished: boolean;
  /** サーバから渡された公開時点の価格。確認モーダルの「旧価格」表示に使う想定（現状は未使用） */
  initialPriceJpy: number;
}) {
  // initialPriceJpy は将来用途のためにシグネチャに残す。
  void initialPriceJpy;

  // 公開済みのときは、価格 input は「最後にサーバ保存された価格」を表示し、
  // 確定（モーダル confirm）するまで親 basic.priceJpy を変更しない。
  const [draftPrice, setDraftPrice] = useState<number>(value.priceJpy);
  // 親 priceJpy が外から変わったら追従（複製や autoSave 後など）
  useEffect(() => {
    setDraftPrice(value.priceJpy);
  }, [value.priceJpy]);

  const [priceConfirm, setPriceConfirm] = useState<{
    from: number;
    to: number;
  } | null>(null);
  const [isUpdatingPrice, startUpdatePrice] = useTransition();

  const handlePriceChangeRaw = (next: number) => {
    if (isPublished) {
      // 公開済みは即 onChange しない。draft に置いて blur/confirm で確定。
      setDraftPrice(next);
    } else {
      onChange({ ...value, priceJpy: next });
    }
  };

  /** 公開済み: 「変更を確定」を押したときに確認モーダルを開く。 */
  const handlePriceCommit = () => {
    if (!isPublished) return;
    if (draftPrice === value.priceJpy) return;
    setPriceConfirm({ from: value.priceJpy, to: draftPrice });
  };

  const handlePriceConfirm = () => {
    if (!priceConfirm) return;
    startUpdatePrice(async () => {
      const res = await updateArticlePrice({
        articleId,
        priceJpy: priceConfirm.to,
      });
      if (res.ok) {
        toast.success('価格を更新しました');
        onChange({ ...value, priceJpy: priceConfirm.to });
        setPriceConfirm(null);
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <section className="space-y-4 rounded-md bg-card p-4 ring-1 ring-border sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-[14px] font-semibold tracking-tight">
          価格・タグ・都市
        </h3>
        {isPublished ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            価格は変更できます
          </span>
        ) : null}
      </div>

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
              value={isPublished ? draftPrice : value.priceJpy}
              onChange={(e) =>
                handlePriceChangeRaw(
                  Math.max(0, Math.floor(Number(e.target.value) || 0)),
                )
              }
              className="h-11 w-full min-w-0 rounded-md border border-border bg-background px-3 text-[15px] font-bold tabular focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
            />
            <span className="inline-flex h-11 items-center rounded-md bg-muted px-3 text-[12px] font-semibold text-foreground/65">
              円
            </span>
            {isPublished ? (
              <Button
                type="button"
                size="sm"
                variant="primary"
                disabled={
                  draftPrice === value.priceJpy || isUpdatingPrice
                }
                onClick={handlePriceCommit}
                className="h-11 shrink-0 px-3 text-[12px]"
              >
                変更を確定
              </Button>
            ) : null}
          </div>
          <p className="mt-1 text-[10px] text-foreground/55">
            {isPublished
              ? '公開済み記事の価格は変更できます。購入済み読者の閲覧には影響しません。'
              : '自由に設定できます。手数料はクリエイターランクに応じます。'}
            {/* 元の価格と異なるとき、サマリを補助表示 */}
            {isPublished && draftPrice !== value.priceJpy ? (
              <span className="ml-1 text-warning-700">
                （現行 ¥{value.priceJpy.toLocaleString('ja-JP')} → 変更後 ¥
                {draftPrice.toLocaleString('ja-JP')}）
              </span>
            ) : null}
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

      {/* #17: 公開済み記事の価格変更確認モーダル */}
      {priceConfirm ? (
        <PriceChangeConfirmDialog
          fromPriceJpy={priceConfirm.from}
          toPriceJpy={priceConfirm.to}
          onCancel={() => setPriceConfirm(null)}
          onConfirm={handlePriceConfirm}
          isLoading={isUpdatingPrice}
        />
      ) : null}
    </section>
  );
}

/**
 * #16: 公開タイミング (今すぐ / 予約公開) セクション。
 */
function PublishTimingSection({
  mode,
  onChangeMode,
  scheduledAtLocal,
  onChangeScheduledAt,
}: {
  mode: 'now' | 'scheduled';
  onChangeMode: (v: 'now' | 'scheduled') => void;
  scheduledAtLocal: string;
  onChangeScheduledAt: (v: string) => void;
}) {
  // datetime-local の min は 1 分後（クライアントローカルタイム）
  const minDatetime = (() => {
    const t = new Date(Date.now() + 60_000);
    return toDatetimeLocalValue(t);
  })();

  return (
    <section className="space-y-3 rounded-md bg-card p-4 ring-1 ring-border sm:p-6">
      <h3 className="text-[14px] font-semibold tracking-tight">
        公開タイミング
      </h3>
      <div role="radiogroup" className="flex flex-col gap-1.5 sm:flex-row">
        <label
          className={
            'flex flex-1 cursor-pointer items-start gap-2 rounded-md border px-3 py-2.5 text-left text-[12px] transition ' +
            (mode === 'now'
              ? 'border-primary-500 bg-primary-500/10'
              : 'border-border bg-background hover:border-foreground/30')
          }
        >
          <input
            type="radio"
            name="wz-publish-mode"
            value="now"
            checked={mode === 'now'}
            onChange={() => onChangeMode('now')}
            className="mt-1"
          />
          <span>
            <span className="block text-[13px] font-bold text-foreground">
              今すぐ公開
            </span>
            <span className="block text-[10px] leading-relaxed text-foreground/55">
              ボタンを押した時点で読者に表示されます
            </span>
          </span>
        </label>

        <label
          className={
            'flex flex-1 cursor-pointer items-start gap-2 rounded-md border px-3 py-2.5 text-left text-[12px] transition ' +
            (mode === 'scheduled'
              ? 'border-primary-500 bg-primary-500/10'
              : 'border-border bg-background hover:border-foreground/30')
          }
        >
          <input
            type="radio"
            name="wz-publish-mode"
            value="scheduled"
            checked={mode === 'scheduled'}
            onChange={() => onChangeMode('scheduled')}
            className="mt-1"
          />
          <span className="flex-1">
            <span className="block text-[13px] font-bold text-foreground">
              予約公開
            </span>
            <span className="block text-[10px] leading-relaxed text-foreground/55">
              指定した日時に達するまで読者には表示されません
            </span>
          </span>
        </label>
      </div>

      {mode === 'scheduled' ? (
        <div>
          <label
            htmlFor="wz-scheduled-at"
            className="mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/55"
          >
            公開日時 <span className="text-danger-500">*</span>
          </label>
          <input
            id="wz-scheduled-at"
            type="datetime-local"
            value={scheduledAtLocal}
            min={minDatetime}
            onChange={(e) => onChangeScheduledAt(e.target.value)}
            className="h-11 w-full max-w-xs rounded-md border border-border bg-background px-3 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
          />
          <p className="mt-1 text-[10px] text-foreground/55">
            タイムゾーンは端末ローカル。予約日時を過ぎると、次のアクセス時点で自動的に公開状態になります。
          </p>
        </div>
      ) : null}
    </section>
  );
}

/**
 * #17: 公開済み記事の価格変更確認モーダル。
 */
function PriceChangeConfirmDialog({
  fromPriceJpy,
  toPriceJpy,
  onCancel,
  onConfirm,
  isLoading,
}: {
  fromPriceJpy: number;
  toPriceJpy: number;
  onCancel: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-900/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="price-change-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
          価格変更の確認
        </p>
        <h3
          id="price-change-title"
          className="mt-1 text-[20px] font-bold leading-snug"
          style={{
            fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
          }}
        >
          価格を変更しますか？
        </h3>

        <p className="mt-4 text-[13px] leading-relaxed text-foreground/80">
          公開済み記事の価格を{' '}
          <span className="font-bold tabular">
            ¥{fromPriceJpy.toLocaleString('ja-JP')}
          </span>{' '}
          から{' '}
          <span className="font-bold tabular text-primary-300">
            ¥{toPriceJpy.toLocaleString('ja-JP')}
          </span>{' '}
          に変更します。
        </p>
        <p className="mt-3 rounded-md bg-emerald-50/60 px-3 py-2 text-[11px] leading-relaxed text-emerald-700">
          購入済み読者の閲覧には影響しません。新規購入者には変更後の価格が適用されます。
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
            キャンセル
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? '更新中…' : '価格を変更する'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// 公開ボタン（tooltip + disabled）
// =============================================================================
function PublishButton({
  disabled,
  missing,
  onClick,
  label = '公開する',
}: {
  disabled: boolean;
  missing: string[];
  onClick: () => void;
  /** ボタンラベル。#16 で「今すぐ公開 / 公開を予約する」を動的に切り替えるために追加 */
  label?: string;
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
        {label}
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
  scheduledAt,
}: {
  title: string;
  articleType: 'spot_guide' | 'itinerary' | 'expat_info';
  priceJpy: number;
  cityName: string;
  coverImageUrl: string;
  onCancel: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  /** 予約公開のときの ISO 文字列。null なら即時公開。 */
  scheduledAt: string | null;
}) {
  const typeLabel =
    articleType === 'itinerary'
      ? '旅程プラン'
      : articleType === 'expat_info'
        ? '駐在者情報'
        : 'スポット紹介';
  const isScheduled = !!scheduledAt;
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
          {isScheduled ? '公開予約の確認' : '公開の確認'}
        </p>
        <h3
          id="publish-confirm-title"
          className="mt-1 text-[20px] font-bold leading-snug"
          style={{
            fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
          }}
        >
          {isScheduled ? 'この日時で公開を予約しますか？' : 'この内容で公開しますか？'}
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
            {isScheduled ? (
              <>
                <dt className="text-foreground/55">公開日時</dt>
                <dd className="font-semibold text-primary-300">
                  {new Date(scheduledAt!).toLocaleString('ja-JP', {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </dd>
              </>
            ) : null}
          </dl>
        </div>

        <p className="mt-4 rounded-md bg-warning-50 px-3 py-2 text-[11px] leading-relaxed text-warning-700">
          {isScheduled
            ? '予約日時を過ぎたあと、最初の閲覧アクセス時に公開状態になります。それまでは読者には表示されません。'
            : '公開後はすぐに読者に表示されます。価格やカバー画像はあとから変更可能ですが、公開後の購入者には旧バージョンが届きます。'}
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
            キャンセル
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={isLoading}>
            {isLoading
              ? isScheduled
                ? '予約中…'
                : '公開中…'
              : isScheduled
                ? '公開を予約する'
                : '公開する'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SEO 簡易チェック ( #19 )
//
// 公開前に「タイトル長すぎ」「都市名が本文に無い」等の品質ヒントを出す。
// missing と違って公開はブロックしない（あくまで提案レベル）。
// 入力が変わる度にリアルタイム再評価される Client Component。
// =============================================================================
type SeoSeverity = 'ok' | 'warn' | 'fail';

type SeoCheckResult = {
  key: string;
  label: string;
  severity: SeoSeverity;
  detail: string;
};

function computeSeoChecks(input: {
  title: string;
  body: string;
  bodyPaid: string;
  bodyStyle: 'photo_journal' | 'classic';
  photoEntries: PhotoEntry[];
  tags: string[];
  /** SEO ヒントの粒度を articleType ごとに変えるための拡張点 (現状は未使用) */
  articleType: 'spot_guide' | 'itinerary' | 'expat_info';
  coverImageUrl: string;
  city: CityOption | null;
}): SeoCheckResult[] {
  // 現状は articleType 別の差分ロジックは無いが、将来のために型に残しておく
  void input.articleType;
  const results: SeoCheckResult[] = [];

  // 1) タイトル長
  const titleLen = input.title.trim().length;
  if (titleLen === 0) {
    results.push({
      key: 'title-length',
      label: 'タイトル',
      severity: 'fail',
      detail: '未入力',
    });
  } else if (titleLen < 16) {
    results.push({
      key: 'title-length',
      label: 'タイトル',
      severity: 'warn',
      detail: `${titleLen} 字 — 16 字以上にすると検索に強くなります`,
    });
  } else if (titleLen > 60) {
    results.push({
      key: 'title-length',
      label: 'タイトル',
      severity: 'warn',
      detail: `${titleLen} 字 — 60 字を超えると検索結果で省略されます`,
    });
  } else if (titleLen > 40) {
    results.push({
      key: 'title-length',
      label: 'タイトル',
      severity: 'warn',
      detail: `${titleLen} 字 — 40 字以内が読みやすい目安`,
    });
  } else {
    results.push({
      key: 'title-length',
      label: 'タイトル',
      severity: 'ok',
      detail: `${titleLen} 字 — 良い長さです`,
    });
  }

  // 2) 本文長 ( photo_journal はキャプション合計で代用 )
  const totalBody =
    input.bodyStyle === 'photo_journal'
      ? input.photoEntries
          .map((p) => (p.caption ?? '').trim())
          .join('\n')
          .trim().length
      : (input.body.trim().length + input.bodyPaid.trim().length);
  if (totalBody < 100) {
    results.push({
      key: 'body-length',
      label: '本文ボリューム',
      severity: 'fail',
      detail: `${totalBody} 字 — 100 字未満です`,
    });
  } else if (totalBody < 800) {
    results.push({
      key: 'body-length',
      label: '本文ボリューム',
      severity: 'warn',
      detail: `${totalBody} 字 — 800 字以上が SEO の目安`,
    });
  } else if (totalBody > 3000) {
    results.push({
      key: 'body-length',
      label: '本文ボリューム',
      severity: 'warn',
      detail: `${totalBody} 字 — 3000 字を超えると離脱率が上がりがち`,
    });
  } else {
    results.push({
      key: 'body-length',
      label: '本文ボリューム',
      severity: 'ok',
      detail: `${totalBody} 字 — ちょうど良いボリュームです`,
    });
  }

  // 3) 都市名が本文 or タイトルに含まれている
  const haystack = [
    input.title,
    input.body,
    input.bodyPaid,
    ...input.photoEntries.map((p) => p.caption ?? ''),
  ]
    .join('\n')
    .toLowerCase();
  const cityHits: string[] = [];
  if (input.city?.nameJa && haystack.includes(input.city.nameJa.toLowerCase())) {
    cityHits.push(input.city.nameJa);
  }
  if (
    input.city?.nameEn &&
    haystack.includes(input.city.nameEn.toLowerCase())
  ) {
    cityHits.push(input.city.nameEn);
  }
  if (!input.city) {
    results.push({
      key: 'city-mention',
      label: '都市名の言及',
      severity: 'warn',
      detail: '都市が未選択です',
    });
  } else if (cityHits.length > 0) {
    results.push({
      key: 'city-mention',
      label: '都市名の言及',
      severity: 'ok',
      detail: `「${cityHits.join(' / ')}」が含まれています`,
    });
  } else {
    results.push({
      key: 'city-mention',
      label: '都市名の言及',
      severity: 'warn',
      detail: `「${input.city.nameJa}」が本文・タイトルに見当たりません`,
    });
  }

  // 4) カバー画像 ( SEO 観点で再掲 )
  if (input.coverImageUrl.trim()) {
    results.push({
      key: 'cover',
      label: 'カバー画像',
      severity: 'ok',
      detail: '設定済み — SNS シェア時のサムネに使われます',
    });
  } else {
    results.push({
      key: 'cover',
      label: 'カバー画像',
      severity: 'warn',
      detail: '未設定 — シェア時に画像なしになります',
    });
  }

  // 5) tags 1 つ以上
  if (input.tags.length === 0) {
    results.push({
      key: 'tags',
      label: 'タグ',
      severity: 'warn',
      detail: '1 つ以上設定すると関連記事に出やすくなります',
    });
  } else {
    results.push({
      key: 'tags',
      label: 'タグ',
      severity: 'ok',
      detail: `${input.tags.length} 個 — OK`,
    });
  }

  // 6) photo_journal なら写真 3 枚以上
  if (input.bodyStyle === 'photo_journal') {
    const photoCount = input.photoEntries.filter((p) => p.imageUrl).length;
    if (photoCount < 3) {
      results.push({
        key: 'photo-count',
        label: '写真の枚数',
        severity: 'warn',
        detail: `${photoCount} 枚 — フォト日記は 3 枚以上が魅力的です`,
      });
    } else {
      results.push({
        key: 'photo-count',
        label: '写真の枚数',
        severity: 'ok',
        detail: `${photoCount} 枚 — 十分です`,
      });
    }
  }

  return results;
}

function SeoChecklist(props: {
  title: string;
  body: string;
  bodyPaid: string;
  bodyStyle: 'photo_journal' | 'classic';
  photoEntries: PhotoEntry[];
  tags: string[];
  articleType: 'spot_guide' | 'itinerary' | 'expat_info';
  coverImageUrl: string;
  city: CityOption | null;
}) {
  const [open, setOpen] = useState(true);
  // 計算は入力が変わるたびに再評価
  const checks = useMemo(() => computeSeoChecks(props), [props]);
  const counts = useMemo(() => {
    let ok = 0;
    let warn = 0;
    let fail = 0;
    for (const c of checks) {
      if (c.severity === 'ok') ok++;
      else if (c.severity === 'warn') warn++;
      else fail++;
    }
    return { ok, warn, fail };
  }, [checks]);

  return (
    <section className="rounded-md bg-card ring-1 ring-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left sm:px-6"
        aria-expanded={open}
      >
        <div className="space-y-0.5">
          <h3 className="text-[14px] font-semibold tracking-tight">
            SEO チェック (品質向上の提案)
          </h3>
          <p className="text-[11px] text-foreground/55">
            合格 {counts.ok} / 警告 {counts.warn} / 要対応 {counts.fail}
            <span className="ml-2 text-foreground/40">
              ※ 警告があっても公開はブロックされません
            </span>
          </p>
        </div>
        <ChevronDown
          className={
            'h-4 w-4 shrink-0 text-foreground/55 transition ' +
            (open ? 'rotate-180' : '')
          }
        />
      </button>

      {open ? (
        <ul className="divide-y divide-border border-t border-border">
          {checks.map((c) => (
            <li
              key={c.key}
              className="flex items-start gap-3 px-4 py-2.5 sm:px-6"
            >
              <SeoBadge severity={c.severity} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-foreground/85">
                  {c.label}
                </p>
                <p className="text-[11px] text-foreground/60">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function SeoBadge({ severity }: { severity: SeoSeverity }) {
  if (severity === 'ok') {
    return (
      <span
        aria-label="合格"
        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
      >
        ✓
      </span>
    );
  }
  if (severity === 'warn') {
    return (
      <span
        aria-label="警告"
        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-warning-50 text-warning-700"
      >
        ⚠
      </span>
    );
  }
  return (
    <span
      aria-label="要対応"
      className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-danger-50 text-danger-500"
    >
      ✗
    </span>
  );
}

// =============================================================================
// プレビュー共有 link ( #18 )
//
// magic-link を発行 / 失効するだけのシンプルなセクション。
// token は server action 経由で uuid v4 を発行・保存する。
// =============================================================================
function SharePreviewSection({
  articleId,
  initialToken,
  initialExpiresAt,
}: {
  articleId: string;
  initialToken: string | null;
  initialExpiresAt: Date | null;
}) {
  const [token, setToken] = useState<string | null>(initialToken);
  const [expiresAt, setExpiresAt] = useState<Date | null>(
    initialExpiresAt ? new Date(initialExpiresAt) : null,
  );
  const [isGenerating, startGenerating] = useTransition();
  const [isRevoking, startRevoking] = useTransition();
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => {
    if (!token) return '';
    // SSR では window が無いので空文字に倒す
    if (typeof window === 'undefined') return `/preview/${token}`;
    return `${window.location.origin}/preview/${token}`;
  }, [token]);

  const isExpired = !!expiresAt && expiresAt.getTime() < Date.now();

  const handleGenerate = () => {
    startGenerating(async () => {
      const res = await generatePreviewToken(articleId);
      if (res.ok && res.data) {
        setToken(res.data.token);
        setExpiresAt(new Date(res.data.expiresAt));
        toast.success('共有リンクを発行しました');
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  };

  const handleRevoke = () => {
    if (
      !window.confirm(
        '共有リンクを無効化します。\nこの操作の後は、同じ URL でアクセスできなくなります。',
      )
    ) {
      return;
    }
    startRevoking(async () => {
      const res = await revokePreviewToken(articleId);
      if (res.ok) {
        setToken(null);
        setExpiresAt(null);
        toast.success('共有リンクを無効化しました');
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('リンクをコピーしました');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('コピーに失敗しました');
    }
  };

  return (
    <section className="space-y-3 rounded-md bg-card p-4 ring-1 ring-border sm:p-6">
      <header className="space-y-1">
        <h3 className="flex items-center gap-2 text-[14px] font-semibold tracking-tight">
          <Link2 className="h-4 w-4 text-primary-300" />
          プレビューを共有する
        </h3>
        <p className="text-[11px] text-foreground/55">
          公開前の記事を、編集者や友人に確認してもらえる magic-link を発行できます。
          リンクを知っている人なら誰でも全文 (有料部分含む) を閲覧できます。
        </p>
      </header>

      {token && !isExpired ? (
        <div className="space-y-2">
          <div className="flex items-stretch gap-1.5">
            <input
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="h-10 w-full min-w-0 rounded-md border border-border bg-background px-3 text-[12px] tabular text-foreground/85 focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  コピー済
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-4 w-4" />
                  リンクをコピー
                </>
              )}
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-foreground/55">
              有効期限: {expiresAt ? formatDateTime(expiresAt) : '無期限'}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating || isRevoking}
              >
                {isGenerating ? '再発行中…' : 'リンクを再発行'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRevoke}
                disabled={isGenerating || isRevoking}
              >
                <Link2Off className="mr-1 h-4 w-4" />
                {isRevoking ? '無効化中…' : 'リンクを無効化'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {token && isExpired ? (
            <p className="text-[11px] text-warning-700">
              前回のリンクは有効期限切れ ({expiresAt
                ? formatDateTime(expiresAt)
                : '不明'}
              ) です。新しいリンクを発行してください。
            </p>
          ) : null}
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            <Link2 className="mr-1 h-4 w-4" />
            {isGenerating ? '発行中…' : 'プレビューを共有 (14 日間有効)'}
          </Button>
        </div>
      )}
    </section>
  );
}

function formatDateTime(d: Date): string {
  return d.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
