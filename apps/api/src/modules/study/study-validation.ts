import {calculateTaiyi} from '@thiendo/astrology-engine/src/taiyi-depth.cjs';
import {validateBaziSnapshot} from '@thiendo/astrology-engine/src/bazi-study-snapshot.cjs';
import {calculate as calculateHaLac} from '@thiendo/astrology-engine/src/ha-lac-source.cjs';
import {sliceTime as sliceTieBan} from '@thiendo/astrology-engine/src/tieban-source.cjs';
import {assess as auditCalendar} from '@thiendo/astrology-engine/src/traditional-calendar-audit.cjs';
import {validateDaLiuRenSnapshot} from '@thiendo/astrology-engine/src/da-liu-ren-depth.cjs';
import {validateQimenProfile} from '@thiendo/astrology-engine/src/qimen-profile.cjs';
import {validateLucHaoProfile} from '@thiendo/astrology-engine/src/luc-hao-profile.cjs';
import {validateMaiHoaProfile} from '@thiendo/astrology-engine/src/mai-hoa-profile.cjs';
import {METHOD as RELATIONSHIP_METHOD,validateRelationshipInput} from '@thiendo/astrology-engine/src/western-relationship.cjs';
import {validateInput as validateNatal} from '@thiendo/astrology-engine/src/western-natal.cjs';
import {validateSpreadSnapshot as validateTarot} from '@thiendo/astrology-engine/src/tarot-rws.cjs';
import {validateInput as validateNumerology} from '@thiendo/astrology-engine/src/numerology-pythagorean.cjs';
import { BadRequestException } from '@nestjs/common';

export const STUDY_DISCIPLINES = ['general','mai-hoa','luc-hao','ky-mon','dai-luc-nham','thai-at','phong-thuy','ha-lac','thiet-ban','lich-phap','numerology','western-astrology','tarot','bazi'] as const;
export type StudyDiscipline = typeof STUDY_DISCIPLINES[number];
export type StudyEntryData = {
  discipline: StudyDiscipline; title: string; summary: string; notes: string;
  tags: string[]; snapshot: Record<string, unknown>;
};

function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Dữ liệu nghiên cứu phải là đối tượng JSON');
  }
  return value as Record<string, unknown>;
}
function short(value: unknown, label: string, limit: number, required = false): string {
  if (typeof value !== 'string' || value.length > limit * 2) throw new BadRequestException(`${label} không hợp lệ`);
  const result = value.trim();
  if (result.length > limit || (required && !result)) throw new BadRequestException(`${label} phải có 1–${limit} ký tự`);
  return result;
}
function number(value: unknown, label: string, min: number, max: number, integer = true): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || (integer && !Number.isInteger(value)) || value < min || value > max)
    throw new BadRequestException(`${label} không hợp lệ`);
  return value;
}
function bool(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new BadRequestException(`${label} không hợp lệ`);
  return value;
}
function oneOf(value: unknown, allowed: readonly string[], label: string): string {
  if (typeof value !== 'string' || !allowed.includes(value)) throw new BadRequestException(`${label} không hợp lệ`);
  return value;
}
function date(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) !== value)
    throw new BadRequestException('Ngày không hợp lệ');
  const year = Number(value.slice(0,4));
  if (year < 1900 || year > 2100) throw new BadRequestException('Năm nằm ngoài khoảng được hỗ trợ');
  return value;
}

/** Do NOT store client-provided calculation results or arbitrary JSON.
 * Only minimum reproducible inputs are persisted, and all unknown keys are discarded. */
