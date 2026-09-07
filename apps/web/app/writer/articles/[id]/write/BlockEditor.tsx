'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, ExternalLink, GripVertical, ImagePlus, Loader2, Plus, Redo2, Trash2, Undo2, X } from 'lucide-react';
import { newBlockId, type ArticleBlock, type BlockType } from '@/lib/articles/blocks';
import { SPECIALTY_GROUPS } from '@/lib/experts/specialties';
import { uploadImage } from '@/lib/storage/uploadImage';
import { publishBlocksArticle, resolveUrlBlock, saveArticleBlocks, unpublishBlocksArticle } from './actions';

/**
 * ブロック形式の記事エディタ（0091）。記事ページ（案 B）と同じ部品で書ける。
 *
 * 操作:
 *   - 空の段落で「/」を打つと部品メニュー。矢印キーで選び Enter、または文字で絞り込み
 *   - 段落で Enter → 次の段落。空の段落で Backspace → 削除
 *   - 段落に URL を 1 本だけ貼って Enter → リンクカード / 埋め込みに自動変換（サーバーで判定・プレビュー取得）
 *   - 各ブロックの右上: 上へ / 下へ / 削除
 *   - 自動保存（1.5 秒後）。公開はヘッダーのボタン
 *
 * 複数行の部品（箇条書き・表・Q&A …）は 1 行 1 項目のテキストで編集する（"|" で列を区切る）。
 * 装飾は **太字** と [文字](URL) だけ。
 */

type Initial = {
  id: string;
  title: string;
  topic: string;
  coverImageUrl: string;
  blocks: ArticleBlock[];
  status: string;
  publishedAt: string | null;
  updatedAt: string;
};

type MenuItem = { type: BlockType | 'aside_point' | 'aside_caution' | 'aside_memo' | 'list_number' | 'heading3' | 'video'; label: string; hint: string; keys: string };

const MENU: MenuItem[] = [
  { type: 'heading', label: 'H2', hint: '大きな見出し', keys: 'h2 見出し heading' },
  { type: 'heading3', label: 'H3', hint: '小さな見出し', keys: 'h3 見出し heading' },
  { type: 'paragraph', label: '本文', hint: 'テキスト', keys: 'text 本文 段落 p' },
  { type: 'list', label: '箇条書きリスト', hint: '1 行 1 項目', keys: 'list ul 箇条書き bullet' },
  { type: 'list_number', label: '番号付きリスト', hint: '1 行 1 項目', keys: 'ol 番号 number' },
  { type: 'aside_point', label: 'コールアウト', hint: '補足・注意・強調（ブロック内で切替）', keys: 'callout コールアウト 補足 注意 強調' },
  { type: 'quote', label: '引用', hint: '言葉と出典', keys: 'quote 引用' },
  { type: 'table', label: 'テーブル', hint: '1 行 1 段。列は | で区切る。1 行目は見出し', keys: 'table テーブル 表' },
  { type: 'timeline', label: 'タイムライン', hint: '日付 | 出来事', keys: 'timeline 時系列' },
  { type: 'divider', label: '区切り線', hint: '短い罫', keys: 'divider hr 区切り' },
  { type: 'image', label: '画像', hint: 'アップロード＋キャプション', keys: 'image 画像 写真' },
  { type: 'video', label: '動画', hint: 'YouTube の URL', keys: 'video youtube 動画' },
  { type: 'link_card', label: '埋め込み 1 · リンク', hint: '記事 / エキスパート / 外部サイトの URL をカードに', keys: 'embed1 link bookmark リンク 埋め込み' },
  { type: 'embed', label: '埋め込み 2 · SNS・地図', hint: 'Google マップ / X / Instagram / TikTok / Spotify', keys: 'embed2 sns map 地図 埋め込み' },
];

function make(type: MenuItem['type']): ArticleBlock {
  const id = newBlockId();
  switch (type) {
    case 'heading':
      return { id, type: 'heading', level: 2, text: '' };
    case 'heading3':
      return { id, type: 'heading', level: 3, text: '' };
    case 'list':
      return { id, type: 'list', style: 'bullet', items: [''] };
    case 'list_number':
      return { id, type: 'list', style: 'number', items: [''] };
    case 'quote':
      return { id, type: 'quote', text: '' };
    case 'aside_point':
      return { id, type: 'aside', kind: 'point', text: '' };
    case 'aside_caution':
      return { id, type: 'aside', kind: 'caution', text: '' };
    case 'aside_memo':
      return { id, type: 'aside', kind: 'memo', text: '' };
    case 'takeaways':
      return { id, type: 'takeaways', items: [''] };
    case 'checklist':
      return { id, type: 'checklist', items: [{ text: '' }] };
    case 'faq':
      return { id, type: 'faq', items: [{ q: '', a: '' }] };
    case 'terms':
      return { id, type: 'terms', items: [{ term: '', def: '' }] };
    case 'timeline':
      return { id, type: 'timeline', items: [{ date: '', text: '' }] };
    case 'proscons':
      return { id, type: 'proscons', pros: [''], cons: [''] };
    case 'stats':
      return { id, type: 'stats', items: [{ value: '', label: '' }] };
    case 'table':
      return { id, type: 'table', rows: [['', ''], ['', '']] };
    case 'image':
      return { id, type: 'image', url: '' } as unknown as ArticleBlock;
    case 'images':
      return { id, type: 'images', urls: [] } as unknown as ArticleBlock;
    case 'link_card':
      return { id, type: 'link_card', url: '', kind: 'external' } as unknown as ArticleBlock;
    case 'video':
      return { id, type: 'embed', url: '', provider: 'youtube' } as unknown as ArticleBlock;
    case 'embed':
      return { id, type: 'embed', url: '', provider: 'other' } as unknown as ArticleBlock;
    case 'footnotes':
      return { id, type: 'footnotes', items: [''] };
    case 'divider':
      return { id, type: 'divider' };
    default:
      return { id, type: 'paragraph', text: '' };
  }
}

