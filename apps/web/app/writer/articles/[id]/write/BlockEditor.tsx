'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, ExternalLink, ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react';
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
  subtitle: string;
  lead: string;
  topic: string;
  coverImageUrl: string;
  blocks: ArticleBlock[];
  status: string;
  publishedAt: string | null;
  updatedAt: string;
};

type MenuItem = { type: BlockType | 'aside_point' | 'aside_caution' | 'aside_memo' | 'list_number' | 'heading3'; label: string; hint: string; keys: string };

const MENU: MenuItem[] = [
  { type: 'heading', label: '見出し', hint: '章の見出し（H2）', keys: 'h2 見出し midashi' },
  { type: 'heading3', label: '小見出し', hint: '節の見出し（H3）', keys: 'h3 小見出し' },
  { type: 'list', label: '箇条書き', hint: '1 行 1 項目', keys: 'list ul 箇条書き' },
  { type: 'list_number', label: '番号付きリスト', hint: '1 行 1 項目', keys: 'ol 番号 number' },
  { type: 'quote', label: '引用', hint: '言葉と出典', keys: 'quote 引用' },
  { type: 'aside_point', label: 'ポイント', hint: '罫で区切った補足', keys: 'point ポイント やること' },
  { type: 'aside_caution', label: '注意', hint: '気をつけること', keys: 'caution 注意' },
  { type: 'aside_memo', label: '先輩のひとこと', hint: '自分の実体験（ライムの縦線）', keys: 'memo ひとこと 私の場合' },
  { type: 'takeaways', label: 'この記事で分かること', hint: '冒頭の要点 3〜5 行', keys: 'takeaways 分かること 要点' },
  { type: 'checklist', label: 'チェックリスト', hint: '1 行 1 項目。先頭に [x] で済み', keys: 'check チェック' },
  { type: 'faq', label: 'Q&A', hint: 'Q: と A: の行', keys: 'faq qa 質問' },
  { type: 'terms', label: '用語', hint: '語 | 説明', keys: 'terms 用語' },
  { type: 'timeline', label: 'タイムライン', hint: '日付 | 出来事', keys: 'timeline 時系列 手順' },
  { type: 'proscons', label: '良い点・気になる点', hint: '2 列の比較', keys: 'pros cons 比較 良い点' },
  { type: 'stats', label: '数字の見出し', hint: '値 | ラベル（3 つまで）', keys: 'stats 数字' },
  { type: 'table', label: '表', hint: '1 行 1 段。列は | で区切る。1 行目は見出し', keys: 'table 表' },
  { type: 'image', label: '画像', hint: 'アップロード＋キャプション', keys: 'image 画像 写真' },
  { type: 'images', label: '画像 2〜3 枚', hint: '正方形で並べる', keys: 'images 画像 並べ' },
  { type: 'link_card', label: 'リンクカード', hint: '記事 / エキスパート / 外部サイト', keys: 'link card リンク' },
  { type: 'embed', label: '埋め込み', hint: 'YouTube / Google マップ / X / Instagram', keys: 'embed youtube map 埋め込み 動画 地図' },
  { type: 'footnotes', label: '脚注', hint: '出典を 1 行 1 つ', keys: 'footnote 脚注 出典' },
  { type: 'divider', label: '区切り線', hint: '短い罫', keys: 'divider hr 区切り' },
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

export function BlockEditor({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [subtitle, setSubtitle] = useState(initial.subtitle);
  const [lead, setLead] = useState(initial.lead);
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

  const payload = useCallback(
    () => ({ id: initial.id, title, subtitle, lead, topic, coverImageUrl: cover, blocks: compact(blocks) }),
    [initial.id, title, subtitle, lead, topic, cover, blocks],
  );

  const save = useCallback(async () => {
    setSaving(true);
    const res = await saveArticleBlocks(payload());
    setSaving(false);
    if (res.ok) {
      setSavedAt(res.data?.savedAt ?? new Date().toISOString());
      setDirty(false);
    } else toast.error(res.error);
    return res.ok;
  }, [payload]);

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
  }, [dirty, title, subtitle, lead, topic, cover, blocks, save]);

  const touch = () => setDirty(true);
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

  const chars = useMemo(() => blocks.reduce((n, b) => n + ('text' in b && typeof b.text === 'string' ? b.text.length : 0), 0) + lead.length, [blocks, lead]);

  return (
    <main className="bg-background text-foreground">
      {/* ===== ヘッダー（固定） ===== */}
      <div className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1120px] items-center gap-3 px-5 py-2.5 sm:px-8">
          <Link href="/writer/articles" className="text-[12.5px] text-neutral-500 hover:text-foreground">
            ← 記事一覧
          </Link>
          <span className="text-[12px] text-neutral-400">
            {saving ? '保存中…' : dirty ? '未保存の変更' : savedAt ? `保存済み ${fmtTime(savedAt)}` : ''}
          </span>
          <span className={'rounded-full border px-2.5 py-1 text-[11px] font-bold ' + (status === 'published' ? 'border-primary-500 bg-primary-100 text-primary-900' : 'border-border-strong text-neutral-600')}>
            {status === 'published' ? '公開中' : '下書き'}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Link href={`/articles/${initial.id}`} target="_blank" className="inline-flex items-center gap-1 rounded-full border border-border-strong bg-card px-3 py-1.5 text-[12px] font-bold hover:border-foreground">
              プレビュー <ExternalLink className="h-3 w-3" aria-hidden />
            </Link>
            <button type="button" onClick={() => void save()} disabled={saving || !dirty} className="rounded-full border border-border-strong bg-card px-3 py-1.5 text-[12px] font-bold hover:border-foreground disabled:opacity-40">
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

      <div className="mx-auto grid max-w-[1120px] grid-cols-1 gap-x-14 px-5 pb-40 pt-10 sm:px-8 lg:grid-cols-[200px_640px_1fr]">
        {/* ===== 左: 設定 ===== */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="space-y-4 text-[12.5px]">
            <div>
              <label className="mb-1 block text-[11px] font-bold tracking-[0.14em] text-neutral-500">テーマ</label>
              <select value={topic} onChange={(e) => (setTopic(e.target.value), touch())} className="h-9 w-full rounded-md border border-border bg-background px-2 text-[13px] focus:border-primary-500 focus:outline-none">
                <option value="">— 選ぶ —</option>
                {SPECIALTY_GROUPS.map((g) => (
                  <option key={g.code} value={g.code}>
                    {g.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-neutral-400">一覧のテーマタブと「同じテーマの記事」に使います</p>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold tracking-[0.14em] text-neutral-500">カバー写真（任意）</label>
              {cover ? (
                <div className="relative overflow-hidden rounded-lg bg-neutral-100 aspect-[3/2]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cover} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => (setCover(''), touch())} className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-neutral-700 shadow" aria-label="削除">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-5 text-[12px] text-neutral-500 hover:border-primary-300 hover:text-primary-700">
                  <ImagePlus className="h-4 w-4" /> 画像を選ぶ
                  <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && void onCover(e.target.files[0])} />
                </label>
              )}
            </div>
            <div className="border-t border-border pt-3 text-[11px] leading-[1.7] text-neutral-400">
              <p>{chars.toLocaleString('ja-JP')} 文字 · 読了 約 {Math.max(1, Math.round(chars / 500))} 分</p>
              <p className="mt-2">空の行で「/」を打つと部品を選べます。URL を 1 行貼って Enter でカード・埋め込みになります。</p>
              <p className="mt-1">**太字**、[文字](URL) が使えます。</p>
            </div>
          </div>
        </aside>

        {/* ===== 中央: 本文 ===== */}
        <div className="min-w-0">
          <textarea
            value={title}
            onChange={(e) => (setTitle(e.target.value.replace(/\n/g, '')), touch())}
            placeholder="タイトル"
            rows={2}
            className="w-full resize-none border-0 bg-transparent p-0 text-[36px] font-bold leading-[1.32] tracking-[-0.025em] placeholder:text-neutral-300 focus:outline-none max-sm:text-[26px]"
          />
          <textarea
            value={subtitle}
            onChange={(e) => (setSubtitle(e.target.value.replace(/\n/g, '')), touch())}
            placeholder="サブタイトル — この記事で何が分かるか、1 文で"
            rows={2}
            className="mt-2 w-full resize-none border-0 bg-transparent p-0 text-[18px] leading-[1.75] text-neutral-700 placeholder:text-neutral-300 focus:outline-none"
          />
          <div className="my-6 border-t border-border" />
          <AutoTextarea
            value={lead}
            onChange={(v) => (setLead(v), touch())}
            placeholder="リード文 — 読む理由を 3 行以内で（任意）"
            className="text-[19px] leading-[1.85] text-neutral-800"
          />
          <div className="mt-8 space-y-1">
            {blocks.map((b, i) => (
              <BlockRow
                key={b.id}
                block={b}
                index={i}
                total={blocks.length}
                autoFocus={focusId === b.id}
                onChange={(patch) => update(b.id, patch)}
                onReplace={(next) => replace(b.id, next)}
                onEnter={() => insertAfter(b.id, { id: newBlockId(), type: 'paragraph', text: '' })}
                onRemove={() => remove(b.id)}
                onMove={(d) => move(b.id, d)}
                onUrl={(url) => convertUrl(b.id, url)}
                onPick={(t) => replace(b.id, make(t))}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => insertAfter(blocks[blocks.length - 1]?.id ?? null, { id: newBlockId(), type: 'paragraph', text: '' })}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-card px-3.5 py-1.5 text-[12.5px] font-semibold text-neutral-700 hover:border-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> 段落を追加
          </button>
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
  onUrl,
  onPick,
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
  onUrl: (url: string) => void;
  onPick: (t: MenuItem['type']) => void;
}) {
  const [menu, setMenu] = useState<{ q: string; cursor: number } | null>(null);
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
              placeholder={index === 0 ? '本文を書く。空の行で「/」を打つと部品を選べます' : ''}
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
            <input value={block.label ?? ''} onChange={(e) => onChange({ label: e.target.value } as Partial<ArticleBlock>)} placeholder={block.kind === 'memo' ? '私の場合' : block.kind === 'caution' ? '注意' : 'ポイント'} className="mb-1 w-full border-0 bg-transparent p-0 text-[11.5px] font-bold tracking-[0.18em] placeholder:text-neutral-300 focus:outline-none" />
            <AutoTextarea value={block.text} autoFocus={autoFocus} placeholder="本文" className="text-[15px] leading-[1.85] text-neutral-700" onChange={(v) => onChange({ text: v })} />
          </div>
        );
      case 'takeaways':
        return (
          <div className="rounded-xl bg-neutral-100 px-5 py-4">
            <b className="mb-1 block text-[11.5px] tracking-[0.18em] text-neutral-500">この記事で分かること</b>
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
            <div><b className="mb-1 block text-[11.5px] tracking-[0.18em] text-neutral-500">良い点</b><Lines value={block.pros.join('\n')} placeholder="1 行 1 つ" autoFocus={autoFocus} onChange={(v) => onChange({ pros: lines(v) } as Partial<ArticleBlock>)} /></div>
            <div><b className="mb-1 block text-[11.5px] tracking-[0.18em] text-neutral-500">気になる点</b><Lines value={block.cons.join('\n')} placeholder="1 行 1 つ" onChange={(v) => onChange({ cons: lines(v) } as Partial<ArticleBlock>)} /></div>
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
    <div className="group relative rounded-lg px-3 py-1.5 transition hover:bg-neutral-50">
      <div className="pointer-events-none absolute -left-1 top-1.5 text-[10px] tracking-[0.1em] text-neutral-300 opacity-0 transition group-hover:opacity-100 max-lg:hidden" style={{ transform: 'translateX(-100%)' }}>
        {label}
      </div>
      <div className="absolute right-2 top-1 flex items-center gap-0.5 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
        <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="rounded p-1 text-neutral-400 hover:bg-neutral-200 hover:text-foreground disabled:opacity-30" aria-label="上へ"><ArrowUp className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} className="rounded p-1 text-neutral-400 hover:bg-neutral-200 hover:text-foreground disabled:opacity-30" aria-label="下へ"><ArrowDown className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={onRemove} className="rounded p-1 text-neutral-400 hover:bg-neutral-200 hover:text-danger-500" aria-label="削除"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      {body}
    </div>
  );
}

const LABEL: Record<ArticleBlock['type'], string> = {
  paragraph: '段落',
  heading: '見出し',
  list: 'リスト',
  quote: '引用',
  aside: '補足',
  table: '表',
  image: '画像',
  images: '画像',
  takeaways: '要点',
  checklist: 'チェック',
  faq: 'Q&A',
  terms: '用語',
  timeline: '時系列',
  proscons: '比較',
  stats: '数字',
  footnotes: '脚注',
  divider: '区切り',
  link_card: 'リンク',
  embed: '埋め込み',
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
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);
  return (
    <div>
      <textarea ref={ref} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} placeholder={placeholder} rows={1} className={'block w-full resize-none overflow-hidden border-0 bg-transparent p-0 placeholder:text-neutral-300 focus:outline-none ' + className} />
      {extra ? <div className="mt-1">{extra}</div> : null}
    </div>
  );
}

/** 1 行 1 項目のテキストエリア（ローカル state で編集し、blur / 入力ごとに parse して親へ） */
function Lines({ value, onChange, placeholder, autoFocus, minRows = 2, mono = false }: { value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean; minRows?: number; mono?: boolean }) {
  const [local, setLocal] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.max(el.scrollHeight, minRows * 28)}px`;
  }, [local, minRows]);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);
  return (
    <textarea
      ref={ref}
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
        <span className="rounded-full bg-neutral-100 px-2 py-[3px] text-[10.5px] font-bold">{block.type === 'embed' ? `埋め込み · ${block.provider}` : `リンクカード · ${block.kind}`}</span>
        <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); resolve(); } }} placeholder="https://…（記事 / エキスパート / YouTube / Google マップ / X / 外部サイト）" className="h-9 min-w-0 flex-1 rounded-md border border-border px-2 text-[13px] focus:border-primary-500 focus:outline-none" />
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

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
