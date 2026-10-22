'use client';

import {useState, type FormEvent} from 'react';
import {academyProgressPrefix} from './academy-progress';

type CheckQuestion = {question: string; choices: string[]; correct: number; reason: string};

export function LessonCheck({slug, questions}: {slug:string; questions: CheckQuestion[]}) {
  const [answers, setAnswers] = useState<Record<number,number>>({});
  const [submitted, setSubmitted] = useState(false);
  const answered = Object.keys(answers).length;
  const score = questions.filter((q,i) => answers[i] === q.correct).length;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (answered !== questions.length) return;
    setSubmitted(true);
    if (score === questions.length) {
      try { window.localStorage.setItem(`${academyProgressPrefix}${slug}`, 'yes'); } catch { /* Storage may be unavailable. */ }
    }
  }
  return <section className="academy-check" aria-labelledby="lesson-check-title">
    <div className="eyebrow">TỰ KIỂM TRA KIẾN THỨC</div><h2 className="serif" id="lesson-check-title">Bạn nắm được điều gì?</h2>
    <p>Chọn một đáp án cho mỗi câu. Bài kiểm tra chỉ đánh giá mức nhớ kiến thức trong bài, không đánh giá khả năng luận số.</p>
    <form onSubmit={submit}>
      {questions.map((q,i) => <fieldset className="academy-question" key={`${slug}-${i}`}>
        <legend><span>Câu {i + 1}.</span> {q.question}</legend>
        <div className="academy-choices">
          {q.choices.map((option,index) => <label className={`academy-choice${submitted && index === q.correct ? ' is-correct' : ''}${submitted && answers[i] === index && index !== q.correct ? ' is-incorrect':''}`} key={`${slug}-${i}-${index}`}>
            <input type="radio" name={`question-${i}`} value={index} checked={answers[i] === index} disabled={submitted} onChange={() => setAnswers(current => ({...current,[i]:index}))}/>
            <span>{option}</span>
          </label>)}
        </div>
        {submitted && <p className="academy-answer" role="note">{answers[i] === q.correct ? '✓ Đúng. ' : 'Chưa đúng. '}{q.reason}</p>}
      </fieldset>)}
      {submitted ? <div className="academy-result" role="status" aria-live="polite"><strong>{score} / {questions.length} câu đúng</strong><p>{score === questions.length ? 'Đã hoàn thành bài học trên trình duyệt này.' : 'Bạn có thể đọc lại các mục liên quan rồi thử lại.'}</p><button className="btn secondary" type="button" onClick={() => {setAnswers({});setSubmitted(false);}}>Làm lại</button></div>
        : <div className="academy-submit"><span>{answered}/{questions.length} câu đã chọn</span><button type="submit" className="btn gold" disabled={answered !== questions.length}>Kiểm tra đáp án →</button></div>}
    </form>
  </section>;
}
