'use client';

const starters = [{
  topic: 'overview',
  label: 'Tổng quan có căn cứ',
  question: 'Hãy tóm tắt cấu trúc lá số, nêu điểm thuận, nghịch và các dữ kiện còn thiếu; dẫn chứng từng cung.'
}, {
  topic: 'career',
  label: 'Công việc và thế mạnh',
  question: 'Những cấu trúc nào liên quan công việc và thế mạnh? Giải thích hai chiều, không khẳng định nghề nghiệp hay thành công chắc chắn.'
}, {
  topic: 'relationships',
  label: 'Quan hệ',
  question: 'Giải thích các căn cứ liên quan quan hệ trong lá số. Điều gì có thể diễn giải và điều gì chưa đủ dữ kiện?'
}, {
  topic: 'terminology',
  label: 'Giải thích cho người mới',
  question: 'Chọn các thuật ngữ quan trọng trong lá số và giải thích bằng ngôn ngữ dễ hiểu, kèm căn cứ cung và sao.'
}];
export function QuestionStarters({
  disabled,
  onChoose
}: {
  disabled: boolean;
  onChoose: (question: string, topic: string) => void;
}) {
  return <details>
    <summary>Gợi ý câu hỏi để bắt đầu</summary>
    <p>Chọn một mẫu rồi chỉnh theo nhu cầu. Chưa gửi tới Gemini cho đến khi bạn bấm Luận giải/Hỏi tiếp.</p>
    <div>
      {starters.map(item => <button key={item.topic} type="button" disabled={disabled} onClick={() => onChoose(item.question, item.topic)}>
        {item.label}
      </button>)}
    </div>
  </details>;
}
