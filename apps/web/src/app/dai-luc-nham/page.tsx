import {DisciplineMethodGuide} from '@/features/discipline-canvas/discipline-method-guide';
import {EasternScene} from '@/features/discipline-canvas/eastern-scene';
import Link from 'next/link';
import {Suspense} from 'react';
import {DaLiuRenPanel} from '@/features/dai-luc-nham/depth-panel';
export const metadata={title:'Đại Lục Nhâm · Tứ Khóa & Tam Truyền | Thiên Đồ',description:'Lập Thiên–Địa bàn, Tứ Khóa, Tam Truyền và Thập Nhị Thiên Tướng theo phương pháp xác định.'};
export default function DaLiuRenPage(){return <div style={{maxWidth:1240,margin:'auto',padding:'20px clamp(12px,3vw,28px)'}}><EasternScene variant="dai-luc-nham"/><Link href="/huyen-hoc" style={{color:'var(--td-accent-text,var(--gold))'}}>← Trung tâm khám phá</Link><DisciplineMethodGuide variant="dai-luc-nham"/><Suspense fallback={<p>Đang tải công cụ Đại Lục Nhâm…</p>}><DaLiuRenPanel/></Suspense></div>;}
