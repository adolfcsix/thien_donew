import {BadRequestException} from '@nestjs/common';

export const insightTopics = ['traffic', 'forum', 'members', 'ranks', 'finance', 'system', 'library', 'charts'] as const;
export type InsightTopic = typeof insightTopics[number];
export type InsightPeriod = 'today' | 'yesterday' | 'week' | 'month';
const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();

/** A closed query vocabulary; questions can never become SQL, URLs or instructions. */
export function insightInput(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new BadRequestException('Yêu cầu không hợp lệ');
  const value = raw as Record<string, unknown>;
  if (typeof value.question !== 'string' || value.question.trim().length < 4 || value.question.length > 500) {
    throw new BadRequestException('Câu hỏi từ 4 đến 500 ký tự');
  }
  if (value.explain !== undefined && typeof value.explain !== 'boolean') throw new BadRequestException('Lựa chọn Gemini không hợp lệ');
  const question = normalize(value.question);
  const topics: InsightTopic[] = [];
  if (/truy cap|luot xem|traffic|page.?view/.test(question)) topics.push('traffic');
  if (/bai|dien dan|binh luan|forum/.test(question)) topics.push('forum');
  if (/tai khoan moi|thanh vien moi|dang ky|dang ki/.test(question)) topics.push('members');
  if (/cap cao|cap \d+|canh gioi|huy hieu|xep hang|tinh canh/.test(question)) topics.push('ranks');
  if (/doanh thu|giao dich|thanh toan|don hang|tai chinh/.test(question)) topics.push('finance');
  if (/he thong|bao cao.*duyet|cho xu ly|kiem duyet/.test(question)) topics.push('system');
  if (/sach|tai lieu|van kho/.test(question)) topics.push('library');
  if (/la so|su dung ai|yeu cau ai/.test(question)) topics.push('charts');
  if (/tong quan|tong hop|bao cao chung/.test(question)) topics.push(...insightTopics);
  if (!topics.length) throw new BadRequestException('Hiện hỗ trợ lượt xem, thành viên, diễn đàn, cảnh giới công khai, tài chính, thư viện và trạng thái hệ thống. Hãy chọn câu hỏi gợi ý.');
  // Explicit calendar dates and arbitrary ranges need their own validated parser, never guess.
  if (/\d{1,4}[/-]\d|nam ngoai|thang truoc|tuan truoc|tuan nay|thang nay/.test(question)) throw new BadRequestException('Khoảng ngày này chưa được hỗ trợ. Chọn Hôm nay, Hôm qua, 7 ngày hoặc 30 ngày.');
  const inferred: InsightPeriod = /hom qua/.test(question) ? 'yesterday' : /30 ngay/.test(question) ? 'month' : /7 ngay/.test(question) ? 'week' : 'today';
  const period = value.period === undefined || value.period === 'auto' ? inferred : value.period;
  if (!['today', 'yesterday', 'week', 'month'].includes(String(period))) throw new BadRequestException('Khoảng thời gian không hợp lệ');
  const mentionedLevel = question.match(/cap\s+(\d{1,2})/);
  const minLevel = value.minLevel === undefined ? (mentionedLevel ? Number(mentionedLevel[1]) : 10) : value.minLevel;
  if (!Number.isInteger(minLevel) || Number(minLevel) < 1 || Number(minLevel) > 18) throw new BadRequestException('Cấp tối thiểu từ 1 đến 18');
  return {topics: [...new Set(topics)], period: period as InsightPeriod, minLevel: Number(minLevel), explain: value.explain === true};
}

export type InsightFact = {id: string; label: string; value: number; source: string};
