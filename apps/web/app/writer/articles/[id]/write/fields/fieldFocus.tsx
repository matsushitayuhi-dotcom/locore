'use client';

import { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Caret } from '../blockOps';
import type { FieldPos } from '../useBlockKeymap';

/**
 * 入力欄（textarea / input）の置き場所を 1 か所に集めて、
 * blockOps が返した Caret の位置へフォーカスを戻すための仕組み。
 *
 * こうしている理由:
 *   旧エディタは key に rev を混ぜて全 textarea を作り直していたので、⌘Z のたびにキャレットが飛んでいた。
 *   新エディタは「ブロックの id は変えない」「DOM も作り直さない」を守り、
 *   構造が変わったときだけ **この登録簿を引いて 1 つの入力欄に focus を戻す**。
 *
 * 使い方（BlockEditor 側）:
 *   const fieldFocus = useCreateFieldFocus();
 *   <FieldFocusProvider value={fieldFocus}> … <BlockField … /> … </FieldFocusProvider>
 *   apply(result) のあと（state 反映後の effect で）fieldFocus.focus(result.caret)
 */

export type FieldEl = HTMLTextAreaElement | HTMLInputElement;

/** ブロック id ＋ 行 ＋ 列で 1 つの入力欄を指す鍵。row / col の既定は 0 */
export function fieldKey(pos: FieldPos | Caret): string {
  return `${pos.blockId}:${pos.row ?? 0}:${pos.col ?? 0}`;
}

export type FieldFocus = {
  /** 入力欄の ref コールバックから呼ばれる（el が null なら登録を外す） */
  register: (key: string, el: FieldEl | null) => void;
  /** その位置にフォーカスとキャレットを戻す。まだ描かれていなければ数フレーム待って再挑戦する */
  focus: (caret: Caret | null) => boolean;
};

const FieldFocusContext = createContext<FieldFocus | null>(null);

function place(el: FieldEl, offset: number): void {
  el.focus();
  const at = Math.max(0, Math.min(offset, el.value.length));
  try {
    el.setSelectionRange(at, at);
  } catch {
    // input[type=url] など、選択範囲を持てない種類がある。フォーカスだけで十分
  }
}

/** BlockEditor で 1 つだけ作る。返り値をそのまま FieldFocusProvider に渡す */
export function useCreateFieldFocus(): FieldFocus {
  const map = useRef(new Map<string, FieldEl>()).current;
  return useMemo<FieldFocus>(
    () => ({
      register(key, el) {
        if (el) map.set(key, el);
        else map.delete(key);
      },
      focus(caret) {
        if (!caret) return false;
        const key = fieldKey(caret);
        const el = map.get(key);
        if (el) {
          place(el, caret.offset);
          return true;
        }
        // ブロックを増やした直後は、まだその入力欄が描かれていないことがある。
        // 2〜3 フレームだけ待って探し直す（見つからなければ黙って諦める）
        if (typeof window !== 'undefined') {
          let tries = 0;
          const retry = () => {
            const found = map.get(key);
            if (found) {
              place(found, caret.offset);
              return;
            }
            tries += 1;
            if (tries < 3) window.requestAnimationFrame(retry);
          };
          window.requestAnimationFrame(retry);
        }
        return false;
      },
    }),
    [map],
  );
}

export function FieldFocusProvider({ value, children }: { value: FieldFocus; children: ReactNode }) {
  return <FieldFocusContext.Provider value={value}>{children}</FieldFocusContext.Provider>;
}

/** ブロックの中から「別の入力欄へ移りたい」ときに使う（項目を足したあとなど） */
export function useFieldFocus(): FieldFocus | null {
  return useContext(FieldFocusContext);
}

/** 入力欄の ref に渡すコールバック。Provider が無いときは何もしない（単体でも壊れない） */
export function useFieldRegister(pos: FieldPos): (el: FieldEl | null) => void {
  const focus = useContext(FieldFocusContext);
  const key = fieldKey(pos);
  return useCallback(
    (el: FieldEl | null) => {
      focus?.register(key, el);
    },
    [focus, key],
  );
}
