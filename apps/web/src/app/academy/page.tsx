import Link from 'next/link';
import lessons from '@/features/academy/lessons.json';
import { AcademyProgress } from '@/features/academy/academy-progress';
import './academy.css';

export const metadata = { title: 'Học viện Thiên Đồ — Lộ trình học thực hành' };
const levels = ['Nhập môn', 'Cơ bản', 'Trung cấp', 'Nâng cao', 'Mở rộng'];

export default function Academy() {
  return <>
    <header className="page-heading academy-head">
      <span className="eyebrow">HỌC VIỆN · LỘ TRÌNH CÓ THỂ THỰC HÀNH</span>
      <h1 className="serif">Từ đọc địa bàn đến kiểm chứng luận cứ.</h1>
      <p>{lessons.length} bài học Tử Vi, Mai Hoa, Kỳ Môn và Lục Hào theo tầng, có ví dụ đối chiếu, lỗi thường gặp và câu hỏi kiểm tra. Nội dung giải thích cách hoạt động của các bộ quy tắc truyền thống; không khẳng định khả năng dự đoán tương lai.</p>
      <div className="academy-totals" aria-label="Thống kê chương trình">
        <span><strong>{lessons.length}</strong> bài học</span>
        <span><strong>{lessons.reduce((sum,l) => sum + l.sections.length, 0)}</strong> mục kiến thức</span>
        <span><strong>{lessons.reduce((sum,l) => sum + l.quiz.length, 0)}</strong> câu luyện tập</span>
      </div>
      <AcademyProgress slugs={lessons.map(item => item.slug)} />
    </header>
    <div className="academy-roadmap" aria-label="Lộ trình học theo trình độ">
      {levels.map((level, index) => <div key={level} className="academy-milestone"><b>{String(index+1).padStart(2,'0')}</b><span>{level}</span></div>)}
    </div>
    <section className="academy-list" aria-label="Danh sách các bài học">
      {lessons.map((lesson,index) =>
        <article className="academy-lesson-card" key={lesson.slug}>
          <div className="academy-lesson-number">{String(index + 1).padStart(2, '0')}</div>
          <div className="academy-lesson-copy">
            <div className="academy-overline">{lesson.level} <span aria-hidden="true">·</span> {lesson.minutes} phút đọc <span aria-hidden="true">·</span> {lesson.sections.length} mục</div>
            <h2 className="serif"><Link href={`/academy/${lesson.slug}`}>{lesson.title}</Link></h2>
            <p>{lesson.lead}</p>
            <Link className="academy-lesson-link" href={`/academy/${lesson.slug}`} aria-label={`Đọc bài học ${lesson.title}`}>Vào bài học <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="academy-lesson-mark" aria-hidden="true">{index%2 ? '☷' : '✧'}</div>
        </article>
      )}
    </section>
    <aside className="academy-bridge"><div><span className="eyebrow">ĐỌC ĐI ĐÔI VỚI THỰC HÀNH</span><h2 className="serif">Dữ liệu thực, câu hỏi có thể kiểm tra.</h2><p>Mỗi bài liên kết tới chức năng liên quan của Thiên Đồ. Bạn có thể mở công cụ rồi trở lại bài giảng, ghi những điều đã quan sát và những điểm còn cần tìm hiểu.</p></div><Link className="btn gold" href="/chart">Mở phòng lá số ↗</Link></aside>
  </>;
}