/** 保存前に「空のまま」のブロックを落とす（url 未入力の画像・リンクなど） */
function compact(blocks: ArticleBlock[]): ArticleBlock[] {
  return blocks.filter((b) => {
    switch (b.type) {
      case 'image':
        return !!b.url;
      case 'images':
        return b.urls.length > 0;
      case 'link_card':
      case 'embed':
        return !!b.url;
      default:
        return true;
    }
  });
}

const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);
const cells = (l: string) => l.split('|').map((c) => c.trim());

/** 履歴（元に戻す / やり直す）で扱う記事全体のスナップショット */
type Doc = { title: string; topic: string; cover: string; blocks: ArticleBlock[] };
const HISTORY_LIMIT = 100;
const same = (a: Doc, b: Doc) => JSON.stringify(a) === JSON.stringify(b);
/** ブロックの並びと種類だけを見る鍵。ここが変わったら「構造の変更」として即座に履歴へ積む */
const shape = (d: Doc) => d.blocks.map((b) => `${b.id}:${b.type}`).join(',');

export function BlockEditor({ initial, demo = false }: { initial: Initial; demo?: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [topic, setTopic] = useState(initial.topic);
  const [cover, setCover] = useState(initial.coverImageUrl);
  const [blocks, setBlocks] = useState<ArticleBlock[]>(initial.blocks.length ? initial.blocks : [{ id: newBlockId(), type: 'paragraph', text: '' }]);
  const [status, setStatus] = useState(initial.status);
  const [savedAt, setSavedAt] = useState<string | null>(initial.updatedAt);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, start] = useTransition();
  const [focusId, setFocusId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ===== 履歴（⌘Z / ⇧⌘Z） =====
  const doc = useMemo<Doc>(() => ({ title, topic, cover, blocks }), [title, topic, cover, blocks]);
  const docRef = useRef(doc);
  const prevDoc = useRef(doc);
  const past = useRef<Doc[]>([]);
  const future = useRef<Doc[]>([]);
  const pendingBase = useRef<Doc | null>(null); // まだ履歴に積んでいない編集の起点
  const restoring = useRef(false);
  const histTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hist, setHist] = useState({ undo: 0, redo: 0 });
  const [rev, setRev] = useState(0); // 履歴を戻したら各行を作り直す（行内のローカル state を同期させるため）

  // ===== ドラッグでの並べ替え =====
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<{ id: string; place: 'before' | 'after' } | null>(null);

  const payload = useCallback(
    () => ({ id: initial.id, title, topic, coverImageUrl: cover, blocks: compact(blocks) }),
    [initial.id, title, topic, cover, blocks],
  );

  const save = useCallback(async () => {
    if (demo) {
      // デモ: サーバーに送らず「保存済み」扱いにする
      setSavedAt(new Date().toISOString());
      setDirty(false);
      return true;
    }
    setSaving(true);
    const res = await saveArticleBlocks(payload());
    setSaving(false);
    if (res.ok) {
      setSavedAt(res.data?.savedAt ?? new Date().toISOString());
      setDirty(false);
    } else toast.error(res.error);
    return res.ok;
  }, [payload, demo]);

  // 自動保存（1.5 秒）
  useEffect(() => {
    if (!dirty) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void save();
    }, 1500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [dirty, title, topic, cover, blocks, save]);

  const touch = () => setDirty(true);

  /** 溜めていた編集を 1 手として履歴に積む。upto を渡すとそこまでを 1 手にする */
  const flush = useCallback((upto?: Doc) => {
    if (histTimer.current) {
      clearTimeout(histTimer.current);
      histTimer.current = null;
    }
    const base = pendingBase.current;
    pendingBase.current = null;
    if (!base) return;
    if (same(base, upto ?? docRef.current)) return;
    past.current = [...past.current, base].slice(-HISTORY_LIMIT);
    future.current = [];
    setHist({ undo: past.current.length, redo: 0 });
  }, []);

  // 変更を見張って履歴に積む。文字入力は 600ms まとめて 1 手、構造の変更は即座に 1 手
  useEffect(() => {
    const prev = prevDoc.current;
    prevDoc.current = doc;
    docRef.current = doc;
    if (restoring.current) {
      restoring.current = false;
      pendingBase.current = null;
      if (histTimer.current) {
        clearTimeout(histTimer.current);
        histTimer.current = null;
      }
      return;
    }
    if (same(doc, prev)) return;
    if (pendingBase.current === null) pendingBase.current = prev;
    if (histTimer.current) {
      clearTimeout(histTimer.current);
      histTimer.current = null;
    }
    if (shape(doc) !== shape(prev)) {
      flush(prev); // 直前までの文字入力を先に 1 手として確定させる
      pendingBase.current = prev;
      flush(doc);
    } else {
      histTimer.current = setTimeout(() => flush(), 600);
    }
  }, [doc, flush]);

  const apply = useCallback((d: Doc) => {
    restoring.current = true;
    setTitle(d.title);
    setTopic(d.topic);
    setCover(d.cover);
    setBlocks(d.blocks);
    setFocusId(null);
    setRev((n) => n + 1);
    setDirty(true);
  }, []);

  const undo = useCallback(() => {
    flush();
    if (past.current.length === 0) return;
    const target = past.current[past.current.length - 1]!;
    past.current = past.current.slice(0, -1);
    future.current = [...future.current, docRef.current];
    setHist({ undo: past.current.length, redo: future.current.length });
    apply(target);
  }, [flush, apply]);

  const redo = useCallback(() => {
    if (pendingBase.current) {
      flush(); // 新しい編集が入っていたら、やり直しは捨てる
      return;
    }
    if (future.current.length === 0) return;
    const target = future.current[future.current.length - 1]!;
    future.current = future.current.slice(0, -1);
    past.current = [...past.current, docRef.current].slice(-HISTORY_LIMIT);
    setHist({ undo: past.current.length, redo: future.current.length });
    apply(target);
  }, [flush, apply]);

  // ⌘S 保存 / ⌘Z 元に戻す / ⇧⌘Z・⌘Y やり直す
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === 's') {
        e.preventDefault();
        void save();
        return;
      }
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((k === 'z' && e.shiftKey) || k === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [save, undo, redo]);

  // 未保存のまま離れようとしたら止める
  useEffect(() => {
    if (demo || !dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [demo, dirty]);

  const update = (id: string, patch: Partial<ArticleBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? ({ ...b, ...patch } as ArticleBlock) : b)));
    touch();
  };
  const replace = (id: string, next: ArticleBlock) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? next : b)));
    setFocusId(next.id);
    touch();
  };
  const insertAfter = (id: string | null, next: ArticleBlock) => {
    setBlocks((prev) => {
      if (id == null) return [...prev, next];
      const i = prev.findIndex((b) => b.id === id);
      return [...prev.slice(0, i + 1), next, ...prev.slice(i + 1)];
    });
    setFocusId(next.id);
    touch();
  };
  const remove = (id: string) => {
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.id === id);
      const next = prev.filter((b) => b.id !== id);
      const target = next[Math.max(0, i - 1)];
      if (target) setFocusId(target.id);
      return next.length ? next : [{ id: newBlockId(), type: 'paragraph', text: '' }];
    });
    touch();
  };
  const move = (id: string, dir: -1 | 1) => {
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.id === id);
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
      return copy;
    });
    touch();
  };
  /** ドラッグした fromId を toId の前 / 後ろへ差し込む */
  const reorder = (fromId: string, toId: string, place: 'before' | 'after') => {
    if (fromId === toId) return;
    setBlocks((prev) => {
      const item = prev.find((b) => b.id === fromId);
      if (!item) return prev;
      const rest = prev.filter((b) => b.id !== fromId);
      const i = rest.findIndex((b) => b.id === toId);
      if (i < 0) return prev;
      const at = place === 'after' ? i + 1 : i;
      return [...rest.slice(0, at), item, ...rest.slice(at)];
    });
    touch();
  };

  const convertUrl = (id: string, url: string) => {
    start(async () => {
      const res = await resolveUrlBlock({ url });
      if (res.ok && res.data) {
        replace(id, res.data);
        const after = { id: newBlockId(), type: 'paragraph', text: '' } as ArticleBlock;
        insertAfter(res.data.id, after);
      } else toast.error(res.ok ? '変換できませんでした' : res.error);
    });
  };

  const onPublish = () => {
    if (demo) {
      toast('デモでは公開できません', { description: 'ログインして「ブログを書く」から実際の記事を作成できます' });
      return;
    }
    start(async () => {
      const ok = await save();
      if (!ok) return;
      const res = await publishBlocksArticle({ id: initial.id });
      if (res.ok) {
        setStatus('published');
        toast.success('公開しました');
        router.refresh();
      } else toast.error(res.error);
    });
  };
  const onUnpublish = () => {
    if (demo) return;
    if (!confirm('非公開（下書き）に戻しますか？')) return;
    start(async () => {
      const res = await unpublishBlocksArticle({ id: initial.id });
      if (res.ok) {
        setStatus('draft');
        toast.success('下書きに戻しました');
      } else toast.error(res.error);
    });
  };

  const onCover = async (f: File) => {
    const fd = new FormData();
    fd.set('file', f);
    const res = await uploadImage(fd);
    if (res.ok) {
      setCover(res.url);
      touch();
    } else toast.error(res.error);
  };

  const chars = useMemo(() => blocks.reduce((n, b) => n + ('text' in b && typeof b.text === 'string' ? b.text.length : 0), 0), [blocks]);

  return (
    <main className="bg-background text-foreground">
      {/* ===== ヘッダー（固定） ===== */}
      <div className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1120px] items-center gap-3 px-5 py-2.5 sm:px-8">
          <Link href={demo ? '/' : '/writer/articles'} className="text-[12.5px] text-neutral-500 hover:text-foreground">
            {demo ? '← Locore' : '← 記事一覧'}
          </Link>
          <span className="text-[12px] text-neutral-400">
            {saving ? '保存中…' : dirty ? '未保存の変更' : savedAt ? `保存済み ${fmtTime(savedAt)}` : ''}
          </span>
          <span className={'rounded-full border px-2.5 py-1 text-[11px] font-bold ' + (status === 'published' ? 'border-primary-500 bg-primary-100 text-primary-900' : 'border-border-strong text-neutral-600')}>
            {demo ? 'デモ（保存されません）' : status === 'published' ? '公開中' : '下書き'}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {demo ? (
              <Link href="/articles/e9cc342f-e475-5161-a3b4-006706e81c6d" target="_blank" className="inline-flex items-center gap-1 rounded-full border border-border-strong bg-card px-3 py-1.5 text-[12px] font-bold hover:border-foreground">
                記事ページの例 <ExternalLink className="h-3 w-3" aria-hidden />
              </Link>
            ) : (
              <Link href={`/articles/${initial.id}`} target="_blank" className="inline-flex items-center gap-1 rounded-full border border-border-strong bg-card px-3 py-1.5 text-[12px] font-bold hover:border-foreground">
                プレビュー <ExternalLink className="h-3 w-3" aria-hidden />
              </Link>
            )}
            <div className="flex items-center">
              <button type="button" onClick={undo} disabled={hist.undo === 0} className="rounded-full p-1.5 text-neutral-500 transition hover:bg-neutral-100 hover:text-foreground disabled:opacity-25 disabled:hover:bg-transparent" aria-label="元に戻す" title="元に戻す（⌘Z）">
                <Undo2 className="h-4 w-4" aria-hidden />
              </button>
              <button type="button" onClick={redo} disabled={hist.redo === 0} className="rounded-full p-1.5 text-neutral-500 transition hover:bg-neutral-100 hover:text-foreground disabled:opacity-25 disabled:hover:bg-transparent" aria-label="やり直す" title="やり直す（⇧⌘Z）">
                <Redo2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <button type="button" onClick={() => void save()} disabled={saving || !dirty} title="保存（⌘S）" className="rounded-full border border-border-strong bg-card px-3 py-1.5 text-[12px] font-bold hover:border-foreground disabled:opacity-40">
              保存
            </button>
            {status === 'published' ? (
              <button type="button" onClick={onUnpublish} disabled={pending} className="rounded-full px-3 py-1.5 text-[12px] font-bold text-neutral-500 hover:text-foreground">
                非公開にする
              </button>
            ) : (
              <button type="button" onClick={onPublish} disabled={pending} className="rounded-full bg-neutral-900 px-4 py-1.5 text-[12px] font-bold text-white hover:bg-neutral-700 disabled:opacity-60">
                {pending ? '処理中…' : '公開する'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[720px] px-5 pb-40 pt-8 sm:px-8">
        {/* ===== 一番上: テーマとカバー写真（本文と同じ列） ===== */}
        <div className="mb-6 flex flex-wrap items-start gap-3 text-[12.5px]">
          <label className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-[0.14em] text-neutral-500">テーマ</span>
            <select value={topic} onChange={(e) => (setTopic(e.target.value), touch())} className="h-9 rounded-md border border-border bg-background px-2 text-[13px] focus:border-primary-500 focus:outline-none">
              <option value="">— 選ぶ —</option>
              {SPECIALTY_GROUPS.map((g) => (
                <option key={g.code} value={g.code}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          {cover ? (
            <div className="relative h-9 w-[54px] overflow-hidden rounded-md bg-neutral-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => (setCover(''), touch())} className="absolute inset-0 grid place-items-center bg-black/0 text-white opacity-0 transition hover:bg-black/50 hover:opacity-100" aria-label="カバーを外す">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-border px-3 text-[12px] text-neutral-500 hover:border-primary-300 hover:text-primary-700">
              <ImagePlus className="h-3.5 w-3.5" /> カバー写真
              <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && void onCover(e.target.files[0])} />
            </label>
          )}
          <span className="ml-auto self-center text-[11px] text-neutral-400">
            {chars.toLocaleString('ja-JP')} 文字 · 読了 約 {Math.max(1, Math.round(chars / 500))} 分
          </span>
        </div>
        {cover ? (
          <div className="mb-6 overflow-hidden rounded-xl bg-neutral-100 aspect-[3/2]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" className="h-full w-full object-cover" />
          </div>
        ) : null}

        {/* ===== 本文 ===== */}
        <div className="min-w-0">
          <textarea
            value={title}
            onChange={(e) => (setTitle(e.target.value.replace(/\n/g, '')), touch())}
            placeholder="タイトル"
            rows={2}
            className="w-full resize-none border-0 bg-transparent p-0 text-[36px] font-bold leading-[1.32] tracking-[-0.025em] placeholder:text-neutral-300 focus:outline-none max-sm:text-[26px]"
          />
          <div className="mt-8 space-y-1">
            {blocks.map((b, i) => (
              <BlockRow
                key={`${b.id}:${rev}`}
                block={b}
                index={i}
                total={blocks.length}
                autoFocus={focusId === b.id}
                onChange={(patch) => update(b.id, patch)}
                onReplace={(next) => replace(b.id, next)}
                onEnter={() => insertAfter(b.id, { id: newBlockId(), type: 'paragraph', text: '' })}
                onRemove={() => remove(b.id)}
                onMove={(d) => move(b.id, d)}
                onInsertAfter={() => insertAfter(b.id, { id: newBlockId(), type: 'paragraph', text: '' })}
                onUrl={(url) => convertUrl(b.id, url)}
                onPick={(t) => replace(b.id, make(t))}
                dragging={dragId === b.id}
                dragActive={dragId !== null}
                dropHint={dropAt && dropAt.id === b.id ? dropAt.place : null}
                onDragStart={() => setDragId(b.id)}
                onDragOver={(place) => setDropAt((cur) => (cur && cur.id === b.id && cur.place === place ? cur : { id: b.id, place }))}
                onDrop={() => {
                  if (dragId) reorder(dragId, b.id, dropAt?.place ?? 'before');
                  setDragId(null);
                  setDropAt(null);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setDropAt(null);
                }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => insertAfter(blocks[blocks.length - 1]?.id ?? null, { id: newBlockId(), type: 'paragraph', text: '' })}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-card px-3.5 py-1.5 text-[12.5px] font-semibold text-neutral-700 hover:border-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> ブロックを追加
          </button>
          <p className="mt-4 text-[11px] leading-[1.7] text-neutral-400">空の行で「/」を打つとブロックを選べます。URL を 1 行貼って Enter でブックマーク・埋め込みになります。**太字**、[文字](URL) が使えます。行の右にある ⠿ をつかむと並べ替え、＋ で下に段落を足せます。⌘Z で元に戻す、⇧⌘Z でやり直す、⌘S で保存。</p>
        </div>
      </div>
    </main>
  );
}

/* ===================== 各ブロックの編集 ===================== */

function BlockRow({
  block,
  index,
  total,
  autoFocus,
  onChange,
  onReplace,
  onEnter,
  onRemove,
  onMove,
  onInsertAfter,
  onUrl,
  onPick,
  dragging,
  dragActive,
  dropHint,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  block: ArticleBlock;
  index: number;
  total: number;
  autoFocus: boolean;
  onChange: (patch: Partial<ArticleBlock>) => void;
  onReplace: (next: ArticleBlock) => void;
  onEnter: () => void;
  onRemove: () => void;
  onMove: (d: -1 | 1) => void;
  onInsertAfter: () => void;
  onUrl: (url: string) => void;
  onPick: (t: MenuItem['type']) => void;
  dragging: boolean;
  dragActive: boolean;
  dropHint: 'before' | 'after' | null;
  onDragStart: () => void;
  onDragOver: (place: 'before' | 'after') => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const [menu, setMenu] = useState<{ q: string; cursor: number } | null>(null);
  const [grab, setGrab] = useState(false); // ⠿ を押している間だけ draggable にする（本文の選択を邪魔しない）
  const label = LABEL[block.type];
  const filtered = useMemo(() => (menu ? MENU.filter((m) => !menu.q || (m.label + ' ' + m.keys).toLowerCase().includes(menu.q.toLowerCase())) : []), [menu]);

  const body = (() => {
    switch (block.type) {
      case 'paragraph':
        return (
          <div className="relative">
            <AutoTextarea
              value={block.text}
              autoFocus={autoFocus}
              placeholder={index === 0 ? 'テキストを入力。「/」でブロックを選択' : ''}
              className="text-[16.5px] leading-[2] text-neutral-800"
              onChange={(v) => {
                if (v === '/' ) setMenu({ q: '', cursor: 0 });
                else if (menu && v.startsWith('/')) setMenu({ q: v.slice(1), cursor: 0 });
                else if (menu) setMenu(null);
                onChange({ text: v });
              }}
              onKeyDown={(e) => {
                if (menu) {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setMenu({ ...menu, cursor: Math.min(filtered.length - 1, menu.cursor + 1) }); return; }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setMenu({ ...menu, cursor: Math.max(0, menu.cursor - 1) }); return; }
                  if (e.key === 'Enter') { e.preventDefault(); const m = filtered[menu.cursor]; if (m) { setMenu(null); onPick(m.type); } return; }
                  if (e.key === 'Escape') { setMenu(null); return; }
                }
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  const t = block.text.trim();
                  if (/^https?:\/\/\S+$/.test(t)) { e.preventDefault(); onUrl(t); return; }
                  e.preventDefault();
                  onEnter();
                }
                if (e.key === 'Backspace' && block.text === '' && total > 1) { e.preventDefault(); onRemove(); }
              }}
            />
            {menu ? (
              <div className="absolute left-0 top-full z-20 mt-1 w-[300px] overflow-hidden rounded-xl border border-border bg-white shadow-xl">
                <div className="max-h-[320px] overflow-y-auto py-1">
                  {filtered.length === 0 ? <p className="px-3 py-2 text-[12px] text-neutral-400">該当なし</p> : null}
                  {filtered.map((m, i) => (
                    <button key={m.type} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setMenu(null); onPick(m.type); }} className={'flex w-full items-baseline gap-2 px-3 py-2 text-left text-[13px] ' + (i === menu.cursor ? 'bg-neutral-100' : 'hover:bg-neutral-50')}>
                      <b className="w-[128px] shrink-0">{m.label}</b>
                      <span className="text-[11.5px] text-neutral-500">{m.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        );
      case 'heading':
        return (
          <AutoTextarea
            value={block.text}
            autoFocus={autoFocus}
            placeholder={block.level === 2 ? '見出し' : '小見出し'}
            className={block.level === 2 ? 'text-[24px] font-bold leading-[1.45] tracking-[-0.015em]' : 'text-[17.5px] font-bold'}
            onChange={(v) => onChange({ text: v.replace(/\n/g, '') })}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); onEnter(); } if (e.key === 'Backspace' && block.text === '') { e.preventDefault(); onRemove(); } }}
            extra={
              block.level === 2 ? (
                <label className="inline-flex items-center gap-1 text-[11px] text-neutral-500">
                  <input type="checkbox" checked={!!block.numbered} onChange={(e) => onChange({ numbered: e.target.checked } as Partial<ArticleBlock>)} /> 番号を付ける
                </label>
              ) : null
            }
          />
        );
      case 'list':
        return <Lines value={block.items.join('\n')} placeholder="1 行 1 項目" autoFocus={autoFocus} onChange={(v) => onChange({ items: lines(v) } as Partial<ArticleBlock>)} />;
      case 'quote':
        return (
          <div className="border-l border-foreground pl-[22px]">
            <AutoTextarea value={block.text} autoFocus={autoFocus} placeholder="引用する言葉" className="text-[18.5px] leading-[1.8]" onChange={(v) => onChange({ text: v })} />
            <input value={block.cite ?? ''} onChange={(e) => onChange({ cite: e.target.value } as Partial<ArticleBlock>)} placeholder="— 出典・誰の言葉か（任意）" className="mt-1 w-full border-0 bg-transparent p-0 text-[12.5px] text-neutral-500 placeholder:text-neutral-300 focus:outline-none" />
          </div>
        );
      case 'aside':
        return (
          <div className={block.kind === 'memo' ? 'border-l-[3px] border-primary-500 pl-[18px]' : 'border-y border-border py-3'}>
            <div className="mb-1 flex items-center gap-2">
              <input value={block.label ?? ''} onChange={(e) => onChange({ label: e.target.value } as Partial<ArticleBlock>)} placeholder="ラベル（任意）" className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[11.5px] font-bold tracking-[0.18em] placeholder:text-neutral-300 focus:outline-none" />
              <select value={block.kind} onChange={(e) => onChange({ kind: e.target.value } as Partial<ArticleBlock>)} className="h-7 rounded-md border border-border bg-white px-1.5 text-[11px] text-neutral-600 focus:border-primary-500 focus:outline-none" aria-label="コールアウトの種類">
                <option value="point">標準</option>
                <option value="caution">注意</option>
                <option value="memo">強調</option>
              </select>
            </div>
            <AutoTextarea value={block.text} autoFocus={autoFocus} placeholder="本文" className="text-[15px] leading-[1.85] text-neutral-700" onChange={(v) => onChange({ text: v })} />
          </div>
        );
      case 'takeaways':
        return (
          <div className="border-l-[3px] border-primary-500 py-1 pl-[18px]">
            <input value={block.label ?? 'サマリー'} onChange={(e) => onChange({ label: e.target.value } as Partial<ArticleBlock>)} placeholder="見出し（空にすると出ない）" className="mb-1.5 w-full border-0 bg-transparent p-0 text-[11.5px] font-bold tracking-[0.18em] placeholder:text-neutral-300 focus:outline-none" />
            <Lines value={block.items.join('\n')} placeholder="1 行 1 項目（3〜5 行）" autoFocus={autoFocus} onChange={(v) => onChange({ items: lines(v) } as Partial<ArticleBlock>)} />
          </div>
        );
      case 'checklist':
        return <Lines value={block.items.map((i) => (i.done ? '[x] ' : '') + i.text).join('\n')} placeholder="1 行 1 項目。先頭に [x] で済み" autoFocus={autoFocus} onChange={(v) => onChange({ items: lines(v).map((l) => ({ text: l.replace(/^\[x\]\s*/i, ''), done: /^\[x\]/i.test(l) })) } as Partial<ArticleBlock>)} />;
      case 'faq':
        return <Lines value={block.items.map((i) => `Q: ${i.q}\nA: ${i.a}`).join('\n\n')} placeholder={'Q: 質問\nA: 答え\n\nQ: …'} autoFocus={autoFocus} onChange={(v) => onChange({ items: parseFaq(v) } as Partial<ArticleBlock>)} minRows={4} />;
      case 'terms':
        return <Lines value={block.items.map((i) => `${i.term} | ${i.def}`).join('\n')} placeholder="語 | 説明（1 行 1 つ）" autoFocus={autoFocus} onChange={(v) => onChange({ items: lines(v).map((l) => { const [term = '', ...d] = cells(l); return { term, def: d.join(' | ') }; }) } as Partial<ArticleBlock>)} />;
      case 'timeline':
        return <Lines value={block.items.map((i) => `${i.date} | ${i.text}`).join('\n')} placeholder="2024.05 | 推薦者に打診（1 行 1 つ）" autoFocus={autoFocus} onChange={(v) => onChange({ items: lines(v).map((l) => { const [date = '', ...t] = cells(l); return { date, text: t.join(' | ') }; }) } as Partial<ArticleBlock>)} />;
      case 'proscons':
        return (
          <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <div><input value={block.prosLabel ?? 'メリット'} onChange={(e) => onChange({ prosLabel: e.target.value } as Partial<ArticleBlock>)} className="mb-1 w-full border-0 bg-transparent p-0 text-[11.5px] font-bold tracking-[0.18em] text-neutral-500 focus:outline-none" /><Lines value={block.pros.join('\n')} placeholder="1 行 1 つ" autoFocus={autoFocus} onChange={(v) => onChange({ pros: lines(v) } as Partial<ArticleBlock>)} /></div>
            <div><input value={block.consLabel ?? 'デメリット'} onChange={(e) => onChange({ consLabel: e.target.value } as Partial<ArticleBlock>)} className="mb-1 w-full border-0 bg-transparent p-0 text-[11.5px] font-bold tracking-[0.18em] text-neutral-500 focus:outline-none" /><Lines value={block.cons.join('\n')} placeholder="1 行 1 つ" onChange={(v) => onChange({ cons: lines(v) } as Partial<ArticleBlock>)} /></div>
          </div>
        );
      case 'stats':
        return <Lines value={block.items.map((i) => `${i.value} | ${i.label}`).join('\n')} placeholder="¥1,400 万 | 1 年の学費＋生活費（3 つまで）" autoFocus={autoFocus} onChange={(v) => onChange({ items: lines(v).slice(0, 4).map((l) => { const [value = '', ...lab] = cells(l); return { value, label: lab.join(' | ') }; }) } as Partial<ArticleBlock>)} />;
      case 'table':
        return <Lines value={block.rows.map((r) => r.join(' | ')).join('\n')} placeholder={'時期 | やること | 費用\n5〜7 月 | GMAT | ¥120,000'} autoFocus={autoFocus} minRows={3} onChange={(v) => onChange({ rows: lines(v).map(cells) } as Partial<ArticleBlock>)} mono />;
      case 'footnotes':
        return <Lines value={block.items.join('\n')} placeholder="出典を 1 行 1 つ（本文には 1、2 と番号を書く）" autoFocus={autoFocus} onChange={(v) => onChange({ items: lines(v) } as Partial<ArticleBlock>)} />;
      case 'divider':
        return <hr className="my-2 w-16 border-0 border-t border-foreground" />;
      case 'image':
        return <ImageField urls={block.url ? [block.url] : []} max={1} caption={block.caption ?? ''} onChange={(urls, caption) => onChange({ url: urls[0] ?? '', caption } as Partial<ArticleBlock>)} />;
      case 'images':
        return <ImageField urls={block.urls} max={3} caption={block.caption ?? ''} onChange={(urls, caption) => onChange({ urls, caption } as Partial<ArticleBlock>)} />;
      case 'link_card':
      case 'embed':
        return <UrlField block={block} onReplace={onReplace} />;
      default:
        return null;
    }
  })();

  return (
    <div
      draggable={grab}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', block.id); // Firefox は setData しないとドラッグが始まらない
        onDragStart();
      }}
      onDragEnd={() => {
        setGrab(false);
        onDragEnd();
      }}
      onDragOver={(e) => {
        if (!dragActive || dragging) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const r = e.currentTarget.getBoundingClientRect();
        onDragOver(e.clientY < r.top + r.height / 2 ? 'before' : 'after');
      }}
      onDrop={(e) => {
        if (!dragActive) return;
        e.preventDefault();
        setGrab(false);
        onDrop();
      }}
      className={'group relative rounded-lg px-3 py-1.5 transition hover:bg-neutral-50' + (dragging ? ' opacity-40' : '')}
    >
      {dropHint ? <div className={'pointer-events-none absolute inset-x-2 z-10 h-[2px] rounded-full bg-primary-500 ' + (dropHint === 'before' ? '-top-px' : '-bottom-px')} aria-hidden /> : null}
      <div className="pointer-events-none absolute -left-1 top-1.5 whitespace-nowrap text-[10px] tracking-[0.1em] text-neutral-300 opacity-0 transition group-hover:opacity-100 max-lg:hidden" style={{ transform: 'translateX(-100%)' }}>
        {label}
      </div>
      <div className="absolute right-2 top-1 flex items-center gap-0.5 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
        <span
          role="button"
          tabIndex={-1}
          aria-label="ドラッグして並べ替え"
          title="ドラッグして並べ替え"
          onPointerDown={() => setGrab(true)}
          onPointerUp={() => setGrab(false)}
          className="cursor-grab rounded p-1 text-neutral-400 hover:bg-neutral-200 hover:text-foreground active:cursor-grabbing max-lg:hidden"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </span>
        <button type="button" onClick={onInsertAfter} className="rounded p-1 text-neutral-400 hover:bg-neutral-200 hover:text-foreground" aria-label="下に段落を追加" title="下に段落を追加"><Plus className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="rounded p-1 text-neutral-400 hover:bg-neutral-200 hover:text-foreground disabled:opacity-30" aria-label="上へ"><ArrowUp className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} className="rounded p-1 text-neutral-400 hover:bg-neutral-200 hover:text-foreground disabled:opacity-30" aria-label="下へ"><ArrowDown className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={onRemove} className="rounded p-1 text-neutral-400 hover:bg-neutral-200 hover:text-danger-500" aria-label="削除"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      {body}
    </div>
  );
}

const LABEL: Record<ArticleBlock['type'], string> = {
  paragraph: '本文',
  heading: '見出し',
  list: 'リスト',
  quote: '引用',
  aside: 'コールアウト',
  table: 'テーブル',
  image: '画像',
  images: 'ギャラリー',
  takeaways: 'サマリー',
  checklist: 'ToDo',
  faq: 'トグル',
  terms: '定義',
  timeline: 'タイムライン',
  proscons: '比較',
  stats: '数値',
  footnotes: '脚注',
  divider: '区切り',
  link_card: '埋め込み 1',
  embed: '埋め込み 2',
};

function parseFaq(v: string): Array<{ q: string; a: string }> {
  const out: Array<{ q: string; a: string }> = [];
  let cur: { q: string; a: string } | null = null;
  for (const raw of v.split('\n')) {
    const l = raw.trim();
    if (/^Q[:：]/i.test(l)) {
      if (cur) out.push(cur);
      cur = { q: l.replace(/^Q[:：]\s*/i, ''), a: '' };
    } else if (/^A[:：]/i.test(l)) {
      if (!cur) cur = { q: '', a: '' };
      cur.a = l.replace(/^A[:：]\s*/i, '');
    } else if (l && cur) {
      cur.a = cur.a ? `${cur.a}\n${l}` : l;
    }
  }
  if (cur) out.push(cur);
  return out.filter((i) => i.q || i.a);
}

function AutoTextarea({
  value,
  onChange,
  onKeyDown,
  placeholder,
  className = '',
  autoFocus,
  extra,
}: {
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  extra?: React.ReactNode;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useAutoHeight(ref, value, 0);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);
  return (
    <div>
      <textarea ref={ref} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} placeholder={placeholder} rows={1} style={FIELD_SIZING} className={'block w-full resize-none overflow-hidden border-0 bg-transparent p-0 placeholder:text-neutral-300 focus:outline-none ' + className} />
      {extra ? <div className="mt-1">{extra}</div> : null}
    </div>
  );
}

