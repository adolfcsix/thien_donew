export declare const STEMS: readonly string[];
export declare const STEM_LODGING: Readonly<Record<string,string>>;
export declare const STEM_ELEMENTS: Readonly<Record<string,string>>;
export declare const BRANCH_ELEMENTS: Readonly<Record<string,string>>;
export declare const CONTROLS: Readonly<Record<string,string>>;
export declare const RULESET:string;
export declare function validDay(dayStem:string,dayBranch:string):void;
export interface FourLessonInput {monthGeneral:string;divinationHour:string;dayStem:string;dayBranch:string}
export interface Lesson {number:number;lower:string;upper:string;lowerType:'stem'|'branch';lowerElement:string;upperElement:string;relation:'lower-attacks-upper'|'upper-controls-lower'|'no-control';upperYinYang:'yin'|'yang'}
export declare function buildFourLessons(input:FourLessonInput):Readonly<{ruleSet:string;status:'research-only';dayStem:string;dayBranch:string;stemLodging:string;plate:Readonly<{pattern:string;positions:readonly {earth:string;heaven:string}[]}>;lessons:readonly Readonly<Lesson>[];uniquePairs:number;hasFourDistinctLessons:boolean;constraints:readonly string[]}>;
