export type StudyDiscipline = 'general'|'mai-hoa'|'luc-hao'|'ky-mon'|'dai-luc-nham'|'thai-at'|'phong-thuy'|'ha-lac'|'thiet-ban'|'lich-phap'|'numerology'|'western-astrology'|'tarot'|'bazi';
export interface StudyEntry {
  id:string;
  discipline:StudyDiscipline;
  title:string;
  summary:string;
  notes:string;
  tags:string[];
  snapshot:Record<string,unknown>;
  pinned:boolean;
  birthProfileId?:string|null;
  createdAt:string;
  updatedAt:string;
}
export interface StudyDraft {
  discipline:StudyDiscipline;
  title:string;
  summary:string;
  notes:string;
  tags:string[];
  snapshot:Record<string,unknown>;
  birthProfileId?:string|null;
}
