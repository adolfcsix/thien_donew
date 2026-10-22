import {Suspense} from 'react';
import { AdminSession } from '@/features/membership/admin-session';
import { FloatingAdminAssistant } from '@/features/admin-insights/floating-assistant';
export default function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={<p role="status">Đang mở khu quản trị…</p>}><AdminSession>
    {children}
    <FloatingAdminAssistant />
  </AdminSession></Suspense>;
}
