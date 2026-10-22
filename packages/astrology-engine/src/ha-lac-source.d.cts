export const METHOD:string;
export const SOURCE_ID:string;
export const SOURCE_URLS:readonly string[];
export const STEM_NUMBER:Readonly<Record<string,number>>;
export const BRANCH_OPTIONS:Readonly<Record<string,readonly number[]>>;
export const LO_SHU:readonly (readonly number[])[];
export const HE_TU:readonly Readonly<{pair:readonly number[];element:string;direction:string}>[];
export const LO_CHECK:Readonly<{rows:readonly number[];columns:readonly number[];diagonals:readonly number[]}>;
export interface HaLacSpec {pillars:string[];hexagram?:{kingWen:number;yuanTangLine:number;referenceId:string;referenceDetail:string}};
export interface HaLacResult {status:string;method:string;researchOnly:true;sourceId:string;pillars:readonly {label:string;stem:string;branch:string}[];trace:readonly {pillar:string;stemValue:number;branchNumbers:readonly number[];stemOdd:boolean}[];heaven:{sum:number;contributions:readonly number[]};earth:{sum:number;contributions:readonly number[]};loShu:readonly (readonly number[])[];heTu:readonly {pair:readonly number[];element:string;direction:string}[];hexagram:null|{status:string;kingWen:number;yuanTangLine:number;sourceId:string;referenceDetail:string};warnings:readonly string[]}
export function validatePillars(pillars:unknown):readonly {label:string;stem:string;branch:string}[];
export function calculate(input:unknown):HaLacResult;
