'use client';

import { useState } from 'react';
import Image from 'next/image';

/**
 * Locore ブランドロゴ表示用コンポーネント。
 *
 * variant:
 *   - "wordmark"  → ヘッダー / フッター用の横長ワードマーク（PNG）
 *                   ファイル: /logo-wordmark.png
 *   - "icon"      → アイコンだけ（アーチ + 中心ドット）
 *                   ファイル: /logo-icon.png
 *   - "stacked"   → アイコン上 + ワードマーク下（ログイン画面など）
 *                   両ファイルが必要
 *
 * フォールバック: 画像が見つからない（404）場合、自動で terra-cotta 色の
 * セリフ体テキスト「Locore」に切り替わる。これにより、PNG をまだ public/
 * に置いていない環境でもサイトは破綻しない。
 */

type Variant = 'wordmark' | 'icon' | 'stacked';

type Props = {
  variant?: Variant;
  /** 画像表示時の高さ（px）。アイコンは正方形なので幅も同じ */
  height?: number;
  /** クラス追加（外側の <span>） */
  className?: string;
  /** タブインデックスから外す装飾用なら true */
  decorative?: boolean;
};

export function Logo({
  variant = 'wordmark',
  height,
  className = '',
  decorative = false,
}: Props) {
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const markFailed = (src: string) =>
    setFailed((m) => ({ ...m, [src]: true }));

  const alt = decorative ? '' : 'Locore';

  if (variant === 'icon') {
    const src = '/logo-icon.png';
    const h = height ?? 32;
    if (failed[src]) {
      return <FallbackIcon size={h} className={className} />;
    }
    return (
      <span className={`inline-flex items-center ${className}`}>
        <Image
          src={src}
          alt={alt}
          width={h}
          height={h}
          priority
          unoptimized
          onError={() => markFailed(src)}
        />
      </span>
    );
  }

  if (variant === 'stacked') {
    const iconSrc = '/logo-icon.png';
    const wordSrc = '/logo-wordmark.png';
    const iconH = height ?? 56;
    const wordH = Math.round(iconH * 0.45);
    const iconFailed = failed[iconSrc];
    const wordFailed = failed[wordSrc];
    return (
      <span
        className={`inline-flex flex-col items-center gap-2 ${className}`}
      >
        {iconFailed ? (
          <FallbackIcon size={iconH} />
        ) : (
          <Image
            src={iconSrc}
            alt=""
            width={iconH}
            height={iconH}
            priority
            unoptimized
            onError={() => markFailed(iconSrc)}
          />
        )}
        {wordFailed ? (
          <FallbackText height={wordH} />
        ) : (
          // 横幅は適当に大きめに固定して height で縮める
          <Image
            src={wordSrc}
            alt={alt}
            width={wordH * 4}
            height={wordH}
            priority
            unoptimized
            onError={() => markFailed(wordSrc)}
          />
        )}
      </span>
    );
  }

  // wordmark
  const src = '/logo-wordmark.png';
  const h = height ?? 28;
  if (failed[src]) {
    return <FallbackText height={h} className={className} />;
  }
  return (
    <span className={`inline-flex items-center ${className}`}>
      <Image
        src={src}
        alt={alt}
        // 横幅は概ね高さ × 3.75 で wordmark の比率に合わせる
        width={Math.round(h * 3.75)}
        height={h}
        priority
        unoptimized
        onError={() => markFailed(src)}
      />
    </span>
  );
}

// ============================================================================
// フォールバック（画像未配置時の代替表示）
// 採用ロゴのテイスト（terra-cotta + small-caps serif）に寄せる
// ============================================================================

function FallbackText({
  height,
  className = '',
}: {
  height: number;
  className?: string;
}) {
  // 高さに合わせて font-size を決定
  const fontSize = Math.round(height * 0.95);
  return (
    <span
      className={`inline-flex items-center font-semibold tracking-[0.08em] text-primary-500 ${className}`}
      style={{
        fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
        fontSize: `${fontSize}px`,
        lineHeight: 1,
        fontVariantCaps: 'small-caps',
      }}
    >
      Locore
    </span>
  );
}

function FallbackIcon({
  size,
  className = '',
}: {
  size: number;
  className?: string;
}) {
  // 採用ロゴと同じ「アーチ + 中心ドット」を inline SVG で再現
  // 画像が無い間の暫定表示。本物 PNG が置かれたらこちらは出ない。
  return (
    <span
      className={`inline-flex shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
      >
        {/* アーチ本体 */}
        <path
          d="M20 56 L20 28 a12 12 0 0 1 24 0 L44 56 Z"
          fill="currentColor"
          className="text-primary-500"
        />
        {/* 中心のドット */}
        <circle
          cx="32"
          cy="32"
          r="3"
          fill="var(--background, #FAF5EB)"
        />
      </svg>
    </span>
  );
}
