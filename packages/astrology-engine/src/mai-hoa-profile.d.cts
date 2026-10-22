export type MaiHoaMode='time'|'numbers'|'later-heaven'|'count-hour'|'sound-hour';
export type MaiHoaProfile={method:'mai-hoa-evidence-v1';version:1;knowledge:'11.129';mode:MaiHoaMode;yearBranch?:number;lunarMonth?:number;lunarDay?:number;hourBranch?:number;first?:number;second?:number;objectTrigram?:number;directionTrigram?:number;count?:number;nuclearPolicy:'original'|'pure-transformed';seasonBranch:number|null;timingUnit:'unresolved'|'day'|'month'|'year';pace:'unresolved'|'slow'|'medium'|'fast';question:string;evidence:{kind:'observation'|'assumption'|'counter';statement:string}[]};
export declare const METHOD:'mai-hoa-evidence-v1',VERSION:1;
export declare const MODES:readonly MaiHoaMode[];
export declare const FIELDS:Readonly<Record<MaiHoaMode,readonly string[]>>;
export declare function validateMaiHoaProfile(raw:unknown):MaiHoaProfile;
export declare function createMaiHoaProfile(input:Record<string,unknown>):MaiHoaProfile;
