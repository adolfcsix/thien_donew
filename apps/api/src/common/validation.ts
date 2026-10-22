import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import Engine = require('@thiendo/astrology-engine');
import type { BirthInput, ChartInput } from '@thiendo/shared-types';
const validLabel = (v: unknown): boolean => typeof v === 'string' && v.trim().length >= 1 && v.trim().length <= 70;
export function validBirth(body: any): BirthInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('Thiếu dữ liệu ngày sinh');
  const { date, hour, minute, calendar, leap, gender } = body;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59 || !['solar', 'lunar'].includes(calendar) || typeof leap !== 'boolean' || !['Nam', 'Nữ'].includes(gender)) throw new BadRequestException('Thông tin ngày giờ sinh không hợp lệ');
  if (calendar === 'solar' && leap) throw new BadRequestException('Ngày dương không có tháng nhuận âm lịch');
  try { Engine.calculate({ date, hour, minute, calendar, leap, gender }); } catch (e) { throw new BadRequestException((e as Error).message); }
  return { date, hour, minute, calendar, leap, gender };
}
export function validChart(body: any): ChartInput {
  if (!validLabel(body?.label)) throw new BadRequestException('Tên lá số phải có 1–70 ký tự');
  return { ...validBirth(body), label: body.label.trim() };
}
export function resultVerified(input: BirthInput) {
  const result = Engine.calculate(input);
  if (result.houses?.length !== 12 || result.houses.reduce((n, h) => n + h.stars.length, 0) !== 14) throw new UnprocessableEntityException('Lá số không qua kiểm tra cấu trúc');
  return result;
}