export function studySnapshot(discipline: StudyDiscipline, raw: unknown): Record<string, unknown> {
  const input = object(raw);
  const encoded = JSON.stringify(input);
  if (discipline === 'tarot' && input.version === 2 ? Buffer.byteLength(encoded,'utf8') > 12288 : encoded.length > 2048) throw new BadRequestException('Dữ liệu đầu vào vượt giới hạn');
  if (discipline === 'bazi') {
    try { return {...validateBaziSnapshot(input)}; } catch(error) { throw new BadRequestException((error as Error).message); }
  }
  if (discipline === 'ha-lac') {
    try { calculateHaLac(input); return {...input}; } catch(error) { throw new BadRequestException((error as Error).message); }
  }
  if (discipline === 'thiet-ban') {
    try { sliceTieBan(input); return {hour:input.hour,minute:input.minute,methodId:input.methodId,sourceId:input.sourceId}; } catch(error) { throw new BadRequestException((error as Error).message); }
  }
  if (discipline === 'lich-phap') {
    try { auditCalendar(input); return {...input}; } catch(error) { throw new BadRequestException((error as Error).message); }
  }
  if (discipline === 'thai-at') {
    try {
      if (input.unit !== 'year' || input.calendarBoundaryResolved !== true) throw Error('Chỉ lưu phép Tuế kế đã xác minh lịch pháp.');
      const validated = calculateTaiyi(input);
      if (validated.status !== 'annual-table-research') throw Error('Tuế kế chưa đủ dữ kiện.');
      return {...input};
    } catch (error) { throw new BadRequestException((error as Error).message); }
  }
  if (discipline === 'dai-luc-nham') {
    try { return {...validateDaLiuRenSnapshot(input)}; } catch (error) { throw new BadRequestException((error as Error).message); }
  }
  if (discipline === 'tarot') {
    try { return {...validateTarot(input)}; } catch(error) { throw new BadRequestException((error as Error).message); }
  }
  if (discipline === 'western-astrology') {
    try { return {...(input.method===RELATIONSHIP_METHOD?validateRelationshipInput(input):validateNatal(input))}; } catch(error) { throw new BadRequestException((error as Error).message); }
  }
  if (discipline === 'numerology') {
    try { return {...validateNumerology(input)}; } catch(error) { throw new BadRequestException((error as Error).message); }
  }
  if (discipline === 'general') return {};
  if (discipline === 'mai-hoa' && Object.hasOwn(input,'method')) {
    try { return {...validateMaiHoaProfile(input)}; } catch(error) { throw new BadRequestException((error as Error).message); }
  }
  if (discipline === 'mai-hoa') {
    const mode = oneOf(input.mode,['time','numbers','later-heaven'],'Phương pháp Mai Hoa');
    return mode === 'numbers' ? {
      mode, first: number(input.first,'Số 1',1,1000000), second: number(input.second,'Số 2',1,1000000),
    } : mode === 'later-heaven' ? {
      mode, objectTrigram: number(input.objectTrigram,'Vật tượng',1,8),
      directionTrigram: number(input.directionTrigram,'Phương vị',1,8),
      hourBranch: number(input.hourBranch,'Chi giờ',1,12),
    } : {
      mode, yearBranch: number(input.yearBranch,'Chi năm',1,12), lunarMonth: number(input.lunarMonth,'Tháng âm',1,12),
      lunarDay: number(input.lunarDay,'Ngày âm',1,30), hourBranch: number(input.hourBranch,'Chi giờ',1,12),
    };
  }
  if (discipline === 'luc-hao' && Object.hasOwn(input,'method')) {
    try { return {...validateLucHaoProfile(input)}; } catch(error) { throw new BadRequestException((error as Error).message); }
  }
  if (discipline === 'luc-hao') {
    if (!Array.isArray(input.lines) || input.lines.length !== 6 || !input.lines.every(x => [6,7,8,9].includes(x)))
      throw new BadRequestException('Lục Hào phải có đúng sáu hào 6–9');
    const mode = oneOf(input.mode,['calendar','manual'],'Nguồn Can Chi');
    if (mode === 'calendar') return { lines: [...input.lines], mode, ...(input.date ? { date: date(input.date) } : {}) };
    const stem = (input.dayStem ?? '') as unknown;
    const branch = (input.dayBranch ?? '') as unknown;
    const month = (input.monthBranch ?? '') as unknown;
    const allowedStems = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
    const allowedBranches = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
    if (typeof stem === 'string' && typeof branch === 'string' && stem && branch &&
        allowedStems.includes(stem) && allowedBranches.includes(branch) &&
        allowedStems.indexOf(stem) % 2 !== allowedBranches.indexOf(branch) % 2)
      throw new BadRequestException('Can Chi ngày không thuộc vòng lục thập hợp lệ');
    return { lines: [...input.lines], mode,
      dayStem: stem === '' ? '' : oneOf(stem,allowedStems,'Nhật can'),
      dayBranch: branch === '' ? '' : oneOf(branch,allowedBranches,'Nhật chi'),
      monthBranch: month === '' ? '' : oneOf(month,allowedBranches,'Nguyệt kiến') };
  }
  if (discipline === 'ky-mon' && Object.hasOwn(input,'method')) {
    try { return {...validateQimenProfile(input)}; } catch(error) { throw new BadRequestException((error as Error).message); }
  }
  if (discipline === 'ky-mon') {
    const mode = oneOf(input.mode,['auto','manual'],'Nguồn lập cục');
    const withHour = bool(input.withHour,'Tùy chọn thời bàn');
    if (mode === 'manual') return { mode, withHour,
      solarTermIndex: number(input.solarTermIndex,'Tiết khí',0,23),
      dayCycleIndex: number(input.dayCycleIndex,'Ngày lục thập',0,59),
      hourBranchIndex: number(input.hourBranchIndex,'Chi giờ',0,11),
    };
    return { mode, withHour, date: date(input.date), hour: number(input.hour,'Giờ',0,23),
      minute: number(input.minute,'Phút',0,59), dayBoundary: oneOf(input.dayBoundary,['midnight','late-zi'],'Đổi ngày'),
      ...(Object.hasOwn(input,'lateZiAcknowledged') ? {lateZiAcknowledged:bool(input.lateZiAcknowledged,'Xác nhận giờ Tý')} : {}) };
  }
  if (discipline === 'phong-thuy') return { degrees: number(input.degrees,'Góc đo',0,360,false) };
  throw new BadRequestException('Bộ môn không hợp lệ');
}

