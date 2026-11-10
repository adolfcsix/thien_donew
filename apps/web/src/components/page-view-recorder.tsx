'use client';
import {createRequestId} from '@/lib/request-id.cjs';


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
      id: createRequestId()
    };
    // Best-effort, non-identifying telemetry should finish naturally during route
    // changes. WebKit can surface a physically aborted same-origin fetch as an
    // access-control page error, even when the promise has a catch handler.
    void fetch('/api/analytics/page-view', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        eventId: last.current.id
      }),
      credentials: 'omit',
      cache: 'no-store'
    }).catch(() => {/* Best effort telemetry never blocks navigation or retries automatically. */});
    // No cleanup abort: the request holds no private payload or credentials.
  }, [pathname]);
  return null;
}
