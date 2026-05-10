'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@locore/ui';
import { ModerationBanner } from '@/components/writer/ModerationBanner';
import {
  autoSaveArticle,
  saveDraftArticle,
} from '@/app/writer/articles/[id]/edit/actions';
import { runMockModeration } from '@/lib/moderation/mock';
import { EditorHeader } from './EditorHeader';
import { BasicInfoSection, type BasicInfoValue } from './BasicInfoSection';
import { CoverImageSection } from './CoverImageSection';
import { TitleBodySection } from './TitleBodySection';
import {
  ItineraryBlocksEditor,
  type ItineraryBlock,
} from './ItineraryBlocksEditor';
import { SpotsSection } from './SpotsSection';
import { VideosSection } from './VideosSection';
import { PreviewPane } from './PreviewPane';
import type { SpotRow } from '@/components/writer/SpotList';
import type { VideoRow } from '@/components/writer/VideoEmbedEditor';

/**
 * 単画面化された記事編集の統括コンポーネント。
 *
 * - タイトル + 本文（無料 / 有料）は TitleBodySection に統合
 * - メタ情報（種別 / 価格 / 都市 / タグ / 所要時間）は BasicInfoSection
 * - 旅程プラン（articleType='itinerary'）の場合は ItineraryBlocksEditor を表示
 * - 自動保存 3 秒 debounce + 「下書きを保存」即時保存
 */

type ArticleInitial = {
  id: string;
  title: string;
  body: string;
  bodyPaid: string | null;
  itineraryBlocks: ItineraryBlock[] | null;
  priceJpy: number;
  durationType: 'half_day' | 'full_day' | 'few_hours' | 'other' | null;
  articleType: 'spot_guide' | 'itinerary';
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

export function EditorShell({ article, spots, videos, cities, tier, googleMapsApiKey }: Props) {
  const isPublished = article.status === 'published';

  // タイトルと本文は別 state（TitleBodySection が両方扱う）
  const [title, setTitle] = useState(article.title);
  const [body, setBody] = useState(article.body);
  const [bodyPaid, setBodyPaid] = useState(article.bodyPaid ?? '');

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

  // SpotsSection は内部状態を持つので参照だけ受け渡し（旅程ブロックの選択肢に使う）
  // 実際の rows の足し引きは SpotsSection 内部で行うため、ここでは初期値を保持してドロップダウン候補に
  const [spotsForDropdown, setSpotsForDropdown] = useState<SpotRow[]>(spots);

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const tags = useMemo(
    () =>
      basic.tagsText
        .split(/[,、\n]/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
    [basic.tagsText],
  );

  const totalBodyLength = body.trim().length + bodyPaid.trim().length;

  const missing = useMemo(() => {
    const m: string[] = [];
    if (!title.trim()) m.push('タイトル');
    if (totalBodyLength < 100) m.push('本文 100 字以上');
    if (spotsForDropdown.length === 0) m.push('スポット 1 件以上');
    if (!coverImageUrl.trim()) m.push('カバー画像');
    if (basic.articleType === 'itinerary' && itineraryBlocks.length < 2) {
      m.push('旅程ブロック 2 件以上');
    }
    return m;
  }, [
    title,
    totalBodyLength,
    spotsForDropdown.length,
    coverImageUrl,
    basic.articleType,
    itineraryBlocks.length,
  ]);

  // モデレーション
  const [modScore, setModScore] = useState<{ finalScore: number; action: string } | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      const r = runMockModeration({
        title,
        body: body + '\n\n' + bodyPaid,
        tags,
      });
      setModScore({ finalScore: r.finalScore, action: r.action });
    }, 800);
    return () => clearTimeout(t);
  }, [title, body, bodyPaid, tags]);

  // 自動保存（タイトル含めて全項目）
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // タイトルが空なら保存しない（書き始めるまで何も起きない仕様）
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
        itineraryBlocks:
          basic.articleType === 'itinerary' ? itineraryBlocks : null,
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
  }, [title, basic, body, bodyPaid, coverImageUrl, tags, itineraryBlocks]);

  // 「保存済み」表示の経過時間を 10 秒ごとに再描画
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 10000);
    return () => clearInterval(id);
  }, []);

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
        itineraryBlocks:
          basic.articleType === 'itinerary' ? itineraryBlocks : null,
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
        toast.success('下書きを保存しました');
      } else {
        setSaveState('error');
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      <EditorHeader
        articleId={article.id}
        title={title}
        status={article.status}
        bodyLength={totalBodyLength}
        updatedAt={article.updatedAt}
        saveState={saveState}
        lastSavedAt={lastSavedAt}
        missing={missing}
        onSaveDraft={handleSaveDraft}
        isSavingDraft={isSavingDraft}
      />

      <ModerationBanner
        finalScore={article.moderationScore}
        warned={article.warned}
        status={article.status}
      />

      {modScore && (modScore.action === 'warned' || modScore.action === 'held') ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-warning-500 bg-warning-50 px-4 py-3 text-[12px] text-warning-700">
          <span className="font-medium">事前モデレーション</span>
          <span>映え過剰度: {modScore.finalScore} / 100</span>
          <span className="text-[11px] opacity-70">
            観光客向けに寄り過ぎてないか、独自視点を確認してください
          </span>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowPreview((v) => !v)}
          aria-pressed={showPreview}
        >
          {showPreview ? 'プレビューを閉じる' : 'プレビューを表示'}
        </Button>
      </div>

      <div className={showPreview ? 'grid gap-6 lg:grid-cols-[1fr_minmax(280px,360px)]' : ''}>
        <div className="space-y-6">
          {/* タイトル + 本文（無料 / 有料）— 統合表示 */}
          <TitleBodySection
            title={title}
            bodyFree={body}
            bodyPaid={bodyPaid}
            onChangeTitle={setTitle}
            onChangeBodyFree={setBody}
            onChangeBodyPaid={setBodyPaid}
          />

          {/* 旅程プランのときだけ表示 */}
          {basic.articleType === 'itinerary' ? (
            <ItineraryBlocksEditor
              blocks={itineraryBlocks}
              onChange={setItineraryBlocks}
              spots={spotsForDropdown}
            />
          ) : null}

          {/* メタ情報（種別 / 価格 / 都市 / タグ / 所要時間） */}
          <BasicInfoSection value={basic} onChange={setBasic} cities={cities} tier={tier} />

          <CoverImageSection
            value={coverImageUrl}
            onChange={setCoverImageUrl}
            isPublished={isPublished}
          />

          <SpotsSection
            articleId={article.id}
            initial={spots}
            googleMapsApiKey={googleMapsApiKey}
            onSpotsChange={setSpotsForDropdown}
          />

          <VideosSection articleId={article.id} initial={videos} />
        </div>

        {showPreview ? (
          <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
            <PreviewPane
              title={title}
              body={body + (bodyPaid ? '\n\n' + bodyPaid : '')}
              coverImageUrl={coverImageUrl}
              priceJpy={basic.priceJpy}
              tags={tags}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