/** 1 行 1 項目のテキストエリア（ローカル state で編集し、blur / 入力ごとに parse して親へ） */
function Lines({ value, onChange, placeholder, autoFocus, minRows = 2, mono = false }: { value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean; minRows?: number; mono?: boolean }) {
  const [local, setLocal] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);
  useAutoHeight(ref, local, minRows * 28);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);
  return (
    <textarea
      ref={ref}
      style={FIELD_SIZING}
      value={local}
      onChange={(e) => {
        setLocal(e.target.value);
        onChange(e.target.value);
      }}
      placeholder={placeholder}
      className={'block w-full resize-none overflow-hidden rounded-md border border-border bg-white px-3 py-2 text-[14.5px] leading-[1.8] placeholder:text-neutral-300 focus:border-primary-500 focus:outline-none ' + (mono ? 'font-mono text-[13px]' : '')}
    />
  );
}

function ImageField({ urls, max, caption, onChange }: { urls: string[]; max: number; caption: string; onChange: (urls: string[], caption: string) => void }) {
  const [busy, setBusy] = useState(false);
  const pick = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    const next = [...urls];
    for (const f of Array.from(files).slice(0, max - urls.length)) {
      const fd = new FormData();
      fd.set('file', f);
      const res = await uploadImage(fd);
      if (res.ok) next.push(res.url);
      else toast.error(res.error);
    }
    setBusy(false);
    onChange(next, caption);
  };
  return (
    <div>
      <div className={'grid gap-2 ' + (max > 1 ? 'grid-cols-3' : 'grid-cols-1')}>
        {urls.map((u, i) => (
          <div key={i} className={'relative overflow-hidden rounded-xl bg-neutral-100 ' + (max > 1 ? 'aspect-square' : 'aspect-[4/3]')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="h-full w-full object-cover" />
            <button type="button" onClick={() => onChange(urls.filter((_, j) => j !== i), caption)} className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-neutral-700 shadow" aria-label="削除"><X className="h-3.5 w-3.5" /></button>
          </div>
        ))}
        {urls.length < max ? (
          <label className={'flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-[12.5px] text-neutral-500 hover:border-primary-300 hover:text-primary-700 ' + (max > 1 ? 'aspect-square' : 'aspect-[4/3]')}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} {busy ? 'アップロード中' : max > 1 ? `追加（${urls.length}/${max}）` : '画像を選ぶ'}
            <input type="file" accept="image/*" multiple={max > 1} hidden onChange={(e) => void pick(e.target.files)} />
          </label>
        ) : null}
      </div>
      <input value={caption} onChange={(e) => onChange(urls, e.target.value)} placeholder="キャプション（任意）" className="mt-2 w-full border-0 bg-transparent p-0 text-[12px] text-neutral-500 placeholder:text-neutral-300 focus:outline-none" />
    </div>
  );
}

