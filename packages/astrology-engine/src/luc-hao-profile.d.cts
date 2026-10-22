export type LucHaoCalendar={mode:'none'}|{mode:'calendar';date:string}|{mode:'manual';dayStem:string;dayBranch:string;monthBranch:string|null;confirmed:true};
export type LucHaoProfile={method:'luc-hao-jingfang-evidence-v1';version:1;knowledge:'11.130';lines:number[];family:string;selection:{kind:'visible'|'hidden';position:number}|null;question:string;rationale:string;calendar:LucHaoCalendar};
export declare const METHOD:'luc-hao-jingfang-evidence-v1',VERSION:1,FAMILIES:readonly string[];
export declare function validateLucHaoProfile(raw:unknown):LucHaoProfile;
export declare function createLucHaoProfile(raw?:Record<string,unknown>):LucHaoProfile;
