'use client';
import { useEffect } from 'react';
import { installScrollReveal } from '@/lib/scroll-reveal';

/** No wrapper or hidden SSR content; server-rendered children remain server-rendered. */
export function ScrollReveal({ selector, revision, initial = false }: { selector: string; revision?: string; initial?: boolean }) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(selector);
    if (root) return installScrollReveal(root, initial);
  }, [selector, revision, initial]);
  return null;
}
