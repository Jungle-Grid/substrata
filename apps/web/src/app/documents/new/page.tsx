import { redirect } from 'next/navigation';

export default function LegacyNewDocumentRedirectPage() {
  redirect('/app/documents/new');
}
