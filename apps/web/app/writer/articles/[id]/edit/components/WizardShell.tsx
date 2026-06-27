'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@locore/ui';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
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
import { TagsInput } from './TagsInput';
import type { PhotoEntry } from '@/lib/mock/types';
import type { SpotRow } from '@/components/writer/SpotList';
import {
  joinBodyWithPaywall,
  splitBodyByPaywall,
} from '@/lib/editor/paywallMarker';

/**
 * 記事編集のステップ式ウィザード（Substack 風）。
 *
 * 2026-05 MOC 前改修 (#1 / #3):
 *   ステップ順を articleType ごとに動的に組み立てる。
 *
 *   - 旅程プラン (itinerary):
 *       カテゴリ → 旅程 → スポット → 写真 → タイトル+本文 → 公開
 *       (旅行者の組み立て順に揃え、まず「どこへ行くか」より「どんなルートか」を
 *        書き始められるようにする)
 *
 *   - スポット紹介 (spot_guide):
 *       カテゴリ → スポット → 写真 → タイトル+本文 → 公開
 *
 *   - その他 (expat_info):
 *       カテゴリ → 写真 → タイトル+本文 → 公開 (スポット step なし)
 *
 *   Step 「タイトル+本文」は RichTextEditor (slash command 対応) のみ。
 *   写真編集や旅程編集 UI は出さない (前段で完結する)。
 *
 * 共通:
 *   - 自動保存は撤去済み。「下書き保存」ボタン押下時 + 「次へ」遷移時のみ DB 保存
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
  /**
   * #5 (2026-05): SNS 動画埋め込みセクションは撤去。本文中 `/video` で
   * YouTube を埋め込む経路に統合した。プロパティは page.tsx 互換のため
   * シグネチャに残すが、UI には描画しない。
   */
  videos?: unknown;
  cities: CityOption[];
  tier: 'S' | 'A' | 'B';
  googleMapsApiKey?: string;
};

/**
 * #1 / #3 Step 再設計（2026-05 MOC 前改修）。
 *
 * articleType ごとにステップを動的に組み立てる。Step 0 (カテゴリ選択) は前後
 * ナビゲーション対象外で、選択完了で自動的に 1 へ抜ける。
 *
 * - itinerary (旅程プラン): category → spots → itinerary → photos → titleBody → publish
 * - spot_guide (スポット紹介): category → spots → photos → titleBody → publish
 * - expat_info (その他):    category → photos → titleBody → publish
 *
 * Step 4 (titleBody) は「タイトル入力 + RichTextEditor 本文」のみを表示する。
 * 写真追加 UI や旅程編集 UI は出さない（既に前ステップで完結している）。
 * `/` メニュー（slash command）は RichTextEditor 側で利用可能。
 *
 * Step 0 は「真に新しい記事 (タイトル=='新しい記事' && コンテンツ未着手)」のときだけ
 * 初期表示する。既に書き始めた記事の編集では Step 1 から始まる。
 */
type StepKind =
  | 'category'
  | 'spots'
  | 'itinerary'
  | 'photos'
  | 'titleBody'
  | 'publish';

