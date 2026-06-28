import { redirect } from 'next/navigation';

export default async function LegacyReviewRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/app/reviews/${id}`);
}
