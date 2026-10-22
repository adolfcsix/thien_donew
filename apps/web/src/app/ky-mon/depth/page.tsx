import {Suspense} from 'react';
import Link from 'next/link';
import {QimenDepthPanel} from '@/features/ky-mon/depth-panel';
export default function Page(){return <div style={{maxWidth:1280,margin:'0 auto',padding:'24px 16px'}}><Link href="/ky-mon">← Bàn Kỳ Môn nền và trợ giúp lịch</Link><h1>Kỳ Môn Độn Giáp chuyên sâu</h1><Suspense fallback={<p>Đang mở bàn Kỳ Môn chuyên sâu…</p>}><QimenDepthPanel/></Suspense></div>;}
