'use client';

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from 'react';
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { flushSync } from 'react-dom';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Ellipsis, ExternalLink, Eye, GripVertical, Loader2, Pencil, Plus } from 'lucide-react';
import { Prose } from '@/components/articles/Prose';
import type { ArticleBlock } from '@/lib/articles/blocks';
import { SPECIALTY_GROUPS } from '@/lib/experts/specialties';
import { uploadImage } from '@/lib/storage/uploadImage';
import { publishBlocksArticle, saveArticleBlocks, unpublishBlocksArticle } from './actions';
import { BLOCK_KINDS, TEXT_KINDS, TURN_INTO_KINDS, type EditorKind } from './BLOCK_KINDS';
import {
  caretAtEnd,
  caretAtStart,
  compact,
  createBlock,
  cycleHeading,
  cycleList,
  duplicate,
  findBlock,
  indexOfBlock,
  insertAfter,
  isEditableText,
  isLinkAction,
  kindOf,
  move,
  remove,
  replaceBlock,
  toggleQuote,
  turnInto,
  type Caret,
  type OpResult,
} from './blockOps';
import {
  BlockField,
  BOXED_INPUT,
  FieldFocusProvider,
  HINT,
  MAX_UPLOAD_BYTES,
  OUTLINE_BUTTON,
  prepareImage,
  SOLID_BUTTON,
  useCreateFieldFocus,
  useLinkResolver,
  type FieldContext,
} from './fields';
import { FormatBar } from './FormatBar';
import { InsertSheet, Sheet } from './InsertSheet';
import { useBlockKeymap, type FieldPos } from './useBlockKeymap';

/**
 * ブロック形式の記事エディタ（0091 / エディタ作り直し）。402px の画面をそのまま作る。
 *
 *   44px のヘッダ（← / 状態 / 見る / …。**公開ボタンは置かない**）
 *   カバー写真 → タイトル → ひとこと説明 → 本文のブロック列
 *   キーボードの真上に書式バー（＋ / 見出し / 箇条書き / 引用 / 写真 / リンク / 戻す / この行）
 *
 * 「見る（プレビュー）」だけヘッダに置いてあるのは、402px の書式バーに 8 個より多く並べると
 * 右端が画面外に出て、隠れていること自体が書き手に伝わらないため。
 * 見る／書くは行ではなく記事全体の切り替えなので、保存状態と同じヘッダが収まりもよい。
 *
 * このファイルが持つのは「外枠」だけ。
 * ブロック 1 つぶんの中身は fields/BlockField、キー処理は useBlockKeymap、
 * 配列の書き換えは blockOps（純粋関数）に置いてある。
 *
 * 作り直しで直したこと:
 *   - 挿入の入口を ＋ のボトムシートに一本化した（「/」は PC の速記として残すだけ）
 *   - 書式を変えても本文テキストが消えない（blockOps.turnInto がテキストを持ち回す）
 *   - キーの分岐は必ず isComposing を先に見る（useBlockKeymap）。日本語の変換確定で崩れない
 *   - 行の key は b.id だけ（rev を混ぜない）。⌘Z を window で横取りするのもやめたので、
 *     文字の取り消しは textarea 標準のまま。エディタ側の履歴は**構造の変更だけ**を積み、
 *     書式バーの「戻す」がそれ
 *   - 入力欄は全て 16px 以上、タップできるものは 44px 以上、hover でしか出ない UI は無し
 */

type Initial = {
  id: string;
  title: string;
  /** ひとこと説明。saveSchema（actions.ts:148）が受け取り、:463 で articles.subtitle に保存される */
  subtitle?: string;
  topic: string;
  coverImageUrl: string;
  blocks: ArticleBlock[];
  status: string;
  publishedAt: string | null;
  updatedAt: string;
};

/** 構造の変更だけを積む履歴の上限 */
const HISTORY_LIMIT = 60;

/** SSR では useLayoutEffect が警告になるので、サーバーでは useEffect にする */
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** 書式バーのトグルが効く行か（1 つの文章として読める種類だけ） */
function canFormatKind(kind: EditorKind | null): boolean {
  return kind !== null && TEXT_KINDS.includes(kind);
}

