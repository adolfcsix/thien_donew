'use client';
import {publicStudyText} from '@/lib/public-study-text';
import {DisciplineNavigation} from '@/features/western/discipline-navigation';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import matrix from '@thiendo/knowledge/src/development-matrix.json';
import {normalizeSearchText} from '@/lib/navigation';
import styles from './development.module.css';
const families:Record<string,string>={east:'Đông phương',west:'Chiêm tinh phương Tây',numbers:'Thần số học',symbols:'Tarot & Biểu tượng',shared:'Hạ tầng chung'};
const labels:Record<string,string>=matrix.definitions;
export default function Development(){
 const [query,setQuery]=useState(''),[family,setFamily]=useState('all');
 const rows=useMemo(()=>matrix.records.filter(r=>(family==='all'||r.family===family)&&normalizeSearchText([r.name,r.gap,r.next].join(' ')).includes(normalizeSearchText(query))),[query,family]);
 return <div className={`${styles.root} western-world-page`}><DisciplineNavigation current="/research/development"/><header><span>THIÊN ĐỒ / PHẠM VI NGHIÊN CỨU</span><h1>Nhiều truyền thống.<br/>Mỗi phương pháp một căn cứ.</h1><p>Ba mức phát triển được ghi riêng: Thư viện kiến thức → Công cụ tính toán → Phân tích chuyên sâu. Có menu hoặc bài giới thiệu chưa có nghĩa là một môn đã hoàn thiện.</p></header>
 <section className={styles.panel}><h2>Điều kiện trước khi công nhận chuyên sâu</h2><ul>{matrix.deepRequirements.map(item=><li key={item}>{item}</li>)}</ul><p>Mọi nội dung diễn giải vẫn thuộc truyền thống/biểu tượng; không trình bày như dự báo đã được khoa học xác thực. “Có công cụ” chỉ áp dụng cho phạm vi được mô tả, không xác nhận toàn môn hoặc khả năng vận hành production.</p></section>
 <div className={styles.filters}><label>Tìm chuyên môn hoặc phần thiếu<input value={query} onChange={e=>setQuery(e.target.value)} type="search" placeholder="Tarot, Lục Nhâm, Transit…"/></label><label>Nhánh<select value={family} onChange={e=>setFamily(e.target.value)}><option value="all">Tất cả</option>{Object.entries(families).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label></div><p role="status">{rows.length} / {matrix.records.length} hạng mục</p>
 <div className={styles.studyGrid}>{rows.map(row=><article className={styles.studyCard} key={row.id}><header><small>{families[row.family]}</small><h2>{row.name}</h2>{row.route&&<Link href={row.route}>{row.calculator==='available'?'Mở công cụ':'Khám phá bộ môn'} ↗</Link>}</header><dl className={styles.levels}><div><dt>Thư viện</dt><dd>{labels[row.library]}</dd></div><div><dt>Công cụ</dt><dd>{labels[row.calculator]}</dd></div><div><dt>Phân tích sâu</dt><dd>{labels[row.analysis]}</dd></div></dl><h3>Phạm vi hiện có</h3><p>{publicStudyText(row.gap)}</p><details><summary>Hướng nghiên cứu tiếp theo</summary><p>{publicStudyText(row.next)}</p></details></article>)}</div>
 <section className={styles.panel}><h2>Đối chiếu đa bộ môn về lâu dài</h2><p>Một hồ sơ chung sẽ giữ dữ liệu sinh gốc, múi giờ, tọa độ và mức chắc chắn của giờ sinh. Mỗi phép tính có đầu vào, phiên bản, trường phái và phần giải thích riêng. Tử Vi, Bát Tự, Chiêm tinh và Thần số học được đặt cạnh nhau để nghiên cứu; không gộp thành “điểm vận mệnh” hoặc kết luận đồng thuận giả tạo.</p><p>Tài khoản, tìm kiếm, thư viện và Thư phòng là lớp chung. Giao diện từng nhánh giữ ngôn ngữ đồ họa phù hợp: địa bàn Đông Á, vòng Hoàng đạo xanh đêm/tím/ánh kim, hình học số học, biểu tượng Tarot theo từng bộ bài.</p><Link href="/study">Thư phòng cá nhân ↗</Link> · <Link href="/library">Thư viện chung ↗</Link></section></div>;
}