export function WizardShell({
  article,
  spots,
  videos: _videos,
  cities,
  tier: _tier,
  googleMapsApiKey,
}: Props) {
  // tier は将来の手数料率表示用。現状は未使用なので参照だけ
  void _tier;
  // #5: videos は撤去済み。シグネチャ互換のため受け取るだけで未使用
  void _videos;

  // 真に「これから書き始める」記事かどうか
  const isPristine =
    (article.title === '新しい記事' || article.title === '') &&
    (article.body ?? '').trim() === '' &&
    (article.photoEntries?.length ?? 0) === 0 &&
    spots.length === 0;
  // Phase C: 新規記事はカテゴリ選択（2 択）から、既存記事は入口区分に応じた 1 ステップ目から。
  //  - モデルコース (itinerary): 'itinerary'（旧来どおり、先に旅程を見せる）
  //  - ブログ (非 itinerary):    'spots'（スポットは任意だが、最初のステップは共通で spots）
  const [step, setStep] = useState<StepKind>(
    isPristine
      ? 'category'
      : article.articleType === 'itinerary'
        ? 'itinerary'
        : 'spots',
  );

  // 共通 state
  const [title, setTitle] = useState(article.title);
  /**
   * Phase C: 本文は「無料 + ペイウォール境界 + 有料」を 1 本にまとめた combined HTML
   * として編集する。保存時に splitBodyByPaywall で body / bodyPaid に分割する。
   * 読み込み時は joinBodyWithPaywall で既存の body / body_paid を結合して復元する。
   */
  const [combinedBody, setCombinedBody] = useState<string>(() =>
    joinBodyWithPaywall(article.body, article.bodyPaid ?? ''),
  );
  // combined を境界で分割した派生値（snapshot / 保存 / モデレーション用）
  const { free: body, paid: bodyPaid } = useMemo(
    () => splitBodyByPaywall(combinedBody),
    [combinedBody],
  );
  // #4 改修 (2026-05): 新規記事のデフォルトは 'classic'。
  // ここで既存記事の bodyStyle はそのまま尊重するので、過去に 'photo_journal'
  // として書かれた記事は引き続き photo_journal として編集される（互換性維持）。
  // 新規はカテゴリ選択画面の直後に Step 1 へ抜け、bodyStyle 選択 UI は撤去されている。
  const [bodyStyle, setBodyStyle] = useState<'photo_journal' | 'classic'>(
    article.bodyStyle ?? 'classic',
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

  /**
   * #4 改修: スポット追加時に「写真の場所」と「旅程ブロックの場所」を自動で
   * 1 件目のスポットに紐付ける。ユーザーは後から上書き可能。
   * - PhotoEntry.locationName が空のものに、最初のスポット名を入れる
   * - ItineraryBlock.spotId が空のものに、対応するスポット id を順番に入れる
   */
  const seedSpotIntoPhotosAndItinerary = (next: SpotRow[]) => {
    if (next.length === 0) return;
    // 写真エントリ: 場所名が空のものに 1 件目のスポット名 + spotId を入れる。
    // #3 改修で「場所」はスポット選択ドロップダウンになったので spotId も同時に
    // 入れておき、初期状態でドロップダウンが正しく選択された状態になるようにする。
    const firstSpot = next[0]!;
    setPhotoEntries((prev) => {
      if (prev.length === 0) return prev;
      let touched = false;
      const out = prev.map((e) => {
        if (!e.locationName || e.locationName.trim() === '') {
          touched = true;
          return { ...e, locationName: firstSpot.name, spotId: firstSpot.id };
        }
        return e;
      });
      return touched ? out : prev;
    });
    // 旅程ブロック: 空きスロットに順番にスポット id を充填
    setItineraryBlocks((prev) => {
      if (prev.length === 0) return prev;
      let touched = false;
      const taken = new Set(prev.map((b) => b.spotId).filter(Boolean));
      const candidates = next.map((s) => s.id).filter((id) => !taken.has(id));
      let ci = 0;
      const out = prev.map((b) => {
        if (b.spotId) return b;
        const sid = candidates[ci++];
        if (!sid) return b;
        touched = true;
        return { ...b, spotId: sid };
      });
      return touched ? out : prev;
    });
  };

  const handleSpotsChange = (next: SpotRow[]) => {
    // 新規スポットが増えたタイミングで auto-seed
    if (next.length > spotsForDropdown.length) {
      seedSpotIntoPhotosAndItinerary(next);
    }
    setSpotsForDropdown(next);
  };

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
      // #4: 新規記事は 'classic' 既定（既存記事は DB 値を尊重）
      const initBodyStyle = article.bodyStyle ?? 'classic';
      // Phase C: combinedBody と同じ join→split 正規化を通して初期 body/bodyPaid を作る。
      // これを通さないと trim 差分で「開いた瞬間に未保存」になってしまう。
      const initSplit = splitBodyByPaywall(
        joinBodyWithPaywall(article.body, article.bodyPaid ?? ''),
      );
      return makeSnapshot({
        title: article.title,
        body: initSplit.free,
        bodyPaid: initSplit.paid,
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
        // #4 改修: bodyStyle に関わらず photoEntries を保存対象にしたので、
        // 初期スナップショットも常に DB 値を採用する（dirty 誤検知防止）
        photoEntries: article.photoEntries ?? [],
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
   * Phase C: 入口 2 択のうち「ブログ」= itinerary 以外（spot_guide / expat_info /
   * 旧 photo_journal）。ブログではスポット登録は任意（足せば place-guide 表示・
   * 足さなければ essay 表示に classify.ts が自動分岐する）。モデルコースのみスポット必須。
   */
  const isBlog = !isItinerary;

  /**
   * #1 / #3: ステップ順を articleType に応じて動的に算出する。
   * 'category' は前後ナビゲーション対象外（カテゴリを選ぶと自動で次へ抜ける）。
   *
   * - itinerary (旅程プラン): spots → itinerary → photos → titleBody → publish
   *   旅程ブロックでスポットを参照するため、先にスポット登録 → 次に旅程組み立ての順とする。
   * - spot_guide (スポット紹介): spots → photos → titleBody → publish
   * - expat_info (その他):    photos → titleBody → publish
   */
  // Phase C: 入口が「モデルコース / ブログ」の 2 択になったため、ステップ順も 2 分岐に。
  //  - モデルコース (itinerary): spots → itinerary → photos → titleBody → publish
  //  - ブログ (非 itinerary):    spots → photos → titleBody → publish
  // ブログでもスポット step は表示するが、スポット登録は任意（足せば place-guide 表示になる）。
  const stepSequence: StepKind[] = useMemo(
    () =>
      isItinerary
        ? ['spots', 'itinerary', 'photos', 'titleBody', 'publish']
        : ['spots', 'photos', 'titleBody', 'publish'],
    [isItinerary],
  );
  const totalSteps = stepSequence.length;
  const currentStepIdx = Math.max(0, stepSequence.indexOf(step));
  // 表示用の連番 (1-based)。'category' のときは 0 を返して非表示扱いにする。
  const visibleStepIndex = step === 'category' ? 0 : currentStepIdx + 1;

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
        // #4 改修 (2026-05): classic でも Step 2 のフォト日記セクションで写真を
        // 追加できるので、bodyStyle に関わらず photoEntries を保存対象に含める。
        photoEntries,
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
          // #4 改修: classic でも Step 2 で追加した写真を保存する
          photoEntries,
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
  // Phase C: スポット必須はモデルコース (itinerary) のみ。ブログは任意。
  if (isItinerary && spotsForDropdown.length === 0)
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
   *
   * #3 改修: ステップ key 化に伴い、stepSequence に存在する key だけにジャンプする
   * （expat_info にはスポット step が無いなど、articleType により対象が変わる）。
   */
  const jumpToMissing = (item: string) => {
    const goStep = (s: StepKind, anchor?: string) => {
      // articleType で当該 step が存在しない場合は安全側にフォールバック
      const target = stepSequence.includes(s) ? s : stepSequence[0]!;
      setStep(target);
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
      goStep('titleBody', 'wz-title');
    } else if (item === '本文 100 字以上') {
      goStep('titleBody');
    } else if (item === '写真 1 枚以上') {
      goStep('photos');
    } else if (item === 'スポット 1 件以上') {
      goStep('spots');
    } else if (item === '旅程ブロック 2 件以上') {
      goStep('itinerary');
    } else if (item === 'カバー画像') {
      goStep('publish', 'wz-cover-anchor');
    } else {
      // 価格 / 都市 / 等の publish 系
      goStep('publish');
    }
  };

  /**
   * 「次へ」で下書き保存 → 成功時のみ次のステップへ進む。
   * 失敗時は toast でエラーを出してステップは移動しない。
   */
  const goNext = () => {
    // 'category' は専用ハンドラから呼び出される想定。
    // 念のためここでも先頭ステップへ遷移できるようガードする。
    if (step === 'category') {
      setStep(stepSequence[0]!);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const idx = stepSequence.indexOf(step);
    if (idx < 0 || idx >= stepSequence.length - 1) return;
    const next = stepSequence[idx + 1]!;

    if (!isDirty) {
      setStep(next);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    void handleSaveDraft(true).then((ok) => {
      if (!ok) return; // toast はすでに出ている
      setStep(next);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };
  const goPrev = () => {
    if (!maybeConfirmDirty()) return;
    if (step === 'category') return;
    const idx = stepSequence.indexOf(step);
    if (idx > 0) {
      setStep(stepSequence[idx - 1]!);
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

      {step !== 'category' ? (
        <StepProgress
          current={visibleStepIndex}
          total={totalSteps}
          sequence={stepSequence}
          stepNumberOffset={isItinerary ? 1 : 0}
        />
      ) : null}

      {/* 入口 2 択（Phase C: モデルコース / ブログ） */}
      {step === 'category' ? (
        <Step0CategorySelect
          value={basic.articleType}
          onSelect={(t) => {
            setBasic({ ...basic, articleType: t });
            // 選択した入口の先頭ステップへ抜ける（どちらも spots 始まり）
            const nextSeq: StepKind[] =
              t === 'itinerary'
                ? ['spots', 'itinerary', 'photos', 'titleBody', 'publish']
                : ['spots', 'photos', 'titleBody', 'publish'];
            setStep(nextSeq[0]!);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      ) : null}

      {/* スポット追加 */}
      {step === 'spots' ? (
        <Step1Spots
          articleId={article.id}
          initial={spots}
          googleMapsApiKey={googleMapsApiKey}
          onChange={handleSpotsChange}
          isOptional={isBlog}
          stepNumber={currentStepIdx + 1}
        />
      ) : null}

      {/* 旅程ブロック（itinerary のみ） */}
      {step === 'itinerary' && isItinerary ? (
        <StepItinerary
          blocks={itineraryBlocks}
          onChange={setItineraryBlocks}
          spots={spotsForDropdown}
          googleMapsApiKey={googleMapsApiKey}
          stepNumber={currentStepIdx + 1}
        />
      ) : null}

      {/* 写真追加（省略可） */}
      {step === 'photos' ? (
        <Step2Photos
          photoEntries={photoEntries}
          onChangePhotoEntries={setPhotoEntries}
          spots={spotsForDropdown}
          onSkip={() => {
            // 「あとで」: goNext と同じく下書き保存後に次のステップへ
            goNext();
          }}
          stepNumber={currentStepIdx + 1}
        />
      ) : null}

      {/* タイトル + 本文（#3: 写真や旅程の編集 UI は出さない） */}
      {step === 'titleBody' ? (
        <Step4TitleBody
          title={title}
          onChangeTitle={setTitle}
          body={combinedBody}
          onChangeBody={setCombinedBody}
          stepNumber={currentStepIdx + 1}
        />
      ) : null}

      {step === 'publish' ? (
        <Step4Publish
          basic={basic}
          onChangeBasic={setBasic}
          cities={cities}
          coverImageUrl={coverImageUrl}
          onChangeCover={setCoverImageUrl}
          articleId={article.id}
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

      {/* ナビゲーションフッタ — カテゴリ選択画面では非表示 */}
      {step !== 'category' ? (
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
            disabled={stepSequence.indexOf(step) === 0}
          >
            <ArrowLeft className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">戻る</span>
          </Button>

          <p className="text-[10px] text-foreground/55 sm:text-[11px]">
            {visibleStepIndex} / {totalSteps}
            {isSavingDraft ? (
              <span className="ml-2 text-primary-300">保存しています…</span>
            ) : null}
          </p>

          {step === 'publish' ? (
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
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={goNext}
              disabled={isSavingDraft}
            >
              <span className="hidden sm:inline">
                {isSavingDraft ? '保存中…' : '次へ'}
              </span>
              <ArrowRight className="h-4 w-4 sm:ml-1" />
            </Button>
          )}
        </nav>
      ) : null}

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
/**
 * #1 / #3: 新ステップ順 (2026-05 MOC 前改修)。stepSequence が articleType ごとに
 * 動的に変わるので、ここでは渡された sequence の key 列だけを描画する。
 *
 * 共通の表示名マップ:
 *  - itinerary  → 旅程
 *  - spots      → スポット
 *  - photos     → 写真
 *  - titleBody  → タイトル + 本文
 *  - publish    → 公開準備
 */
const STEP_LABEL_MAP: Record<StepKind, string> = {
  category: 'カテゴリ',
  itinerary: '旅程',
  spots: 'スポット',
  photos: '写真',
  titleBody: 'タイトル + 本文',
  publish: '公開準備',
};

function StepProgress({
  current,
  total,
  sequence,
}: {
  /** 現在の連番 (1-based) */
  current: number;
  total: number;
  /** stepSequence そのもの。category 以外の key 列を順に表示する。 */
  sequence: StepKind[];
  /** 互換のため不要オプションだが現状未使用。将来 itinerary とそれ以外で番号を揃えるとき用。 */
  stepNumberOffset?: number;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-[0.05em]">
      {sequence.map((kind, i) => {
        const n = i + 1;
        const on = n === current;
        const done = n < current;
        return (
          <li key={kind} className="flex items-center gap-2">
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
              <span className="text-[11px]">{STEP_LABEL_MAP[kind]}</span>
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
// Step 4: タイトル + 本文専用エディタ (#3 改修, 2026-05 MOC 前)
//
// ユーザー指摘:
//   「Editorial ページが死んだ。3 写真までは完璧。4 は 3 で編集した内容を表示する
//    必要はない。タイトルと本文を書くスペース。ここで / とかで編集できる
//    エディタを表示する。」
//
// 仕様:
//   - タイトル入力欄 (大きい)
//   - 本文 RichTextEditor は 1 本（Phase C で無料/有料の 2 段エディタを廃止）。
//     本文中の「ここから下を有料に」境界（/paid・ボタン）で無料/有料を分ける。
//     保存時に WizardShell が splitBodyByPaywall で body / body_paid に振り分ける。
//   - 写真や旅程の編集 UI は出さない (既に前ステップで済んでいる)
//   - bodyStyle='photo_journal' の旧記事も、ここでは本文エディタとして編集できる
//     ( 写真キャプションは「写真」ステップ側で編集する )
// =============================================================================

function Step4TitleBody({
  title,
  onChangeTitle,
  body,
  onChangeBody,
  stepNumber,
}: {
  title: string;
  onChangeTitle: (v: string) => void;
  /** 無料 + 境界 + 有料 を 1 本にまとめた combined HTML */
  body: string;
  onChangeBody: (v: string) => void;
  /** StepProgress と揃えた表示用ステップ番号 */
  stepNumber: number;
}) {
  return (
    // 2026-05 Notion ライク改修: スマホで縦長になりすぎないよう、外側余白を圧縮
    <div className="space-y-3 sm:space-y-6">
      <header className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary-300 sm:text-[11px]">
          ステップ {stepNumber}
        </p>
        <h2 className="text-[18px] font-bold tracking-tight sm:text-[22px]">
          タイトルと本文
        </h2>
        <p className="hidden text-[12px] text-foreground/65 sm:block">
          スポット・写真を踏まえて、タイトルと本文を仕上げます。本文中で
          <kbd className="mx-1 rounded-sm border border-border bg-muted px-1 text-[10px]">/</kbd>
          を打つと、見出し・画像・YouTube・スポットカードなどの挿入メニューが開きます。
        </p>
      </header>

      {/* タイトル */}
      <section className="space-y-3 rounded-md bg-card p-2 ring-1 ring-border sm:space-y-4 sm:p-6">
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
            className="h-11 w-full rounded-md border border-border bg-background px-3 text-[17px] font-bold tracking-tight focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none sm:h-14 sm:text-[22px]"
          />
        </div>
      </section>

      {/* 本文エディタ (1 本の RichTextEditor。/paid で有料境界を挿入できる) */}
      <TitleBodySection body={body} onChangeBody={onChangeBody} />
    </div>
  );
}

// =============================================================================
// Step 1: スポット一覧の確認・追加（新ステップ順 #4）
// =============================================================================
function Step1Spots({
  articleId,
  initial,
  googleMapsApiKey,
  onChange,
  isOptional = false,
  stepNumber,
}: {
  articleId: string;
  initial: SpotRow[];
  googleMapsApiKey?: string;
  onChange: (next: SpotRow[]) => void;
  /** ブログ記事のときに true。「任意」表示に切り替える */
  isOptional?: boolean;
  /** StepProgress と揃えた表示用ステップ番号 */
  stepNumber: number;
}) {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
          ステップ {stepNumber}
        </p>
        <h2
          className="text-[22px] font-bold tracking-tight"
        >
          {isOptional
            ? 'スポットを追加する (任意)'
            : 'まず、紹介する場所を決める'}
        </h2>
        <p className="text-[12px] text-foreground/65">
          {isOptional
            ? 'ブログではスポットの登録は任意です。スポットを 1 つでも追加すると、記事末尾に地図とスポット一覧が付く「場所紹介」レイアウトに自動で切り替わります。追加しなければ文章主体の読み物として表示されます。'
            : '記事で紹介する場所をここで登録します。1 件目に追加したスポットは、写真・旅程ブロックの場所欄にも自動で入ります。'}
        </p>
      </header>

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
// 旅程ブロック (itinerary のみ・#1 新ステップ順では先頭に来る)
// =============================================================================
function StepItinerary({
  blocks,
  onChange,
  spots,
  googleMapsApiKey,
  stepNumber,
}: {
  blocks: ItineraryBlock[];
  onChange: (next: ItineraryBlock[]) => void;
  spots: SpotRow[];
  googleMapsApiKey?: string;
  /** StepProgress と揃えた表示用ステップ番号 */
  stepNumber: number;
}) {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
          ステップ {stepNumber}
        </p>
        <h2
          className="text-[22px] font-bold tracking-tight"
        >
          旅程を組み立てる
        </h2>
        <p className="text-[12px] text-foreground/65">
          スポットの順序、開始時刻、スポット間の移動手段と時間を入力します。
          まだスポットが未登録でもブロックは作れます（次のステップでスポットを紐付けます）。
          新しいブロックは <span className="font-semibold">前のブロックの 1 時間後</span> から始まります。
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
// 入口 2 択（Phase C: モデルコース / ブログ）
// =============================================================================
/**
 * 書き手が最初に選ぶのは「モデルコース」「ブログ」の 2 つだけ（docs/editor-spec.md §1）。
 *
 * 内部マッピング（DB の article_type enum は非変更）:
 *   - モデルコース → article_type='itinerary'
 *   - ブログ       → article_type='spot_guide'（新規ブログのデフォルト）
 *
 * 既存記事の復元は呼び出し側の `value` で行う。value が 'itinerary' ならモデルコース、
 * それ以外（spot_guide / expat_info / 旧 photo_journal は page.tsx で spot_guide に
 * 正規化済み）ならブログがハイライトされる。
 *
 * place-guide / essay の出し分けは表示側 classify.ts がスポット有無で自動判定するため、
 * 書き手はここで意識しない。
 */
function Step0CategorySelect({
  value,
  onSelect,
}: {
  value: 'spot_guide' | 'itinerary' | 'expat_info';
  onSelect: (t: 'spot_guide' | 'itinerary' | 'expat_info') => void;
}) {
  // 入口 2 択。ブログは spot_guide にマップ（既存 expat_info もブログ側に寄せる）。
  const options: Array<{
    /** 選択時にセットする article_type */
    type: 'itinerary' | 'spot_guide';
    /** この選択肢がハイライトされる判定 */
    selected: boolean;
    label: string;
    desc: string;
    recommended?: boolean;
  }> = [
    {
      type: 'itinerary',
      selected: value === 'itinerary',
      label: 'モデルコース',
      desc: '半日 / 1 日の歩き方ルート。\nスポットを順番に巡る、時間軸つきの記事。',
      recommended: true,
    },
    {
      type: 'spot_guide',
      selected: value !== 'itinerary',
      label: 'ブログ',
      desc: 'お店紹介でも読み物でも OK。\nスポットを足すと地図つきの「場所紹介」に、\n足さなければ文章主体の「読み物」に自動で整います。',
    },
  ];
  return (
    <div className="space-y-4 sm:space-y-6">
      <header className="space-y-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
          記事の入口
        </p>
        <h2 className="text-[22px] font-bold tracking-tight">
          どちらで書きますか？
        </h2>
        <p className="text-[12px] text-foreground/65">
          選ぶのは 2 つだけ。あとから変更もできます。表示レイアウトはスポットの有無から自動で決まるので、細かい種類は気にしなくて大丈夫です。
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((opt) => {
          const on = opt.selected;
          return (
            <button
              key={opt.type}
              type="button"
              onClick={() => onSelect(opt.type)}
              className={
                'group relative flex h-full flex-col items-start gap-2 rounded-lg border p-5 text-left transition hover:border-primary-500 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ' +
                (on
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-border bg-card')
              }
            >
              {opt.recommended ? (
                <span className="absolute -top-2 right-3 inline-flex items-center gap-1 rounded-full bg-warning-500 px-2 py-0.5 text-[10px] font-bold text-neutral-950 shadow-sm">
                  <span aria-hidden>⭐</span>
                  おすすめ
                </span>
              ) : null}
              <span className="text-[16px] font-bold text-foreground">
                {opt.label}
              </span>
              <span className="whitespace-pre-line text-[12px] leading-relaxed text-foreground/65">
                {opt.desc}
              </span>
              <span className="mt-auto pt-2 text-[11px] font-semibold text-primary-300 underline-offset-4 group-hover:underline">
                これで始める →
              </span>
            </button>
          );
        })}
      </div>

      <p className="rounded-md bg-muted px-3 py-2 text-[11px] text-foreground/55">
        ヒント: モデルコース (⭐) はスポットの並び順 + 時間軸 + 移動手段がセットの記事で、読者の体験が組み立てやすく一番人気です。ブログはまず文章から気軽に始められます。
      </p>
    </div>
  );
}

// =============================================================================
// Step 2: 写真追加（省略可・新ステップ #4）
// =============================================================================
function Step2Photos({
  photoEntries,
  onChangePhotoEntries,
  spots,
  onSkip,
  stepNumber,
}: {
  photoEntries: PhotoEntry[];
  onChangePhotoEntries: (v: PhotoEntry[]) => void;
  /** PhotoJournalSection の場所ドロップダウンに渡すスポット候補 (#3) */
  spots: SpotRow[];
  onSkip: () => void;
  /** StepProgress と揃えた表示用ステップ番号 */
  stepNumber: number;
}) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <header className="space-y-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
          ステップ {stepNumber}
        </p>
        <h2
          className="text-[22px] font-bold tracking-tight"
        >
          写真を追加する
        </h2>
        <p className="text-[12px] text-foreground/65">
          写真は記事の魅力を決める要素ですが、あとからでも追加できます。
          「場所」欄は登録済みのスポットから選べます。
        </p>
      </header>

      {/* #4 改修 (2026-05): bodyStyle の選択 UI を撤去し、Step 2 では常に
          PhotoJournalSection を表示する。クラシック本文スタイルでも写真は
          ここから追加でき、本文中 `/image` のクイック挿入と併用できる。 */}
      <PhotoJournalSection
        value={photoEntries}
        onChange={onChangePhotoEntries}
        spots={spots}
      />

      <button
        type="button"
        onClick={onSkip}
        className="text-[12px] text-foreground/55 underline-offset-4 hover:text-foreground/80 hover:underline"
      >
        あとで（このステップをスキップ）
      </button>
    </div>
  );
}

// =============================================================================
// Step 4: 公開準備（メタ + カバー + 動画 + 公開）
// =============================================================================
// 2026-05 改修 (#2): 公開準備内の「記事の種類」切替 UI を撤去したため
// ARTICLE_TYPE_OPTIONS 定数も削除。記事種類の選択肢は Step0CategorySelect 側で
// 独自にラベル付けしているので、ここから参照する必要はない。

function Step4Publish({
  basic,
  onChangeBasic,
  cities,
  coverImageUrl,
  onChangeCover,
  articleId,
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
  coverImageUrl: string;
  onChangeCover: (v: string) => void;
  articleId: string;
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
        >
          公開の準備
        </h2>
        <p className="text-[12px] text-foreground/65">
          記事の種類・価格・カバー画像をまとめて設定したら、最後に「公開する」を押してください。
        </p>
      </header>

      {/*
        2026-05 改修 (#2): 公開準備ステップから「記事の種類」切替 UI を撤去。
        記事の種類は Step 0 (カテゴリ選択) で確定済みなので、ここで再度切り替える
        UI は不要。誤って選んだ場合は「戻る」で Step 0 まで遡って変更する。

        本文スタイル（インスタ / クラシック）選択 UI も以前の改修で撤去済み。
        すべての新規記事は classic として動き、写真は Step 2 のフォト日記
        セクションで追加する。既存の photo_journal 記事はそのまま編集される。
      */}

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

      {/* #5: 動画埋め込みセクションは撤去。本文中で `/video` スラッシュコマンド経由で YouTube を埋め込めるようになった */}

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

        <div className="sm:col-span-2">
          <label
            htmlFor="wz-tags"
            className="mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/55"
          >
            タグ
          </label>
          {/* #6 / #2: ピル型タグ入力。カンマ / 空白 / Enter で確定、× で削除。
              先頭 `#` は自動で外れるので `#東京` 入力 → 「東京」pill になる。 */}
          <TagsInput
            id="wz-tags"
            value={value.tagsText}
            onChange={(t) => onChange({ ...value, tagsText: t })}
            placeholder="例: 朝食 マレ 路地裏（カンマ / 空白 / Enter で確定）"
          />
          <p className="mt-1 text-[10px] text-foreground/55">
            <kbd className="rounded-sm border border-border bg-muted px-1 text-[9px]">,</kbd>
            <kbd className="ml-0.5 rounded-sm border border-border bg-muted px-1 text-[9px]">空白</kbd>
            <kbd className="ml-0.5 rounded-sm border border-border bg-muted px-1 text-[9px]">Enter</kbd>
            のいずれかでタグ確定。先頭の <code className="rounded-sm bg-muted px-1 text-[9px]">#</code> は自動で外れます。backspace で末尾削除。
          </p>
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
