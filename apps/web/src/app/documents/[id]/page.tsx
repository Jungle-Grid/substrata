import { redirect } from 'next/navigation';

export default async function LegacyDocumentRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/app/documents/${id}`);
}
