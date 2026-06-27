import { redirect } from 'next/navigation';

/**
 * /about-service は /about に統合（2026-06）。互換のためリダイレクトのみ残す。
 */
export default function AboutServiceRedirect() {
  redirect('/about');
}
