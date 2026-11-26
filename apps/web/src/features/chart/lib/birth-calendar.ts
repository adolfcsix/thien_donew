import Engine from '@thiendo/astrology-engine';
import type { ChartInput, BirthCalendar } from '@thiendo/shared-types';

type CalendarDate = { day: number; month: number; year: number };
const displayDate = ({ day, month, year }: CalendarDate) =>
  `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;

export const LEAP_PLACEMENT_NOTE = 'Thiên Đồ giữ nguyên số tháng âm khi an Mệnh, Tả Phụ và Hữu Bật, kể cả từ ngày 16.';

export function normalizeLunarBirthDate(value: string) {
  return value.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');
}

export function lunarMonthChoices(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [year, month, day] = date.split('-').map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 30) return null;

  function solarFor(dayOfMonth: number, leap: boolean) {
    try {
      return displayDate(Engine.calendarLunarToSolar(year, month, dayOfMonth, leap).solar);
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      return null;
    }
  }

  const regularSolar = solarFor(day, false);
  const leapSolar = solarFor(day, true);
  const hasLeapMonth = Boolean(leapSolar || (day !== 1 && solarFor(1, true)));
  return { regularSolar, leapSolar, hasLeapMonth };
}

/** A calendar switch must preserve the birth instant, not reinterpret the date digits. */
export function convertBirthCalendar(input: ChartInput, next: BirthCalendar): ChartInput {
  if (next === input.calendar) return input;
  if (next !== 'solar' && next !== 'lunar') throw new RangeError('Loại lịch không hợp lệ');
  const chart = Engine.calculate(input);
  const converted = next === 'solar' ? chart.solar : chart.lunar;
  const date = `${String(converted.year).padStart(4, '0')}-${String(converted.month).padStart(2, '0')}-${String(converted.day).padStart(2, '0')}`;
  return { ...input, date, calendar:next, leap:next==='lunar' ? chart.lunar.leap : false };
}

export function birthCheck(input: ChartInput):
  { solar: string; lunar: string; hourBranch: string; leap: boolean; error: null } |
  { solar: null; lunar: null; hourBranch: null; leap: null; error: string } {
  try {
    const chart = Engine.calculate(input);
    return {
      solar:displayDate(chart.solar),
      lunar:displayDate(chart.lunar)+(chart.lunar.leap?' (tháng nhuận)':''),
      hourBranch:chart.hourBranch,
      leap:chart.lunar.leap,
      error:null,
    };
  } catch(error) {
    return {solar:null,lunar:null,hourBranch:null,leap:null,error:error instanceof Error ? error.message : 'Thông tin ngày giờ sinh không hợp lệ'};
  }
}