function UrlField({ block, onReplace }: { block: Extract<ArticleBlock, { type: 'link_card' | 'embed' }>; onReplace: (b: ArticleBlock) => void }) {
  const [url, setUrl] = useState(block.url);
  const [pending, start] = useTransition();
  const resolve = () => {
    const u = url.trim();
    if (!/^https?:\/\/\S+$/.test(u)) {
      toast.error('URL を入力してください');
      return;
    }
    start(async () => {
      const res = await resolveUrlBlock({ url: u });
      if (res.ok && res.data) onReplace({ ...res.data, id: block.id });
      else toast.error(res.ok ? '変換できませんでした' : res.error);
    });
  };
  const p = block.preview;
  return (
    <div className="rounded-xl border border-border bg-white p-3">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-neutral-100 px-2 py-[3px] text-[10.5px] font-bold">{block.type === 'embed' ? (block.provider === 'youtube' ? '動画' : `埋め込み 2 · ${block.provider}`) : `埋め込み 1 · ${block.kind}`}</span>
        <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); resolve(); } }} placeholder={block.type === 'embed' && block.provider === 'youtube' ? 'https://www.youtube.com/watch?v=…' : block.type === 'embed' ? 'https://…（Google マップ / X / Instagram / TikTok / Spotify）' : 'https://…（記事 / エキスパート / 外部サイト）'} className="h-9 min-w-0 flex-1 rounded-md border border-border px-2 text-[13px] focus:border-primary-500 focus:outline-none" />
        <button type="button" onClick={resolve} disabled={pending} className="rounded-full bg-neutral-900 px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-60">{pending ? '取得中…' : '取得'}</button>
      </div>
      {block.url ? (
        <div className="mt-2 flex items-center gap-3 text-[12.5px] text-neutral-600">
          {p?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.imageUrl} alt="" referrerPolicy="no-referrer" className="h-12 w-16 rounded-md object-cover" />
          ) : null}
          <span className="min-w-0 truncate">{p?.title ?? (block.type === 'link_card' && block.kind !== 'external' ? `${block.kind === 'article' ? '記事' : 'エキスパート'}のカード（表示時に最新情報を出します）` : block.url)}</span>
        </div>
      ) : null}
    </div>
  );
}

/** textarea の高さを内容に合わせる。フォント読み込み後と幅変更時にも測り直す（初回の測定ずれ対策） */
const FIELD_SIZING = { fieldSizing: 'content' } as React.CSSProperties;
function useAutoHeight(ref: React.RefObject<HTMLTextAreaElement>, value: string, min: number) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.height = '0px';
      el.style.height = `${Math.max(el.scrollHeight, min)}px`;
    };
    fit();
    const raf = requestAnimationFrame(fit);
    const onResize = () => fit();
    window.addEventListener('resize', onResize);
    let cancelled = false;
    if (typeof document !== 'undefined' && 'fonts' in document) {
      void (document as Document & { fonts: FontFaceSet }).fonts.ready.then(() => {
        if (!cancelled) fit();
      });
    }
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [ref, value, min]);
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
