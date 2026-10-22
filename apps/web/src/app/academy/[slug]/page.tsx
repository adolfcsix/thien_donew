import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import lessons from '@/features/academy/lessons.json';
import {LessonCheck} from '@/features/academy/lesson-check';
import '../academy.css';

type RouteProps = { params: Promise<{slug: string}> };
export function generateStaticParams() { return lessons.map(lesson => ({slug:lesson.slug})); }

export async function generateMetadata({params}:RouteProps):Promise<Metadata> {
  const {slug} = await params;
  const lesson = lessons.find(l => l.slug === slug);
  return {title: lesson ? `${lesson.title} — Học viện` : 'Không tìm thấy bài học', description:lesson?.lead};
}

export default async function AcademyLesson({params}:RouteProps) {
  const {slug} = await params;
  const index = lessons.findIndex(lesson => lesson.slug === slug);
  if (index === -1) notFound();
  const lesson = lessons[index];
  return <article className="academy-reading">
    <nav className="academy-breadcrumb" aria-label="Đường dẫn bài học"><Link href="/academy">← Học viện</Link><span aria-hidden="true"> / </span><span>Bài {String(index+1).padStart(2,'0')}</span></nav>
    <header className="academy-reading-head">
      <div className="eyebrow">BÀI {String(index+1).padStart(2,'0')} · {lesson.level} · {lesson.minutes} PHÚT</div>
      <h1 className="serif">{lesson.title}</h1><p>{lesson.lead}</p>
      <div className="academy-learning-tag">Tư liệu học thuật truyền thống <span aria-hidden="true">·</span> Không phải dự đoán thực chứng</div>
    </header>
    <div className="academy-reading-grid">
      <aside className="academy-reading-toc" aria-label="Mục lục bài học"><h2>Mục lục</h2><ol>{lesson.sections.map((s,i) => <li key={i}><a href={`#section-${i+1}`}>{s.heading}</a></li>)}</ol><a className="academy-toc-action" href="#lesson-check-title">Kiểm tra cuối bài ↓</a></aside>
      <div className="academy-reading-main">
        {lesson.sections.map((s,i) => <section className="academy-chapter" id={`section-${i+1}`} key={i}>
          <span className="academy-chapter-num">{String(i+1).padStart(2,'0')} / NỘI DUNG</span><h2 className="serif">{s.heading}</h2><p>{s.body}</p>
        </section>)}
        <section className="academy-example"><span className="eyebrow">TÌNH HUỐNG ÁP DỤNG</span><h2 className="serif">Thử đối chiếu</h2><p>{lesson.example}</p><Link href={lesson.route}>Mở công cụ liên quan ↗</Link></section>
        <section className="academy-pitfalls"><h2 className="serif">Hai lỗi cần tránh</h2><ul>{lesson.pitfalls.map(v => <li key={v}>{v}</li>)}</ul></section>
        {lesson.sources.length>0&&<section className="academy-chapter"><h2 className="serif">Nguồn và phạm vi đối chiếu</h2><ul>{lesson.sources.map(source=><li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul><p>Đây là bản chép số tác phẩm cổ. Bài học diễn giải phạm vi công cụ hiện có; chưa thay thế thẩm định ảnh bản in hoặc phản biện chuyên gia.</p></section>}
        <LessonCheck slug={lesson.slug} questions={lesson.quiz} />
      </div>
    </div>
    <nav className="academy-lesson-nav" aria-label="Điều hướng bài học">
      {index > 0 ? <Link href={`/academy/${lessons[index-1].slug}`}>← Bài trước <strong>{lessons[index-1].title}</strong></Link> : <Link href="/academy">← Danh sách bài học</Link>}
      {index < lessons.length - 1 ? <Link href={`/academy/${lessons[index+1].slug}`}>Bài tiếp theo → <strong>{lessons[index+1].title}</strong></Link> : <Link href="/academy">Về Học viện ↑</Link>}
    </nav>
  </article>;
}
