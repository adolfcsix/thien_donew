import Engine from '@thiendo/astrology-engine';
import type { ChartInput, BirthCalendar } from '@thiendo/shared-types';

/** A calendar switch must preserve the birth instant, not reinterpret the date digits. */
export function convertBirthCalendar(input: ChartInput, next: BirthCalendar): ChartInput {
  if (next === input.calendar) return input;
  if (next !== 'solar' && next !== 'lunar') throw new RangeError('Loại lịch không hợp lệ');
  const chart = Engine.calculate(input);
  const converted = next === 'solar' ? chart.solar : chart.lunar;
  const date = `${String(converted.year).padStart(4, '0')}-${String(converted.month).padStart(2, '0')}-${String(converted.day).padStart(2, '0')}`;
  return { ...input, date, calendar:next, leap:next==='lunar' ? chart.lunar.leap : false };
}

export function birthCheck(input: ChartInput): {solar:string; lunar:string; hourBranch:string; error:null} | {solar:null; lunar:null;hourBranch:null;error:string} {
  try {
    const chart = Engine.calculate(input);
    const date = (value:{day:number;month:number;year:number}) => `${String(value.day).padStart(2,'0')}/${String(value.month).padStart(2,'0')}/${value.year}`;
    return {
      solar:date(chart.solar),
      lunar:date(chart.lunar)+(chart.lunar.leap?' (tháng nhuận)':''),
      hourBranch:chart.hourBranch,
      error:null,
    };
  } catch(error) {
    return {solar:null,lunar:null,hourBranch:null,error:error instanceof Error ? error.message : 'Thông tin ngày giờ sinh không hợp lệ'};
  }
}
