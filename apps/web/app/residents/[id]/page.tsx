import { redirect } from 'next/navigation';

/** 旧 /residents/[id] → /users/[id]（プロフィールは users に統合済み）。 */
export default function ResidentProfileRedirect({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/users/${params.id}`);
}
