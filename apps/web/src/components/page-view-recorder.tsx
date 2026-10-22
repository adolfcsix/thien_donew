'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/** Aggregate page views only; no cookie, identity, URL or referrer is sent. */
export function PageViewRecorder() {
  const pathname = usePathname();
  const last = useRef<{
    path: string;
    id: string;
  } | null>(null);
  useEffect(() => {
    if (pathname.startsWith('/admin') || navigator.doNotTrack === '1') return;
    if (!last.current || last.current.path !== pathname) last.current = {
      path: pathname,
      id: crypto.randomUUID()
    };
    const controller = new AbortController();
    void fetch('/api/analytics/page-view', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        eventId: last.current.id
      }),
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal
    }).catch(() => {/* Best effort telemetry never blocks navigation or retries automatically. */});
    return () => controller.abort();
  }, [pathname]);
  return null;
}
