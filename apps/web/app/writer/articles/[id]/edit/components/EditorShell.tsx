'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@locore/ui';
import { ModerationBanner } from '@/components/writer/ModerationBanner';
import { autoSaveArticle } from '@/app/writer/articles/[id]/edit/actions';
import { runMockModeration } from '@/lib/moderation/mock';
import { EditorHeader } from './EditorHeader';
import { BasicInfoSection, type BasicInfoValue } from './BasicInfoSection';
import { CoverImageSection } from './CoverImageSection';
import { BodyEditorSection } from './BodyEditorSection';
import { SpotsSection } from './SpotsSection';
import { VideosSection } from './VideosSection';
import { PreviewPane } from './PreviewPane';
import type { SpotRow } from '@/components/writer/SpotList';
import type { VideoRow } from '@/components/writer/VideoEmbedEditor';

/**
 * 単画面化された記事編集の統括コンポーネント。
 *
 * - 基本情報・本文は autoSave で 3 秒 debounce 保存
 * - スポットと動画は子コンポーネントの専用アクションで保存
 * - 公開申請の前提条件（タイトル、本文100字、スポット、カバー画像）を即時可視化
 * - サイドバイサイドプレビューは大画面でトグル
 * - mock モデレーションを 5 秒 debounce で再計算してスコア表示
 */

type ArticleInitial = {
  id: string;
  title: string;
  body: string;
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

  const [basic, setBasic] = useState<BasicInfoValue>({
    title: article.title,
    priceJpy: article.priceJpy,
    durationType: article.durationType ?? '',
    articleType: article.articleType,
    tagsText: (article.tags ?? []).join(', '),
    cityId: article.cityId,
  });
  const [body, setBody] = useState(article.body);
  const [coverImageUrl, setCoverImageUrl] = useState(article.coverImageUrl ?? '');

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const [showPreview, setShowPreview] = useState(false);

  // 公開申請の前提条件
  const tags = useMemo(
    () =>
      basic.tagsText
        .split(/[,、\n]/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
    [basic.tagsText],
  );

  const missing = useMemo(() => {
    const m: string[] = [];
    if (!basic.title.trim()) m.push('タイトル');
    if (body.trim().length < 100) m.push('本文 100 字以上');
    if (spots.length === 0) m.push('スポット 1 件以上');
    if (!coverImageUrl.trim()) m.push('カバー画像');
    return m;
  }, [basic.title, body, spots.length, coverImageUrl]);

  // モデレーションスコア（事前表示用）
  const [modScore, setModScore] = useState<{ finalScore: number; action: string } | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      const r = runMockModeration({ title: basic.title, body, tags });
      setModScore({ finalScore: r.finalScore, action: r.action });
    }, 800);
    return () => clearTimeout(t);
  }, [basic.title, body, tags]);

  // 自動保存（基本情報 + 本文 + カバー画像）3 秒 debounce
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setSaveState('saving');
    const handle = setTimeout(async () => {
      const res = await autoSaveArticle({
        id: article.id,
        title: basic.title || undefined,
        body,
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
  }, [basic, body, coverImageUrl, tags]);

  // 「保存済み」表示の経過時間を 10 秒ごとに再描画したいので軽く再レンダー
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-6">
      <EditorHeader
        articleId={article.id}
        title={basic.title}
        status={article.status}
        bodyLength={body.length}
        updatedAt={article.updatedAt}
        saveState={saveState}
        lastSavedAt={lastSavedAt}
        missing={missing}
      />

      <ModerationBanner
        finalScore={article.moderationScore}
        warned={article.warned}
        status={article.status}
      />

      {modScore ? (
        <div
          className={
            'flex flex-wrap items-center gap-3 rounded-md border px-4 py-3 text-[12px] ' +
            (modScore.action === 'held'
              ? 'border-warning-700 bg-warning-50 text-warning-700'
              : modScore.action === 'warned'
                ? 'border-warning-500 bg-warning-50 text-warning-700'
                : 'border-border bg-card text-foreground/60')
          }
        >
          <span className="font-medium">事前モデレーション</span>
          <span>映え過剰度: {modScore.finalScore} / 100</span>
          <span className="text-[11px] opacity-70">
            （85+ 編集者ホールド／70+ 警告／その他はそのまま公開）
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
          <BasicInfoSection value={basic} onChange={setBasic} cities={cities} tier={tier} />
          <CoverImageSection value={coverImageUrl} onChange={setCoverImageUrl} isPublished={isPublished} />
          <BodyEditorSection value={body} onChange={setBody} />
          <SpotsSection
            articleId={article.id}
            initial={spots}
            googleMapsApiKey={googleMapsApiKey}
          />
          <VideosSection articleId={article.id} initial={videos} />
        </div>

        {showPreview ? (
          <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
            <PreviewPane
              title={basic.title}
              body={body}
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
