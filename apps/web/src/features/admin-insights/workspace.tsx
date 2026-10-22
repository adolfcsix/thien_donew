'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAdminTask } from '@/features/admin/use-admin-task';
import { useAdminSession } from '@/features/membership/admin-session';
import { insightReport, type InsightReport } from './contract';
import { InsightAnswer } from './report';
import styles from './chat.module.css';
const questions = ['Hôm nay có bao nhiêu lượt truy cập web?', 'Hôm nay có bao nhiêu bài mới ở diễn đàn và bình luận?', 'Hôm nay có bao nhiêu tài khoản mới đăng ký?', 'Có những tài khoản nào cấp cao?', 'Doanh thu 7 ngày gần đây thế nào?', 'Giao dịch nào đang chờ và báo cáo nào cần duyệt?', 'Báo cáo tổng quan hôm nay'];
export function AdminInsightWorkspace({
  embedded = false
}: {
  embedded?: boolean;
}) {
  const [question, setQuestion] = useState(questions[0]),
    [period, setPeriod] = useState('auto'),
    [minLevel, setMinLevel] = useState(10);
  const [providerState,setProviderState]=useState<'checking'|'ready'|'unavailable'|'error'>('checking');
  useEffect(()=>{const controller=new AbortController();api<{ai:{enabled:boolean}}>('/api/huyen-giai/status',{signal:controller.signal}).then(result=>{if(!controller.signal.aborted)setProviderState(result?.ai?.enabled===true?'ready':'unavailable');}).catch(()=>{if(!controller.signal.aborted)setProviderState('error');});return()=>controller.abort();},[]);
  const [explain, setExplain] = useState(false),
    [messages, setMessages] = useState<{
      question: string;
      report: InsightReport;
    }[]>([]);
  const task = useAdminTask(),
    {
      reverify, capabilities
    } = useAdminSession();
  const suggestions=questions.filter((_,index)=>[['overview.read'],['community.read'],['members.read'],['ranks.read'],['finance.read'],['finance.read','community.read'],['overview.read','community.read','members.read','ranks.read','finance.read','library.read','ai.read']][index].every(cap=>capabilities.includes(cap)));
  const transcript = useRef<HTMLDivElement>(null);
  useEffect(() => {
    transcript.current?.scrollTo({
      top: transcript.current.scrollHeight,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
    });
  }, [messages, task.pending, task.error]);
  function ask(event: React.FormEvent) {
    event.preventDefault();
    void task.run(async signal => {
      const submitted = question.trim();
      const result = insightReport(await api<unknown>('/api/admin/insights/ask', {
        method: 'POST',
        body: {
          question: submitted,
          period,
          ...( /cấp\s+\d+/i.test(submitted) ? {} : {minLevel}),
          explain
        },
        signal,
        timeoutMs: 45000
      }));
      if (!signal.aborted) {
        setMessages(previous => [...previous.slice(-9), {
          question: submitted,
          report: result
        }]);
        setQuestion('');
      }
    });
  }
  return <section className={`${styles.root} ${embedded ? styles.embedded : ''}`} aria-label="Trợ lý AI quản trị">
    {!embedded && <header className={styles.hero}>
      <span>THIÊN ĐỒ · ADMIN INTELLIGENCE</span>
      <h1>Hỏi dữ liệu hệ thống</h1>
      <p>Trợ lý quản trị · Dữ liệu có nguồn · Chỉ đọc</p>
      <Link href="/admin/huyen-giai">Cấu hình Gemini và ngân sách ↗</Link>
    </header>}
    <div className={styles.transcript} ref={transcript} tabIndex={0} aria-label="Lịch sử trò chuyện quản trị" aria-busy={task.pending}>
      {!messages.length && <div className={styles.welcome}>
        <div className={styles.orb} aria-hidden="true">✦</div>
        <h2>Tôi có thể giúp gì cho bạn?</h2>
        <p>Xem lượt xem trang, diễn đàn, thành viên, cảnh giới công khai, tài chính và thư viện. Mỗi câu hỏi được truy vấn độc lập; hãy ghi rõ khoảng thời gian.</p>
        <div className={styles.suggestions}>
          {suggestions.map(text => <button key={text} disabled={task.pending} onClick={() => {
            setQuestion(text);
            setPeriod('auto');
          }}>
            {text}
            <span aria-hidden="true"> ↗</span>
          </button>)}
        </div>
      </div>}
      {messages.map((message, index) => <div className={styles.exchange} key={index}>
        <p className={styles.userMessage}>
          <span>Bạn</span>
          {message.question}
        </p>
        <div className={styles.assistantMessage}>
          <span className={styles.identity}>✦ THIÊN ĐỒ</span>
          <InsightAnswer report={message.report} />
        </div>
      </div>)}
      {task.pending && <p role="status" className={styles.loading}><span aria-hidden="true">✦</span> Đang đọc số liệu…</p>}
      {task.error && <p role="alert" className={styles.error}>
        {task.error}
      </p>}
    </div>
    <form className={styles.form} onSubmit={ask}>
      <p className={styles.note} role="status">{providerState==='checking'?'Đang kiểm tra Gemini. ':providerState==='ready'?'Gemini đã bật theo cấu hình; kết nối thực sẽ được kiểm tra khi gửi yêu cầu. ':providerState==='error'?'Chưa xác minh được cấu hình Gemini. ':'Gemini chưa bật hoặc thiếu cấu hình. '}Bảng số liệu luôn lấy từ API có phân quyền. Gemini chỉ phân tích khi bạn bật tùy chọn và server có cấu hình hợp lệ.</p>
      <details className={styles.options}>
        <summary>Tùy chọn báo cáo & Gemini</summary>
        <div className={styles.formRow}>
          <label>Khoảng thời gian<select value={period} disabled={task.pending} onChange={e => setPeriod(e.target.value)}>
              <option value="auto">Theo câu hỏi (mặc định hôm nay)</option>
              <option value="today">Hôm nay</option>
              <option value="yesterday">Hôm qua</option>
              <option value="week">7 ngày gồm hôm nay</option>
              <option value="month">30 ngày gồm hôm nay</option>
            </select></label>
          <label>Cảnh giới tối thiểu<input type="number" min={1} max={18} step={1} value={minLevel} disabled={task.pending} onChange={e => setMinLevel(Number(e.target.value))} /></label>
        </div>
        <label className={styles.consent}><input type="checkbox" checked={explain} disabled={task.pending || providerState!=='ready'} onChange={e => setExplain(e.target.checked)} />Đồng ý gửi số liệu tổng hợp cho Gemini để phân tích thêm, tính vào ngân sách AI chung. Không gửi câu hỏi gốc, tên, email, ID, bài riêng tư hoặc hồ sơ sinh.</label>
      </details>
      <label className={styles.inputLabel} htmlFor={embedded ? 'admin-dock-question' : 'admin-insight-question'}>Câu hỏi quản trị</label>
      <div className={styles.composer}>
        <textarea id={embedded ? 'admin-dock-question' : 'admin-insight-question'} required minLength={4} maxLength={500} rows={2} placeholder="Hỏi Thiên Đồ về dữ liệu hệ thống…" value={question} disabled={task.pending} onChange={e => setQuestion(e.target.value)} />
        <button className={styles.send} disabled={task.pending || question.trim().length < 4} aria-label="Xem báo cáo">
          {task.pending ? '…' : '↑'}
        </button>
      </div>
      <div className={styles.toolbar}>
        <small>Chỉ đọc · Tối đa 10 báo cáo trong phiên</small>
        <button type="button" onClick={reverify} disabled={task.pending}>Xác minh lại MFA</button>
        <button type="button" disabled={task.pending || !messages.length} onClick={() => setMessages([])}>Xóa hội thoại</button>
      </div>
    </form>
  </section>;
}
