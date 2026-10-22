export interface NumerologyInput {method:'pythagorean-segmented-v1';name:string;date:string;year:number;yMode:'vowel'|'consonant';masters:boolean}
export interface Reduction {value:number;steps:number[]}
export interface NumberTrace extends Reduction {parts?:Array<Reduction & {word?:string;letters?:string}>}
export interface NumerologyResult {
 input:NumerologyInput;normalizedName:string;letters:{letter:string;value:number;vowel:boolean}[];
 lifePath:NumberTrace;expression:NumberTrace|null;soulUrge:NumberTrace|null;personality:NumberTrace|null;
 birthday:number;personalYears:(Reduction & {year:number})[];digitCounts:Record<string,number>;
 pinnacles:(Reduction & {fromAge:number;toAgeExclusive:number|null})[];challenges:number[];
 sources:readonly {title:string;url:string}[];
}
export const METHOD:'pythagorean-segmented-v1';
export const SOURCES:readonly {title:string;url:string}[];
export function validateInput(raw:unknown):NumerologyInput;
export function normalizeName(name:string):string;
export function reduction(n:number,masters?:boolean):Reduction;
export function calculate(raw:unknown):NumerologyResult;
