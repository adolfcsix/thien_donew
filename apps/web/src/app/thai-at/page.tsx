import {DisciplineMethodGuide} from '@/features/discipline-canvas/discipline-method-guide';
import {EasternScene} from '@/features/discipline-canvas/eastern-scene';
import Link from 'next/link';
import {Suspense} from 'react';
import {TaiyiPanel} from '@/features/taiyi/taiyi-panel';
export const metadata={title:'Thái Ất Thần Số · Cục số và Chủ Khách | Thiên Đồ',description:'Nghiên cứu Thái Ất theo Kim Kính Thức Kinh: Tích niên, Dương/Âm 72 cục, Thiên Mục, Địa Mục, Kế Thần, Chủ/Khách toán.'};
export default function TaiyiPage(){return <div style={{maxWidth:1240,margin:'auto',padding:'20px clamp(12px,3vw,28px)'}}><EasternScene variant="thai-at"/><Link href="/huyen-hoc" style={{color:'var(--td-accent-text,var(--gold))'}}>← Trung tâm Khám phá</Link><DisciplineMethodGuide variant="thai-at"/><Suspense fallback={<p>Đang mở bàn Thái Ất…</p>}><TaiyiPanel/></Suspense></div>;}
