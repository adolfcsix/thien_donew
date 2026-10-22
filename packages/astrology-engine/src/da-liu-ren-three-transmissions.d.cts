import type {FourLessonInput} from './da-liu-ren-four-lessons.cjs';
export declare const RULESET:string;
export declare const PENDING: readonly string[];
export declare function deriveThreeTransmissions(input:FourLessonInput):Readonly<{
 ruleSet:string;status:'research-only';methodId:string;fourLessons:unknown;
 verdict:'derived-subroutine-only'|'unresolved';reason?:string;priority?:string|null;rule?:string|null;
 candidates:readonly Readonly<{lesson:number;upper:string;relation:string;upperYinYang:string}>[];
 selectedLesson?:number;
 transmissions:Readonly<{initial:string;middle:string;final:string;sequence:readonly string[]}>|null;
 pending?:readonly string[];constraints?:readonly string[];
}>;
