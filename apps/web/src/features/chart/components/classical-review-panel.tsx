'use client';

import type {ClassicalReviewMatrix} from '@thiendo/interpretation';
import referenceCases from '@thiendo/knowledge/src/classical-review-examples.json';
import positionCases from '@thiendo/knowledge/src/classical-position-examples.json';

const statusLabel:Record<ClassicalReviewMatrix['status'],string>={
  'needs-review':'Dữ liệu cần kiểm tra lại',
  'conditions-not-met':'Chưa đủ điều kiện cấu trúc',
  'incomplete-evidence':'Đủ cấu trúc, thiếu chứng cứ độ sáng',
  'qualified-candidate':'Đủ cấu trúc, có yếu tố cần đối chiếu',
  'structural-candidate':'Đủ cấu trúc để nghiên cứu'
};
/** Shows a critical checklist, never a certified classical pattern or prediction. */
export function ClassicalReviewPanel({review}:{review:ClassicalReviewMatrix}){
  return <section className="palace-reading-review" aria-label={`Kiểm tra đa tầng ${review.title}`}>
    <h5>Kiểm tra đa tầng · {statusLabel[review.status]}</h5>
    <p><strong>Câu hỏi:</strong> {review.focusQuestion}</p>
    <ol>{review.checks.map(check=><li key={check.id}>
      <strong>{check.met?'Đã đối chiếu':'Còn thiếu / cần kiểm tra'}:</strong> {check.label}. {check.detail}
    </li>)}</ol>
    <p><strong>Đặt trong bối cảnh:</strong> {review.interpretiveFrame}</p>
    {review.natalTransformations.length>0&&<p><strong>Tứ Hóa năm sinh có đích hợp lệ:</strong> {review.natalTransformations.map(x=>`${x.name} (${x.target}) tại ${x.palace}`).join(' · ')}</p>}
    {review.qualifiers.length>0&&<div><strong>Yếu tố cần đối chiếu, không tự động loại trừ:</strong>
      <ul>{review.qualifiers.map((item,i)=><li key={`${item.kind}-${item.branchIndex}-${i}`}>{item.explanation}</li>)}</ul>
    </div>}
    <details className="palace-reading-symbol"><summary><strong>So sánh phạm vi luận theo trường hợp</strong><span>Ba phép thử học tập · chưa thẩm định trường phái</span></summary>
      <p><strong>Câu hỏi phản biện:</strong> {review.schoolLenses.question}</p>
      <ol>{review.schoolLenses.tests.map(test=><li key={test.id}>
        <strong>{test.label}:</strong> {test.geometryMatches?'Đủ vị trí theo giả định':'Chưa khớp / cần kiểm tra'}.
        <p>{test.explanation}</p>
        <ul>{test.reasons.map((reason,i)=><li key={i}>{reason}</li>)}</ul>
      </li>)}</ol>
      <p><strong>Tình huống dễ nhầm:</strong> {review.schoolLenses.counterexample}</p>
      {review.schoolLenses.contextSignals.obstructions.length>0&&<p>Tuần/Triệt đã quan sát: {review.schoolLenses.contextSignals.obstructions.join(' · ')} (không tự động phủ quyết).</p>}
      {review.schoolLenses.contextSignals.verifiedHoaKy.length>0&&<p>Hóa Kỵ cần đối chiếu tại: {review.schoolLenses.contextSignals.verifiedHoaKy.join(' · ')}.</p>}
      <p><strong>Ca bổ sung (giả định):</strong> {positionCases.cases.filter(item=>item.familyId===review.id).map(item=><span key={item.id}>{item.input.date}, giờ {item.input.hour}:15 — đã đối chiếu cả ba phép thử vị trí.</span>)}</p>
      <small>{review.schoolLenses.notice}</small>
    </details>
    <p><strong>Phản chứng:</strong> {review.counterexample}</p>
    <p><strong>Bài tập:</strong> {review.practice}</p>
    <details className="palace-reading-symbol"><summary><strong>Hai ca đối chứng tính từ engine</strong><span>Dữ liệu sinh giả định · chỉ để học</span></summary>
      <ul>{referenceCases.cases.filter(item=>item.familyId===review.id).map(item=><li key={item.id}>
        <strong>{item.label}</strong> · {item.input.date}, giờ {item.input.hour}:15 · đã thấy: {item.observed.map(x=>x.star).join(' · ')||'Không có'}
        {item.absent.length>0?` · chưa khớp: ${item.absent.join(' · ')}`:''}
      </li>)}</ul><small>{referenceCases.notice}</small>
    </details>
    <small>{review.notice}</small>
  </section>;
}