export function BlockEditor({ initial, demo = false }: { initial: Initial; demo?: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [subtitle, setSubtitle] = useState(initial.subtitle ?? '');
  const [topic, setTopic] = useState(initial.topic);
  const [cover, setCover] = useState(initial.coverImageUrl);
  const [blocks, setBlocks] = useState<ArticleBlock[]>(() => (initial.blocks.length > 0 ? initial.blocks : [createBlock('paragraph')]));
  const [status, setStatus] = useState(initial.status);
  const [savedAt, setSavedAt] = useState<string | null>(initial.updatedAt);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [preview, setPreview] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [pending, start] = useTransition();
  const [sheet, setSheet] = useState<'none' | 'insert' | 'turn' | 'link' | 'more'>('none');

  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  /**
   * 「書き手が何か変えた」回数。保存を始めた時点の値を控えておき、
   * 返事が返ってきたときに変わっていたら **dirty を落とさない**。
   * これが無いと、通信中に打った文字が「保存済み」表示のまま消える
   */
  const editSeq = useRef(0);
  /** 変更があったことの記録。setDirty(true) は必ずこれ経由で呼ぶ */
  const markDirty = useCallback(() => {
    editSeq.current += 1;
    setDirty(true);
  }, []);

  // ===== キャレットの復元（入力欄の登録簿は fields/fieldFocus が持つ） =====
  const fieldFocus = useCreateFieldFocus();
  const [active, setActive] = useState<FieldPos | null>(null);
  /** タイトル / ひとこと説明にカーソルがある（＝本文の行はどこも選んでいない） */
  const [atHead, setAtHead] = useState(false);
  const [wanted, setWanted] = useState<{ caret: Caret; n: number } | null>(null);
  const caretSeq = useRef(0);

  /** 操作のあと、この場所にキャレットを戻す（実際の focus は state が反映されたあとの effect で） */
  const focusCaret = useCallback((caret: Caret) => {
    caretSeq.current += 1;
    setWanted({ caret, n: caretSeq.current });
  }, []);

  useEffect(() => {
    if (!wanted) return;
    fieldFocus.focus(wanted.caret);
    // すでに focus 済みの要素だと onFocus が飛ばないので、ここでも今の行を記録する
    const next: FieldPos = { blockId: wanted.caret.blockId, row: wanted.caret.row, col: wanted.caret.col };
    setAtHead(false);
    setActive((cur) => (samePos(cur, next) ? cur : next));
  }, [wanted, fieldFocus]);

  // ===== 履歴（構造の変更だけ） =====
  /** 戻し先。blocks と「そのときカーソルがあった行」を一緒に持つ（戻したあと行方不明にならないように） */
  type Snap = { blocks: ArticleBlock[]; blockId: string | null };
  const past = useRef<Snap[]>([]);
  const future = useRef<Snap[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  const activeRef = useRef<FieldPos | null>(null);
  activeRef.current = active;

  const snapshot = useCallback((): Snap => ({ blocks: blocksRef.current, blockId: activeRef.current?.blockId ?? null }), []);

  /** 戻す／やり直すで共通の書き戻し。戻した先の行の末尾にキャレットを置く */
  const restore = useCallback(
    (snap: Snap) => {
      blocksRef.current = snap.blocks;
      setBlocks(snap.blocks);
      markDirty();
      const target = (snap.blockId ? findBlock(snap.blocks, snap.blockId) : undefined) ?? snap.blocks[0];
      if (target) focusCaret(caretAtEnd(target));
    },
    [focusCaret, markDirty],
  );

  /** 行が増える・種類が変わるなど、構造が変わる操作 */
  const apply = useCallback(
    (r: OpResult) => {
      if (r.blocks !== blocksRef.current) {
        // 文字入力の取り消しは textarea 標準の ⌘Z に任せ、ここには積まない
        past.current = [...past.current, snapshot()].slice(-HISTORY_LIMIT);
        future.current = []; // 新しい操作をしたら「やり直す」の行き先は消える
        setUndoCount(past.current.length);
        blocksRef.current = r.blocks;
        setBlocks(r.blocks);
        markDirty();
      }
      if (r.caret) focusCaret(r.caret);
    },
    [focusCaret, markDirty, snapshot],
  );

  /** 1 文字打つたびの書き戻し。キャレットは動かさないし履歴にも積まない */
  const update = useCallback(
    (fn: (bs: ArticleBlock[]) => ArticleBlock[]) => {
      const next = fn(blocksRef.current);
      if (next === blocksRef.current) return;
      blocksRef.current = next;
      setBlocks(next);
      markDirty();
    },
    [markDirty],
  );

  const redoStructure = useCallback(() => {
    const next = future.current[future.current.length - 1];
    if (!next) return;
    future.current = future.current.slice(0, -1);
    past.current = [...past.current, snapshot()].slice(-HISTORY_LIMIT);
    setUndoCount(past.current.length);
    restore(next);
  }, [restore, snapshot]);

  /**
   * 書式バーの「戻す」。**戻す前の状態は future に積む**ので、
   * 「見出しにしてから打った文字」を戻してしまっても、やり直しで取り返せる。
   * バーは 402px に 8 個までなので「やり直す」はトーストのボタンとして出す
   */
  const undoStructure = useCallback(() => {
    const prev = past.current[past.current.length - 1];
    if (!prev) return;
    past.current = past.current.slice(0, -1);
    future.current = [...future.current, snapshot()].slice(-HISTORY_LIMIT);
    setUndoCount(past.current.length);
    restore(prev);
    toast('戻しました', {
      duration: 6000,
      action: { label: 'やり直す', onClick: () => redoStructure() },
    });
  }, [redoStructure, restore, snapshot]);

  const keymap = useBlockKeymap({ blocks, apply, moveCaret: focusCaret });

  const onFocusField = useCallback((pos: FieldPos) => {
    setAtHead(false);
    setActive((cur) => (samePos(cur, pos) ? cur : pos));
  }, []);

  // ===== 追加（＋ のボトムシートが唯一の正規ルート） =====
  /**
   * いまの行の下に入れる。空の段落を選んでいたらそこを置き換える（空行が残らない）。
   * タイトル / ひとこと説明にカーソルがあるときは「記事の先頭」に入れる。
   * （書き手の感覚では「タイトルの次」であって、記事の末尾ではない）
   */
  const insertBlock = useCallback(
    (made: ArticleBlock) => {
      const list = blocksRef.current;
      const cur = !atHead && active?.blockId ? findBlock(list, active.blockId) : undefined;
      const emptyPara = cur && cur.type === 'paragraph' && cur.text.trim() === '';
      let res: OpResult;
      if (emptyPara && cur) res = replaceBlock(list, cur.id, made);
      else if (cur) res = insertAfter(list, cur.id, made);
      else if (atHead) res = { blocks: [made, ...list], caret: caretAtStart(made) };
      // どこも選んでいない（開いた直後など）ときだけ末尾に足す
      else res = insertAfter(list, list[list.length - 1]?.id ?? null, made);

      if (isEditableText(made)) {
        // 入れたばかりのブロックは先頭から書き始める（表なら左上のセル）
        res = { blocks: res.blocks, caret: caretAtStart(made) };
      } else {
        // 写真・区切り線・リンクの後ろには必ず空の段落を置く（書き続けられなくなるのを防ぐ）
        const i = indexOfBlock(res.blocks, made.id);
        const after = i >= 0 ? res.blocks[i + 1] : undefined;
        // キャレットは「その次の書ける行」へ。写真そのものは文字が打てないので、
        // ここを写真のままにするとキーボードが閉じて書き手がもう一度タップすることになる
        if (!after || !isEditableText(after)) res = insertAfter(res.blocks, made.id, createBlock('paragraph'));
        else res = { blocks: res.blocks, caret: caretAtStart(after) };
      }
      // iOS Safari は「ユーザー操作のコールスタックの外」で focus() してもキーボードを出さない。
      // state 反映を待つ effect 任せにすると ＋ → 見出し のあと自分でもう一度行をタップさせることになるので、
      // flushSync で描き切ってから**同じスタックの中で**キャレットを移す
      const caret = res.caret;
      flushSync(() => apply(res));
      if (caret) fieldFocus.focus(caret);
    },
    [active, apply, atHead, fieldFocus],
  );

  const [linkUrl, setLinkUrl] = useState('');
  const openLinkSheet = useCallback(() => {
    setLinkUrl('');
    setSheet('link');
  }, []);

  const pickInsert = (kind: EditorKind) => {
    setSheet('none');
    // 「リンクを貼る」だけは挿入ではなく URL を尋ねる操作（空のリンクは保存形式に無い）
    if (isLinkAction(kind)) {
      openLinkSheet();
      return;
    }
    insertBlock(createBlock(kind));
  };

  // ===== リンク（URL 1 本 → カード / 埋め込み。2 択は見せない） =====
  const { resolving, resolve } = useLinkResolver();
  const submitUrl = () => {
    void (async () => {
      const made = await resolve(linkUrl);
      if (!made) return;
      setSheet('none');
      setLinkUrl('');
      insertBlock(made);
    })();
  };

  // ===== 写真のアップロード（カバーと「本文への貼り付け」で同じ手順を通す） =====
  /**
   * iPhone の写真は 1 枚 10〜12MB・HEIC で、Server Action の body 上限（既定 1MB）に届く前に落ちる。
   * fields/ImageField と同じく **prepareImage で長辺 1600px・JPEG に落としてから**送る。
   * ここを素通しにすると、スマホからカバー写真を選ぶとほぼ必ず失敗する
   */
  const uploadPhoto = useCallback(async (file: File): Promise<string | null> => {
    setPhotoBusy(true);
    try {
      const prepared = await prepareImage(file);
      if (prepared.file.size > MAX_UPLOAD_BYTES) {
        toast.error('この写真は大きすぎます。別の写真か、写真アプリで小さくしたものを選んでください');
        return null;
      }
      const fd = new FormData();
      fd.set('file', prepared.file);
      const res = await uploadImage(fd);
      if (!res.ok) {
        toast.error(res.error);
        return null;
      }
      return res.url;
    } catch {
      toast.error('写真を読み込めませんでした。もう一度お試しください');
      return null;
    } finally {
      setPhotoBusy(false);
    }
  }, []);

  const coverRef = useRef<HTMLInputElement>(null);
  const onCoverFile = async (file: File | undefined) => {
    if (!file) return;
    const url = await uploadPhoto(file);
    if (!url) return;
    setCover(url);
    markDirty();
  };

  /** 本文を書いている途中で写真を貼り付けた（⌘V / ドロップ）とき。その行の直後に写真ブロックを足す */
  const onPasteFiles = useCallback(
    (files: FileList, afterBlockId: string) => {
      // HEIC はブラウザによって type が空で来るので、拡張子でも拾う（ImageField と同じ判定）
      const file = Array.from(files).find((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
      if (!file) return;
      void (async () => {
        const url = await uploadPhoto(file);
        if (!url) return;
        const made = createBlock('image');
        const photo: ArticleBlock = made.type === 'image' ? { ...made, url } : made;
        // キャレットは書いていた行に残す（貼り付けた瞬間に写真へ飛ばさない）
        apply({ blocks: insertAfter(blocksRef.current, afterBlockId, photo).blocks, caret: null });
      })();
    },
    [apply, uploadPhoto],
  );

  const ctx = useMemo<FieldContext>(
    () => ({ blocks, apply, update, keymap, onFocusField, onPasteFiles }),
    [blocks, apply, update, keymap, onFocusField, onPasteFiles],
  );

  // ===== 保存 =====
  const payload = useCallback(
    () => ({
      id: initial.id,
      title,
      // subtitle は saveSchema（actions.ts:148）が受け取り、:463 で articles.subtitle に入る
      subtitle,
      topic,
      coverImageUrl: cover,
      blocks: compact(blocksRef.current),
    }),
    [initial.id, title, subtitle, topic, cover],
  );

  /** 飛行中の保存。同じものが 2 本走らないようにする（多重 POST と、遅れて届く返事の取り違えを防ぐ） */
  const inflight = useRef<Promise<boolean> | null>(null);

  const save = useCallback((): Promise<boolean> => {
    if (demo) {
      setSavedAt(new Date().toISOString());
      setDirty(false);
      setFailed(false);
      return Promise.resolve(true);
    }
    if (inflight.current) return inflight.current; // 飛行中なら、その保存に相乗りする
    // 送り出した時点の編集回数を控える。返事が返るまでに書き手が打っていたら dirty を落とさない
    const seq = editSeq.current;
    setSaving(true);
    const run = (async () => {
      const res = await saveArticleBlocks(payload());
      inflight.current = null;
      setSaving(false);
      if (res.ok) {
        setSavedAt(res.data?.savedAt ?? new Date().toISOString());
        setFailed(false);
        setAttempt(0);
        // 通信中に打った文字は今回の送信に入っていない。dirty を残して次の自動保存に拾わせる
        if (seq === editSeq.current) setDirty(false);
        return true;
      }
      // 失敗しても書いたものは消さない。間隔を空けて自動でやり直す（旧エディタは toast を出すだけだった）
      setFailed(true);
      setAttempt((n) => n + 1);
      return false;
    })();
    inflight.current = run;
    return run;
  }, [demo, payload]);

  /** 公開の前など「いま書いてあるものを確実に送りたい」とき。相乗りした場合はもう一度送る */
  const saveAll = useCallback(async (): Promise<boolean> => {
    const ok = await save();
    if (!ok) return false;
    if (dirtyRef.current) return save();
    return true;
  }, [save]);

  // 自動保存（1.5 秒）。失敗したら 4 秒 → 8 秒 …と空けて 4 回まで。それ以上は状態表示のタップで手動。
  // saving を deps に入れてあるので、飛行中に打ったぶんは保存が終わった時点で予約し直される
  useEffect(() => {
    if (!dirty || saving) return;
    if (failed && attempt >= 4) return;
    const wait = failed ? Math.min(30000, 4000 * 2 ** Math.max(0, attempt - 1)) : 1500;
    const t = setTimeout(() => {
      void save();
    }, wait);
    return () => clearTimeout(t);
  }, [dirty, saving, failed, attempt, blocks, title, subtitle, topic, cover, save]);

  // ⌘S だけ受ける。⌘Z は textarea 標準の取り消しに返すので**横取りしない**
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 's') return;
      e.preventDefault();
      void save();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  useEffect(() => {
    if (demo || !dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [demo, dirty]);

  // ===== 公開（ヘッダには置かず「…」の中に入れる） =====
  const onPublish = () => {
    if (demo) {
      toast('デモでは公開できません', { description: 'ログインして「ブログを書く」から実際の記事を作成できます' });
      return;
    }
    start(async () => {
      const ok = await saveAll();
      if (!ok) return;
      const res = await publishBlocksArticle({ id: initial.id });
      if (res.ok) {
        setStatus('published');
        setSheet('none');
        toast.success('公開しました');
        router.refresh();
      } else toast.error(res.error);
    });
  };
  const onUnpublish = () => {
    if (demo) return;
    start(async () => {
      const res = await unpublishBlocksArticle({ id: initial.id });
      if (res.ok) {
        setStatus('draft');
        setSheet('none');
        toast.success('下書きに戻しました');
      } else toast.error(res.error);
    });
  };

  // ===== 書式バーがつなぐ操作 =====
  const activeBlock = active ? findBlock(blocks, active.blockId) ?? null : null;
  const activeKind = activeBlock ? kindOf(activeBlock) : null;
  const activeIndex = activeBlock ? indexOfBlock(blocks, activeBlock.id) : -1;
  const canFormat = canFormatKind(activeKind);
  const turnActive = (kind: EditorKind) => {
    if (!activeBlock) return;
    apply(turnInto(blocksRef.current, activeBlock.id, kind));
  };

  const chars = useMemo(
    () => blocks.reduce((n, b) => n + ('text' in b && typeof b.text === 'string' ? b.text.length : 0), 0),
    [blocks],
  );

  // ===== ドラッグでの並べ替え（PC の速記。402px の主導線は書式バーの ↑ ↓） =====
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<{ id: string; place: 'before' | 'after' } | null>(null);
  const reorder = (fromId: string, toId: string, place: 'before' | 'after') => {
    if (fromId === toId) return;
    const list = blocksRef.current;
    const item = findBlock(list, fromId);
    if (!item) return;
    const rest = list.filter((b) => b.id !== fromId);
    const i = rest.findIndex((b) => b.id === toId);
    if (i < 0) return;
    const at = place === 'after' ? i + 1 : i;
    apply({ blocks: [...rest.slice(0, at), item, ...rest.slice(at)], caret: null });
  };

  const statusText = demo
    ? 'デモ（保存されません）'
    : saving
      ? '保存中…'
      : failed
        ? '保存できません・タップで再試行'
        : dirty
          ? '書きかけ'
          : savedAt
            ? `保存済み ${fmtTime(savedAt)}`
            : '';
  const dotClass = failed ? 'bg-danger-500' : saving || dirty ? 'bg-neutral-300' : 'bg-primary-500';

  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      {/* ===== 44px のヘッダ。← / 状態 / 見る / …（公開ボタンは置かない） ===== */}
      <header className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-11 max-w-[720px] items-center gap-1 px-1.5 sm:px-6">
          <Link
            href={demo ? '/' : '/writer/articles'}
            aria-label={demo ? 'Locore へ戻る' : '記事一覧へ戻る'}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-neutral-600 active:bg-neutral-100"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={() => {
              setAttempt(0);
              void save();
            }}
            className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full px-2 text-left"
            aria-label={statusText || 'いま保存する'}
          >
            <span className={'h-2 w-2 shrink-0 rounded-full ' + dotClass} aria-hidden />
            <span className="min-w-0 truncate text-[12.5px] text-neutral-500">{statusText}</span>
            {saving || photoBusy ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-neutral-400" aria-hidden /> : null}
          </button>
          {/* 見る／書くは記事全体の切り替えなのでヘッダに置く。
              書式バーは 402px に 8 個までしか置けず、ここに入れると右端が画面外に出る */}
          <button
            type="button"
            onClick={() => setPreview((v) => !v)}
            aria-pressed={preview}
            aria-label={preview ? '書くに戻る' : '記事の見え方を見る'}
            className={
              'grid h-11 w-11 shrink-0 place-items-center rounded-full active:bg-neutral-100 ' +
              (preview ? 'text-foreground' : 'text-neutral-600')
            }
          >
            {preview ? <Pencil className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
          </button>
          <button
            type="button"
            onClick={() => setSheet('more')}
            aria-label="この記事の設定"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-neutral-600 active:bg-neutral-100"
          >
            <Ellipsis className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </header>

      {/* 書式バー（52px）に隠れないよう、下を空けておく */}
      <div className="mx-auto max-w-[720px] px-5 pb-[calc(104px+env(safe-area-inset-bottom))] pt-5 sm:px-8">
        {cover ? (
          <div className="mb-5">
            <div className="overflow-hidden rounded-xl bg-neutral-100 aspect-[3/2]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover} alt="" className="h-full w-full object-cover" />
            </div>
            {preview ? null : (
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => coverRef.current?.click()} className={OUTLINE_BUTTON}>
                  カバー写真を変える
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCover('');
                    markDirty();
                  }}
                  className={OUTLINE_BUTTON}
                >
                  外す
                </button>
              </div>
            )}
          </div>
        ) : null}

        {preview ? (
          <article>
            <h1 className="text-[26px] font-bold leading-[1.34] tracking-[-0.02em] sm:text-[34px]">{title || 'タイトルがまだありません'}</h1>
            {subtitle ? <p className="mt-3 text-[16px] leading-[1.75] text-neutral-700">{subtitle}</p> : null}
            <div className="mt-7">
              <Prose blocks={compact(blocks)} />
            </div>
          </article>
        ) : (
          <>
            <PlainTextarea
              value={title}
              placeholder="タイトル"
              ariaLabel="タイトル"
              className="text-[26px] font-bold leading-[1.34] tracking-[-0.02em] sm:text-[34px]"
              onFocus={() => {
                // 本文のどの行も選んでいない状態。この間に ＋ を押したら「記事の先頭」に入れる
                setActive(null);
                setAtHead(true);
              }}
              onValue={(v) => {
                setTitle(v.replace(/\n/g, ''));
                markDirty();
              }}
            />
            {/* 16px を下回ると iOS Safari がフォーカスのたびに拡大するので、
                小さく見せたいひとこと説明も 16px のまま色で従属させる */}
            <PlainTextarea
              value={subtitle}
              placeholder="ひとこと説明（任意）"
              ariaLabel="ひとこと説明"
              className="mt-2 text-[16px] leading-[1.75] text-neutral-500"
              onFocus={() => {
                setActive(null);
                setAtHead(true);
              }}
              onValue={(v) => {
                setSubtitle(v.replace(/\n/g, ''));
                markDirty();
              }}
            />

            <FieldFocusProvider value={fieldFocus}>
              <div className="mt-6">
                {blocks.map((b) => (
                  <BlockRow
                    key={b.id}
                    block={b}
                    ctx={ctx}
                    selected={active?.blockId === b.id}
                    onSlash={() => {
                      setActive({ blockId: b.id });
                      setSheet('insert');
                    }}
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
            </FieldFocusProvider>

            {/* 記事のいちばん下から書き足すための入口 */}
            <button
              type="button"
              onClick={() => {
                const last = blocksRef.current[blocksRef.current.length - 1];
                if (last && last.type === 'paragraph' && last.text === '') focusCaret({ blockId: last.id, offset: 0 });
                else apply(insertAfter(blocksRef.current, last?.id ?? null, createBlock('paragraph')));
              }}
              className="mt-3 flex min-h-[44px] w-full items-center gap-2 rounded-lg px-2 text-left text-[14px] text-neutral-400 active:bg-neutral-100"
            >
              <Plus className="h-4 w-4" aria-hidden /> ここから書き足す
            </button>
          </>
        )}
      </div>

      {/* 見ている間は書式バーを出さない（直せるものが 1 つも無い）。ヘッダの鉛筆で書くに戻る */}
      {preview ? null : (
      <FormatBar
        kind={activeKind}
        canFormat={canFormat}
        hasBlock={!!activeBlock}
        canUndo={undoCount > 0}
        canMoveUp={activeIndex > 0}
        canMoveDown={activeIndex >= 0 && activeIndex < blocks.length - 1}
        onInsert={() => setSheet('insert')}
        onHeading={() => turnActive(cycleHeading(activeKind))}
        onList={() => turnActive(cycleList(activeKind))}
        onQuote={() => turnActive(toggleQuote(activeKind))}
        onPhoto={() => insertBlock(createBlock('image'))}
        onLink={openLinkSheet}
        onUndo={undoStructure}
        onTurnInto={() => setSheet('turn')}
        onMove={(dir) => activeBlock && apply(move(blocksRef.current, activeBlock.id, dir))}
        onDuplicate={() => activeBlock && apply(duplicate(blocksRef.current, activeBlock.id))}
        onRemove={() => activeBlock && apply(remove(blocksRef.current, activeBlock.id))}
      />
      )}

      {/* ＋ = 挿入の唯一の正規ルート。ここに載っているものが作れる全部 */}
      <InsertSheet open={sheet === 'insert'} title="追加する" items={BLOCK_KINDS} onPick={pickInsert} onClose={() => setSheet('none')} />
      <InsertSheet
        open={sheet === 'turn'}
        title="種類を変える"
        items={TURN_INTO_KINDS}
        activeKind={activeKind}
        onPick={(kind) => {
          setSheet('none');
          turnActive(kind);
        }}
        onClose={() => setSheet('none')}
      />

      <Sheet open={sheet === 'link'} title="リンクを貼る" onClose={() => setSheet('none')}>
        <div className="flex flex-col gap-2 pb-2">
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              // 変換中の Enter は確定。ここでは何もしない
              if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
              e.preventDefault();
              submitUrl();
            }}
            type="url"
            inputMode="url"
            autoComplete="off"
            // シートを開いたタップと同じ流れで focus する（iOS は操作の外で focus してもキーボードが出ない）
            autoFocus
            placeholder="https://…"
            aria-label="貼りたい URL"
            className={BOXED_INPUT}
          />
          <p className={HINT}>記事・お店の地図・動画・SNS の URL を貼ると、その形で表示されます</p>
          <button type="button" onClick={submitUrl} disabled={resolving || !linkUrl.trim()} className={SOLID_BUTTON}>
            {resolving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {resolving ? '読み込み中…' : '読み込む'}
          </button>
        </div>
      </Sheet>

      <Sheet open={sheet === 'more'} title="この記事" onClose={() => setSheet('none')}>
        <div className="flex flex-col gap-3 pb-2">
          <label className="flex flex-col gap-1">
            <span className="text-[12.5px] font-bold text-neutral-500">テーマ</span>
            <select
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                markDirty();
              }}
              className="min-h-[44px] rounded-lg border border-border bg-background px-3 text-[16px] focus:border-primary-500 focus:outline-none"
            >
              <option value="">— 選ぶ —</option>
              {SPECIALTY_GROUPS.map((g) => (
                <option key={g.code} value={g.code}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => coverRef.current?.click()} className={OUTLINE_BUTTON}>
            {cover ? 'カバー写真を変える' : 'カバー写真を選ぶ'}
          </button>
          <Link
            href={demo ? '/articles/e9cc342f-e475-5161-a3b4-006706e81c6d' : `/articles/${initial.id}`}
            target="_blank"
            className={OUTLINE_BUTTON}
          >
            {demo ? '記事ページの例を開く' : '記事ページを開く'}
            <ExternalLink className="h-4 w-4 text-neutral-400" aria-hidden />
          </Link>
          {status === 'published' ? (
            <button type="button" onClick={onUnpublish} disabled={pending} className={OUTLINE_BUTTON}>
              下書きに戻す
            </button>
          ) : (
            <button type="button" onClick={onPublish} disabled={pending} className={SOLID_BUTTON}>
              {pending ? '処理中…' : '公開する'}
            </button>
          )}
          <p className={HINT}>
            {chars.toLocaleString('ja-JP')} 文字 · 読むのに約 {Math.max(1, Math.round(chars / 500))} 分
            {status === 'published' ? ' · 公開中' : ' · 下書き'}
          </p>
        </div>
      </Sheet>

      <input
        ref={coverRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = ''; // 同じ写真をもう一度選べるようにする
          void onCoverFile(f);
        }}
      />
    </main>
  );
}

/* ===================== ブロックの枠 ===================== */

/**
 * ブロック 1 つぶんの外枠。中身は fields/BlockField に任せ、ここは
 * 「選ばれている見た目」「並べ替え」「PC の / 速記」だけを持つ。
 */
function BlockRow({
  block,
  ctx,
  selected,
  onSlash,
  dragging,
  dragActive,
  dropHint,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  block: ArticleBlock;
  ctx: FieldContext;
  selected: boolean;
  /** PC の速記: 空の段落で「/」を打ったとき（スマホの主導線は書式バーの ＋） */
  onSlash: () => void;
  dragging: boolean;
  dragActive: boolean;
  dropHint: 'before' | 'after' | null;
  onDragStart: () => void;
  onDragOver: (place: 'before' | 'after') => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const [grab, setGrab] = useState(false);
  const editable = isEditableText(block);

  return (
    <div
      draggable={grab}
      // 文字が打てないブロック（写真・区切り線・リンク）も、触れば「選ばれている」状態にする。
      // タブ順は増やさない（-1）ので、キーボード操作の邪魔にはならない
      tabIndex={editable ? undefined : -1}
      onFocusCapture={() => ctx.onFocusField?.({ blockId: block.id })}
      onClick={(e) => {
        if (editable) return;
        const t = e.target as HTMLElement;
        if (t.closest('button, a, input, textarea, label, select')) return;
        e.currentTarget.focus();
      }}
      onKeyUpCapture={(e) => {
        // PC の速記: 空の段落で「/」→ 追加シート。IME 変換中は無視する
        if (e.key !== '/' || e.nativeEvent.isComposing) return;
        if (block.type !== 'paragraph' || block.text !== '/') return;
        ctx.update((bs) => bs.map((b) => (b.id === block.id && b.type === 'paragraph' ? { ...b, text: '' } : b)));
        onSlash();
      }}
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
      className={
        'relative rounded-lg border-l-2 py-1.5 pl-2.5 pr-1 transition focus:outline-none ' +
        (selected ? 'border-neutral-900 bg-neutral-50/70 ' : 'border-transparent ') +
        (dragging ? 'opacity-40' : '')
      }
    >
      {dropHint ? (
        <div className={'pointer-events-none absolute inset-x-1 z-10 h-[2px] rounded-full bg-primary-500 ' + (dropHint === 'before' ? '-top-px' : '-bottom-px')} aria-hidden />
      ) : null}
      {/* PC だけの速記（つかんで並べ替え）。402px では書式バーの ↑ ↓ が主導線なので、
          これが無くてもスマホの操作は 1 つも欠けない */}
      <span
        role="button"
        tabIndex={-1}
        aria-label="ドラッグして並べ替え"
        title="ドラッグして並べ替え"
        onPointerDown={() => setGrab(true)}
        onPointerUp={() => setGrab(false)}
        className="absolute -left-8 top-2 hidden h-8 w-8 cursor-grab place-items-center rounded text-neutral-300 hover:bg-neutral-100 hover:text-neutral-500 active:cursor-grabbing sm:grid"
      >
        <GripVertical className="h-4 w-4" aria-hidden />
      </span>
      <BlockField {...ctx} block={block} />
    </div>
  );
}

/* ===================== 小さな部品 ===================== */

/**
 * タイトル・ひとこと説明の入力欄。
 * 値を非制御で持ち、外から変わったときだけ流し込む（＝ textarea 標準の ⌘Z がそのまま効く）。
 */
function PlainTextarea({
  value,
  onValue,
  onFocus,
  placeholder,
  ariaLabel,
  className = '',
}: {
  value: string;
  onValue: (v: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.value !== value) {
      const focused = document.activeElement === el;
      const s = el.selectionStart;
      const e = el.selectionEnd;
      el.value = value;
      if (focused) el.setSelectionRange(Math.min(s, value.length), Math.min(e, value.length));
    }
    fitHeight(el);
  });

  // フォントが後から入ると行の高さが変わるので、読み込み後にもう一度測る
  useEffect(() => {
    if (typeof document === 'undefined' || !('fonts' in document)) return;
    let alive = true;
    void (document as Document & { fonts: FontFaceSet }).fonts.ready.then(() => {
      if (alive && ref.current) fitHeight(ref.current);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <textarea
      ref={ref}
      defaultValue={value}
      rows={1}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onFocus={onFocus}
      onKeyDown={(e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
        // 見出しと同じで 1 行。変換確定の Enter は奪わない
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.preventDefault();
      }}
      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
        onValue(e.currentTarget.value);
        fitHeight(e.currentTarget);
      }}
      className={'block w-full resize-none overflow-hidden border-0 bg-transparent p-0 placeholder:text-neutral-300 focus:outline-none ' + className}
    />
  );
}

function fitHeight(el: HTMLTextAreaElement) {
  el.style.height = '0px';
  el.style.height = `${el.scrollHeight}px`;
}

function samePos(a: FieldPos | null, b: FieldPos): boolean {
  return !!a && a.blockId === b.blockId && (a.row ?? 0) === (b.row ?? 0) && (a.col ?? 0) === (b.col ?? 0);
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
