'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export function ReviewTabDeepLink() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('tab')) return;

    const hashTab: Record<string, string> = {
      '#case-overview': 'overview',
      '#extracted-facts': 'facts',
      '#review-paths': 'review-paths',
      '#company-history': 'company-history',
      '#reviewer-questions': 'questions',
      '#memo-draft': 'memo',
      '#audit-trail': 'audit',
    };
    const tab = hashTab[window.location.hash];
    if (tab) {
      router.replace(`${pathname}?tab=${tab}`);
    }
  }, [pathname, router, searchParams]);

  return null;
}
