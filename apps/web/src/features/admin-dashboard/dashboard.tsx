'use client';
import {useEffect,useId,useState} from 'react';
import Link from 'next/link';
import {ScrollReveal} from '@/components/scroll-reveal';
import {api} from '@/lib/api';
import {dashboardReport,type DashboardReport} from './contract';
import styles from './dashboard.module.css';
const number=new Intl.NumberFormat('vi-VN');
const date=(s:string)=>new Date(s).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
const statuses:Record<string,string>={creating:'Đang tạo',pending:'Chờ thanh toán',paid:'Đã thanh toán',failed:'Thất bại',cancelled:'Đã hủy',refunded:'Đã hoàn tiền'};
function delta(value:number|null,previous:number|null) {
  if(value===null||previous===null)return 'Ảnh chụp hiện tại';
  if(previous===0)return value===0?'Không thay đổi':'Kỳ trước: 0 · chưa tính tỷ lệ';
  const change=(value-previous)/previous*100;
  return `${change>0?'+':''}${change.toLocaleString('vi-VN',{maximumFractionDigits:1})}% so với kỳ trước`;
}
export function AdminDashboard() {
  const [days,setDays]=useState(7),[revision,setRevision]=useState(0),[data,setData]=useState<DashboardReport|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  useEffect(()=>{const controller=new AbortController();setLoading(true);setData(null);setError('');
    api<unknown>('/api/admin/insights/dashboard?days='+days,{signal:controller.signal,timeoutMs:25000}).then(raw=>{if(!controller.signal.aborted)setData(dashboardReport(raw));}).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[days,revision]);
  return <section data-admin-dashboard className={styles.dashboard} aria-label="Thống kê hệ thống thực tế" aria-busy={loading}>
    {data&&<ScrollReveal selector="[data-admin-dashboard]" revision={data.generatedAt} initial/>}
    <header className={styles.header}><div><span className={styles.eyebrow}>THIÊN CƠ · DỮ LIỆU VẬN HÀNH</span><h2>Toàn cảnh Thiên Đồ</h2><p>{data?`Cập nhật ${date(data.generatedAt)} · Giờ Việt Nam`:'Các chỉ số được đọc trực tiếp từ hệ thống.'}</p></div><div className={styles.filters}><label>Khoảng thời gian<select value={days} onChange={e=>setDays(Number(e.target.value))}><option value={1}>Hôm nay</option><option value={7}>7 ngày</option><option value={30}>30 ngày</option></select></label><button type="button" disabled={loading} onClick={()=>setRevision(v=>v+1)}>Làm mới ↻</button></div></header>
    {error&&<div className={styles.error} role="alert"><strong>Chưa tải được số liệu</strong><p>{error}</p><button type="button" onClick={()=>setRevision(v=>v+1)}>Thử lại</button></div>}
    {loading&&<div className={styles.metrics} role="status" aria-label="Đang đọc số liệu"><span className={styles.srOnly}>Đang đọc số liệu…</span>{Array.from({length:8},(_,i)=><div key={i} className={styles.skeleton}/>)}</div>}
    {data&&<><div className={styles.metrics}>{data.metrics.map(m=><article data-scroll-reveal key={m.id} className={styles.metric}><span>{m.label}</span><strong>{m.value===null?'Chưa có dữ liệu':number.format(m.value)}<small>{m.value!==null&&m.unit}</small></strong><p>{m.value===null?'Chưa đo':delta(m.value,m.previous)}</p><details><summary>Nguồn & cách tính</summary><p>{m.source}</p><p>{m.scope==='snapshot'?'Trạng thái hiện tại, không so sánh theo kỳ.':`${date(data.start)} → ${date(data.end)}`}</p>{m.href&&<Link href={m.href}>Mở phân hệ ↗</Link>}</details></article>)}</div>
    <div className={styles.charts}><ActivityChart daily={data.daily} restricted={data.restricted}/>{!data.restricted.includes('finance')&&<OrderDistribution orders={data.orders}/>}</div>
    <details className={styles.notes}><summary>Phạm vi dữ liệu và giới hạn đo lường</summary><ul>{data.warnings.map(w=><li key={w}>{w}</li>)}</ul><p>Truy vấn database thành công khi cập nhật. Gemini, email và payOS cần kiểm tra riêng tại phân hệ tương ứng.</p></details></>}
  </section>;
}
function ActivityChart({daily,restricted}:{daily:DashboardReport['daily'];restricted:string[]}) {
  const id=useId();const [chosenSeries,setSeries]=useState<'registrations'|'posts'|'views'>('registrations'),[kind,setKind]=useState('area'),[selected,setSelected]=useState<number|null>(null);
  const series=chosenSeries==='registrations'&&restricted.includes('members')||chosenSeries==='posts'&&restricted.includes('community')?'views':chosenSeries;
  const values=daily.map(d=>d[series]),unavailable=values.every(v=>v===null),max=Math.max(1,...values.map(v=>v??0));
  const x=(i:number)=>30+(i+.5)*540/Math.max(1,daily.length),y=(v:number)=>190-v/max*155;
  const points=values.map((v,i)=>`${x(i)},${y(v??0)}`).join(' ');
  const title=series==='registrations'?'Tài khoản đăng ký mới':series==='posts'?'Bài diễn đàn tạo mới':'Lượt xem trang ghi nhận';
  return <article data-scroll-reveal className={styles.chart}><header><div><span className={styles.eyebrow}>NHỊP HOẠT ĐỘNG</span><h3>{title}</h3></div><label className={styles.srOnly} htmlFor={id}>Chọn dữ liệu biểu đồ</label><select id={id} value={series} onChange={e=>{setSeries(e.target.value as typeof series);setSelected(null);}}>{!restricted.includes('members')&&<option value="registrations">Đăng ký</option>}{!restricted.includes('community')&&<option value="posts">Diễn đàn</option>}<option value="views">Lượt xem</option></select></header>
    <div className={styles.segment} aria-label="Kiểu biểu đồ">{[['area','Miền'],['line','Đường'],['bar','Cột']].map(([k,label])=><button type="button" key={k} aria-pressed={kind===k} onClick={()=>setKind(k)}>{label}</button>)}</div>
    {unavailable?<p className={styles.empty}>Chưa có dữ liệu tracking cho khoảng này.</p>:<><svg className={styles.plot} viewBox="0 0 600 230" role="group" aria-labelledby={`${id}-title ${id}-desc`}><title id={`${id}-title`}>{title}</title><desc id={`${id}-desc`}>Dữ liệu từng ngày giờ Việt Nam. Bảng số liệu đầy đủ nằm sau biểu đồ.</desc><defs><linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".3"/><stop offset="100%" stopColor="currentColor" stopOpacity=".02"/></linearGradient></defs>
      {[0,.5,1].map(n=><g key={n}><line x1="30" x2="570" y1={y(n*max)} y2={y(n*max)} stroke="currentColor" opacity=".16"/><text x="4" y={y(n*max)-4} fontSize="10" fill="currentColor">{Math.round(n*max)}</text></g>)}
      {kind==='area'&&<polygon points={`${x(0)},190 ${points} ${x(values.length-1)},190`} fill={`url(#${id}-fill)`}/>}
      {kind!=='bar'&&<polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>}
      {values.map((v,i)=><g key={daily[i].date} tabIndex={0} role="button" aria-label={`${daily[i].date}: ${v??'chưa đo'}`} onMouseEnter={()=>setSelected(i)} onFocus={()=>setSelected(i)} onClick={()=>setSelected(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(i);}}}>{kind==='bar'?<rect x={x(i)-Math.max(2,210/values.length)} y={y(v??0)} width={Math.max(4,420/values.length)} height={Math.max(2,190-y(v??0))} rx="3" fill="currentColor" opacity={selected===i?1:.6}/>:<circle cx={x(i)} cy={y(v??0)} r={selected===i?6:4} fill="currentColor"/>}<title>{daily[i].date}: {v}</title></g>)}
      <text x="30" y="220" fontSize="11" fill="currentColor">{daily[0]?.date.slice(5)}</text><text x="570" y="220" textAnchor="end" fontSize="11" fill="currentColor">{daily.at(-1)?.date.slice(5)}</text></svg>
      <p className={styles.chartValue} role="status">{selected===null?'Chạm hoặc di chuyển đến một điểm để xem số liệu.':`${daily[selected]?.date}: ${number.format(values[selected]??0)}`}</p></>}
    <details><summary>Xem bảng số liệu từng ngày</summary><div className={styles.table}><table><caption>{title} · giờ Việt Nam</caption><thead><tr><th>Ngày</th><th>Số lượng</th></tr></thead><tbody>{daily.map((d,i)=><tr key={d.date}><td>{d.date}</td><td>{values[i]===null?'Chưa đo':number.format(values[i]!)}</td></tr>)}</tbody></table></div></details>
  </article>;
}
function OrderDistribution({orders}:{orders:DashboardReport['orders']}) {
  const total=orders.reduce((sum,o)=>sum+o.count,0);let offset=0;
  return <article data-scroll-reveal className={styles.chart}><span className={styles.eyebrow}>PHÂN BỐ HIỆN TẠI</span><h3>Trạng thái đơn hàng</h3>{total?<><svg className={styles.donut} viewBox="0 0 180 180" role="img" aria-label={`${total} đơn hàng; chi tiết trong chú giải bên dưới`}>{orders.map((o,i)=>{const length=o.count/total*100,start=offset;offset+=length;return <circle key={o.status} cx="90" cy="90" r="66" pathLength="100" fill="none" stroke={`var(--chart-${i%6})`} strokeWidth="17" strokeDasharray={`${length} ${100-length}`} strokeDashoffset={-start} transform="rotate(-90 90 90)"><title>{statuses[o.status]}: {o.count}</title></circle>;})}<text x="90" y="89" textAnchor="middle" fill="currentColor" fontSize="22">{number.format(total)}</text><text x="90" y="110" textAnchor="middle" fill="currentColor" fontSize="11">đơn hiện còn</text></svg><ul className={styles.legend}>{orders.map((o,i)=><li key={o.status}><span style={{background:`var(--chart-${i%6})`}} aria-hidden="true"/>{statuses[o.status]}<strong>{number.format(o.count)}</strong></li>)}</ul></>:<p className={styles.empty}>Chưa có đơn hàng. Biểu đồ sẽ xuất hiện khi có dữ liệu.</p>}<p className={styles.source}>Nguồn: billing_orders.status · toàn bộ đơn hiện còn, không lọc theo ngày.</p><Link href="/admin/finance">Đối soát tài chính ↗</Link></article>;
}
