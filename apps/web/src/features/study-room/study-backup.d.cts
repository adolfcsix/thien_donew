export const FORMAT:string;
export const VERSION:number;
export const MAX_ENTRIES:number;
export const MAX_BYTES:number;
export function parseStudyBackup(input:unknown):Array<{
  discipline:'general'|'mai-hoa'|'dai-luc-nham'|'thai-at'|'luc-hao'|'ky-mon'|'phong-thuy'|'ha-lac'|'thiet-ban'|'lich-phap'|'numerology'|'western-astrology'|'tarot'|'bazi';
  title:string;summary:string;notes:string;tags:string[];snapshot:Record<string,unknown>;pinned:boolean;
}>;
