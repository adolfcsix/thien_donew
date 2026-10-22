'use client';
import {downloadBlobFile} from '@/lib/download-blob';

import { useState } from 'react';
import type { Message } from './types';
export function answerMarkdown(message: Message) {
  const kinds = {
    supportive: 'Thuận',
    challenging: 'Nghịch',
    uncertain: 'Chưa đủ cơ sở'
  };
  return ['# Thiên Đồ · Huyền Giải', '', 'Câu hỏi: ' + message.question, '', message.response.summary, '', ...message.response.findings.map(finding => `## ${kinds[finding.kind]}\n${finding.text}\n\nCăn cứ engine: ${finding.evidenceIds.join(', ')}`), '', '## Dữ kiện còn thiếu', ...message.response.missingData.map(text => '- ' + text), '', 'Phiên bản: ' + message.engineRevision, 'Thời gian: ' + message.createdAt, 'Nội dung tham khảo, không phải dự đoán chắc chắn hoặc tư vấn chuyên môn.', ''].join('\n');
}
export function AnswerTools({
  message
}: {
  message: Message;
}) {
  const [notice, setNotice] = useState('');
  async function copy() {
    try {
      await navigator.clipboard.writeText(answerMarkdown(message));
      setNotice('Đã sao chép bản luận giải.');
    } catch {
      setNotice('Trình duyệt chưa cho phép sao chép. Bạn có thể tải bản văn bản.');
    }
  }
  function download() {
    downloadBlobFile(new Blob([answerMarkdown(message)], {
      type: 'text/markdown;charset=utf-8'
    }), 'thien-do-luan-giai-' + message.id + '.md');
    setNotice('Đã tạo bản tải xuống Markdown.');
  }
  return <div>
    <div>
      <button type="button" onClick={() => void copy()}>Sao chép luận giải</button>
      {' '}
      <button type="button" onClick={download}>Tải bản văn bản</button>
    </div>
    {notice && <p role="status">
      {notice}
    </p>}
  </div>;
}
