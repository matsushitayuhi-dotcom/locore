import { redirect } from 'next/navigation';

/** /residents は /users に改名（2026-06）。旧リンク互換のためリダイレクト。 */
export default function ResidentsRedirect() {
  redirect('/users');
}