export function createStudyEntry(body: unknown): StudyEntryData {
  const input = object(body);
  if (!STUDY_DISCIPLINES.includes(input.discipline as StudyDiscipline)) throw new BadRequestException('Bộ môn chưa được hỗ trợ');
  const discipline = input.discipline as StudyDiscipline;
  const tags = tagsValue(input.tags ?? []);
  return { discipline, title: short(input.title,'Tiêu đề',100,true), summary: short(input.summary ?? '','Mô tả',240),
    notes: notesValue(input.notes ?? ''), tags, snapshot: studySnapshot(discipline,input.snapshot ?? {}) };
}
function notesValue(value: unknown): string {
  if (typeof value !== 'string' || value.length > 3000) throw new BadRequestException('Ghi chú tối đa 3.000 ký tự');
  return value;
}
function tagsValue(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 5) throw new BadRequestException('Tối đa 5 nhãn');
  const tags = value.map(x => short(x,'Nhãn',24,true));
  if (new Set(tags.map(x => x.toLowerCase())).size !== tags.length) throw new BadRequestException('Nhãn không được trùng');
  return tags;
}
/** Validate the entire untrusted archive before opening a database transaction.
 * IDs, user_id, timestamps and calculated results in old exports are never trusted.
 */
export type StudyImportEntry = StudyEntryData & { pinned: boolean };
/** A per-selection UUID is an idempotency key, not an authorization token. */
export function studyImportId(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new BadRequestException('Mã yêu cầu nhập dữ liệu không hợp lệ');
  }
  return value.toLowerCase();
}
export function validateStudyImport(body: unknown): StudyImportEntry[] {
  const input = object(body);
  studyImportId(input.importId);
  if (input.format !== 'thien-do.study-export' || input.version !== 1) {
    throw new BadRequestException('Định dạng hoặc phiên bản bản sao Thư phòng không được hỗ trợ');
  }
  if (!Array.isArray(input.entries) || input.entries.length < 1 || input.entries.length > 200) {
    throw new BadRequestException('Bản sao phải có 1–200 hồ sơ');
  }
  // Protect direct callers too; the HTTP layer also limits the request body.
  if (Buffer.byteLength(JSON.stringify(input), 'utf8') > 2 * 1024 * 1024) {
    throw new BadRequestException('Bản sao vượt giới hạn 2 MB');
  }
  return input.entries.map((raw: unknown, index: number) => {
    const data = object(raw);
    if (typeof data.pinned !== 'boolean') {
      throw new BadRequestException(`Hồ sơ ${index + 1}: trạng thái ghim không hợp lệ`);
    }
    return { ...createStudyEntry(data), pinned: data.pinned };
  });
}

export {birthProfileRef} from '../../common/profile-identifiers';
import {birthProfileRef} from '../../common/profile-identifiers';

export function patchStudyEntry(body: unknown): {title?: string;notes?: string;tags?:string[];pinned?:boolean;birthProfileId?:string|null} {
  const input = object(body);
  const allowed = ['title','notes','tags','pinned','birthProfileId'];
  const keys = Object.keys(input);
  if (!keys.length || keys.some(key => !allowed.includes(key))) throw new BadRequestException('Chỉ được sửa tiêu đề, ghi chú, nhãn và ghim');
  return {
    ...(Object.hasOwn(input,'title') ? {title:short(input.title,'Tiêu đề',100,true)} : {}),
    ...(Object.hasOwn(input,'notes') ? {notes:notesValue(input.notes)} : {}),
    ...(Object.hasOwn(input,'tags') ? {tags:tagsValue(input.tags)} : {}),
    ...(Object.hasOwn(input,'pinned') ? {pinned:bool(input.pinned,'Ghim')} : {}),
    ...(Object.hasOwn(input,'birthProfileId') ? {birthProfileId:birthProfileRef(input.birthProfileId)} : {}),
  };
}
