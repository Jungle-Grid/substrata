'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function ExecutionProgressRefresh({ status }: { status: string }) {
  const router = useRouter();
  const active = ['queued', 'running', 'pending', 'unknown'].includes(status);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => router.refresh(), 2500);
    return () => window.clearInterval(timer);
  }, [active, router]);

  if (!active) return null;

  return null;
}
