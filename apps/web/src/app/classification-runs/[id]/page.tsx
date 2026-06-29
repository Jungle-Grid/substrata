import { notFound, redirect } from 'next/navigation';
import { PublicClassificationRunDemo } from '../../../components/public-classification-run-demo';
import {
  fetchPublicServerRunSafe,
  fetchServerAuthSessionSafe,
} from '../../../lib/server-api';

export default async function ClassificationRunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const publicRun = await fetchPublicServerRunSafe(id);

  if (publicRun) {
    return <PublicClassificationRunDemo run={publicRun} />;
  }

  const session = await fetchServerAuthSessionSafe();

  if (!session.authenticated) {
    notFound();
  }

  redirect(`/app/reviews/${id}`);
}
