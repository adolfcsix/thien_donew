'use client';

import Link from 'next/link';
import { AnswerTools } from '@/features/huyen-giai/answer-tools';
import { QuestionStarters } from '@/features/huyen-giai/question-starters';
import { useAuth } from '@/components/auth-provider';
import { useHuyenGiai } from '@/features/huyen-giai/use-huyen-giai';
import type { Finding } from '@/features/huyen-giai/types';
import styles from './huyen-giai.module.css';
const TOPICS = [['overview', 'Tổng quan'], ['career', 'Công việc'], ['relationships', 'Quan hệ'], ['strengths', 'Điểm mạnh'], ['timing', 'Vận hạn'], ['terminology', 'Thuật ngữ'], ['follow-up', 'Hỏi tiếp']];
const kinds: Record<Finding['kind'], string> = {
  supportive: 'Thuận',
  challenging: 'Nghịch',
  uncertain: 'Chưa đủ cơ sở'
};
export default function HuyenGiaiPage() {
  const {
    user,
    loading,
    open
  } = useAuth();
  if (loading && !user) return <main className={styles.root}>
    <header className={`${styles.hero} ${styles.guestHero}`}>
      <span>THIÊN ĐỒ · TRỢ LÝ HUYỀN GIẢI</span>
      <h1>Không gian Huyền Giải</h1>
      <p role="status">Đang xác minh phiên đăng nhập…</p>
    </header>
  </main>;
  if (!user) return <main className={styles.root}>
    <header className={`${styles.hero} ${styles.guestHero}`}>
      <span>THIÊN ĐỒ · TRỢ LÝ HUYỀN GIẢI</span>
      <h1>Không gian Huyền Giải</h1>
      <p>Khám phá những mối liên hệ trong lá số với dữ liệu tính toán từ Thiên Đồ và phần giải thích từ AI.</p>
    </header>
    <section className={styles.guestPanel} aria-labelledby="huyen-giai-gate-title">
      <div>
        <span className={styles.eyebrow}>THƯ PHÒNG CỦA BẠN</span>
        <h2 id="huyen-giai-gate-title">Mở hành trình nghiên cứu cá nhân</h2>
        <p>Đăng nhập để chọn lá số đã lưu, kiểm tra dữ liệu được chia sẻ và bắt đầu luận giải. Chỉ gửi nội dung tới Gemini sau khi bạn đồng ý.</p>
        <button type="button" className={styles.primaryButton} onClick={() => open()}>Đăng nhập / tạo tài khoản <span aria-hidden="true">↗</span></button>
      </div>
      <div className={styles.guestHighlights} aria-label="Các bước sử dụng">
        <p><strong>01</strong> Chọn lá số đã lưu</p>
        <p><strong>02</strong> Xem dữ liệu sẽ gửi đi</p>
        <p><strong>03</strong> Đặt câu hỏi và đối chiếu chứng cứ</p>
      </div>
    </section>
  </main>;
  return <HuyenGiaiWorkspace key={user.id} />;
}
function HuyenGiaiWorkspace() {
  const {
    charts,
    conversations,
    status,
    catalogLoading,
    catalogError,
    refresh,
    chartId,
    chooseChart,
    conversationId,
    mode,
    setMode,
    topic,
    setTopic,
    question,
    setQuestion,
    messages,
    disclosure,
    disclosureError,
    retryDisclosure,
    consent,
    setConsent,
    busy,
    historyLoading,
    nextBefore,
    loadEarlier,
    loadingEarlier,
    error,
    notice,
    openConversation,
    reset,
    generate,
    rate,
    removeConversation
  } = useHuyenGiai();
  return <main className={styles.root}>
    <header className={styles.hero}>
      <span>THIÊN ĐỒ · TRỢ LÝ HUYỀN GIẢI</span>
      <h1>Đọc lá số bằng chứng cứ</h1>
      <p>Engine Thiên Đồ tính toán, Gemini chỉ hỗ trợ giải thích. Đây là luận giải tham khảo, không phải lời tiên đoán chắc chắn.</p>
      <p><Link href="/collection">Lá số của tôi ↗</Link> · <Link href="/study">Thư phòng ↗</Link></p>
    </header>
    <div className={styles.grid}>
      <aside className={styles.sidebar}>
        <div className={styles.actions}>
          <strong>Lịch sử của bạn</strong>
          <button type="button" disabled={busy} onClick={reset}>+ Cuộc mới</button>
        </div>
        {catalogLoading ? <p role="status">Đang tải dữ liệu AI…</p> : catalogError ? <p>Chưa tải được lịch sử.</p> : conversations.length === 0 ? <p className={styles.muted}>Chưa có bản luận giải nào.</p> : conversations.map(c => <div key={c.id} className={styles.history}>
          <button disabled={busy} aria-current={conversationId === c.id ? 'page' : undefined} onClick={() => void openConversation(c.id)}>
            {new Date(c.updatedAt).toLocaleString('vi-VN')}
            <small>{c.turns} lượt · {c.mode === 'basic' ? 'Cơ bản' : 'Chuyên sâu'}</small>
          </button>
          <button disabled={busy || historyLoading} aria-label="Xóa cuộc luận giải" onClick={() => void removeConversation(c.id)}>×</button>
        </div>)}
      </aside>
      <section className={styles.main}>
        <div className={styles.actions}>
          <button type="button" disabled={busy || catalogLoading || historyLoading} onClick={() => void refresh()}>Làm mới dữ liệu AI</button>
        </div>
        {catalogError && <p role="alert" className={styles.error}>
          {catalogError}
        </p>}
        {catalogLoading ? <p role="status">Đang kiểm tra kết nối và hạn mức AI…</p> : catalogError ? null : !status?.ai.enabled ? <p role="status" className={styles.note}>Thiên Đồ AI chưa được Admin kích hoạt hoặc chưa có kết nối Gemini. Không tạo nội dung giả khi dịch vụ không sẵn sàng.</p> : <p className={styles.muted}>Mô hình đang dùng: {status.ai.model}. Giới hạn: {status.limits.dailyUserCalls} lượt/ngày.{typeof status.limits.remainingToday === 'number' && <> Còn {status.limits.remainingToday} lượt theo hạn mức tài khoản (đặt lại lúc 00:00 UTC / 07:00 Việt Nam); ngân sách chung có thể giới hạn sớm hơn.</>}</p>}
        {!catalogLoading && !catalogError && !charts.length && <p className={styles.note}>Bạn chưa có lá số đã lưu. <Link href="/chart">Lập và lưu lá số ↗</Link></p>}
        <form onSubmit={e => {
          e.preventDefault();
          void generate();
        }} className={styles.form}>
          <label>Lá số đã lưu<select value={chartId} disabled={busy || historyLoading || catalogLoading || !!conversationId} onChange={e => chooseChart(e.target.value)}>
              {!chartId && <option value="">
                {conversationId ? 'Lá số gốc không còn được lưu' : 'Chọn lá số đã lưu'}
              </option>}
              {charts.map(c => <option key={c.id} value={c.id}>
                {c.label}
              </option>)}
            </select></label>
          {conversationId && !chartId && <p className={styles.note}>Lá số gốc đã bị xóa. Bạn vẫn đọc được lịch sử; hãy mở cuộc mới với lá số khác để hỏi tiếp.</p>}
          <div className={styles.formRow}>
            <label>Chế độ<select value={mode} disabled={busy || historyLoading || catalogLoading || !!conversationId} onChange={e => setMode(e.target.value as 'basic' | 'expert')}>
                <option value="basic">Cơ bản</option>
                <option value="expert">Chuyên sâu</option>
              </select></label>
            <label>Chủ đề<select value={topic} disabled={busy || historyLoading} onChange={e => setTopic(e.target.value)}>
                {TOPICS.map(t => <option value={t[0]} key={t[0]}>
                  {t[1]}
                </option>)}
              </select></label>
          </div>
          <details className={styles.disclosure}>
            <summary>Xem chính xác dữ liệu gửi đến Gemini</summary>
            {disclosure ? <>
              <p>Chỉ gồm phương pháp tính, 12 cung, sao và Tứ Hóa. Không gửi họ tên, email, ngày sinh, giờ sinh hoặc khóa phiên.</p>
              <p>Dấu vân tay dữ liệu: <code>{disclosure.hash.slice(0, 16)}…</code></p>
              <div className={styles.facts}>
                {disclosure.factPack.houses.map(h => <div key={h.id}>
                  <strong>{h.id} · {h.palace}</strong>
                  <span>
                    {[...h.stars, ...h.auxiliary].join(' · ') || 'Chưa có sao'}
                  </span>
                </div>)}
              </div>
            </> : disclosureError ? <div role="alert">
              <p>
                {disclosureError}
              </p>
              <button type="button" disabled={busy} onClick={retryDisclosure}>Tải lại dữ liệu gửi AI</button>
            </div> : <p role="status">
              {chartId ? 'Đang lấy dữ liệu tính toán đã xác minh…' : 'Chọn lá số đã lưu để xem dữ liệu gửi AI.'}
            </p>}
          </details>
          <label className={styles.consent}>
            <input type="checkbox" disabled={busy || historyLoading || !disclosure} checked={consent} onChange={e => setConsent(e.target.checked)} />
            <span>Tôi đồng ý gửi dữ liệu chuyên môn nêu trên và câu hỏi của mình tới Google Gemini để tạo nội dung giải thích. Tôi hiểu nội dung chỉ mang tính tham khảo.</span>
          </label>
          <QuestionStarters disabled={busy || historyLoading} onChoose={(text, subject) => {
            setQuestion(text);
            setTopic(subject);
          }} />
          <div>
            <label htmlFor="huyen-giai-question">Câu hỏi hoặc nội dung cần giải thích</label>
            <textarea id="huyen-giai-question" disabled={busy || historyLoading} required minLength={4} maxLength={800} rows={4} value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ví dụ: Hai cung này hỗ trợ và mâu thuẫn nhau ở đâu? Cần bổ sung dữ kiện gì?" />
          </div>
          <div className={styles.actions}>
            <button className={styles.primaryButton} type="submit" disabled={!status?.ai.enabled || !chartId || !consent || !disclosure || question.trim().length < 4 || busy || historyLoading || catalogLoading || !!catalogError}>
              {busy ? 'Đang xử lý…' : conversationId ? 'Hỏi tiếp' : 'Luận giải'}
            </button>
            <button type="button" onClick={() => window.print()} disabled={!messages.length}>In / Lưu PDF</button>
          </div>
        </form>
        {error && <p role="alert" className={styles.error}>
          {error}
        </p>}
        {notice && <p role="status" className={styles.note}>
          {notice}
        </p>}
        <div className={styles.responses} aria-live="polite">
          {nextBefore && <div className={styles.actions}><button type="button" disabled={busy || historyLoading} onClick={() => void loadEarlier()}>
            {loadingEarlier ? 'Đang tải các lượt trước…' : 'Xem các lượt trước'}
          </button></div>}
          {historyLoading && <p role="status">{loadingEarlier ? 'Đang tải các lượt trước…' : 'Đang mở cuộc luận giải…'}</p>}
          {messages.map(m => <article className={styles.answer} key={m.id}>
            <p className={styles.question}>Câu hỏi: {m.question}</p>
            <h2>Luận giải</h2>
            <p>
              {m.response.summary}
            </p>
            <h3>Căn cứ</h3>
            {m.response.findings.map((f, i) => <section key={i}><strong>
                {kinds[f.kind]}
              </strong> — {f.text}<div className={styles.muted}>Dẫn chứng: {f.evidenceIds.map(id => {
                  const house = m.factsSha256 && m.factsSha256 === disclosure?.hash ? disclosure.factPack.houses.find(h => h.id === id) : null;
                  return house ? `${id} · ${house.palace} (${[...house.stars, ...house.auxiliary].join(', ') || 'chưa có sao'})` : id;
                }).join('; ')}</div></section>)}
            <h3>Những điều chưa đủ dữ kiện</h3>
            {m.response.missingData.length ? m.response.missingData.map((x, i) => <p key={i}>
              {x}
            </p>) : <p>Cần đối chiếu độc lập nếu sử dụng kết quả để đưa ra quyết định quan trọng.</p>}
            <div className={styles.actions}>
              <button type="button" disabled={busy || historyLoading} onClick={() => void rate(m.id, true)}>Hữu ích</button>
              <button type="button" disabled={busy || historyLoading} onClick={() => void rate(m.id, false)}>Chưa chính xác</button>
            </div>
            <AnswerTools message={m} />
            <footer>{m.engineRevision} · {new Date(m.createdAt).toLocaleString('vi-VN')}<p>Nội dung tham khảo trong khuôn khổ huyền học, không phải dự đoán chắc chắn.</p></footer>
          </article>)}
        </div>
      </section>
    </div>
  </main>;
}
