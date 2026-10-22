export const METHOD: string;
export const RULE_SOURCES: readonly string[];
export const PERIODS: readonly string[];
export const HOUR_BRANCHES: readonly string[];
export interface HaLacProfile {gender:'male'|'female';period?:'upper'|'middle'|'lower';periodReferenceId?:string;periodReferenceDetail?:string}
export interface MingguaSpec {pillars:string[];hexagram?:{kingWen:number;yuanTangLine:number;referenceId:string;referenceDetail:string};profile?:HaLacProfile}
export interface Trigram {name:string;han:string;bits:string}
export interface NumberReduction {total:number;base:number;afterThreshold:number;number:number;requiresCenter:boolean;explanation:string}
export interface YuanTangResult {status:string;line:number|null;hourBranch:string;trace:readonly {hourBranch:string;line:number}[];preferredYao?:string;preferredCount?:number}
export interface MingguaResult {method:string;status:string;researchOnly:true;sourceUrls:readonly string[];numbering:{heaven:NumberReduction;earth:NumberReduction};profile:HaLacProfile|null;yearYang:boolean;early:null|{status:string;bits:string;upper:Trigram;lower:Trigram;heavenNumber:number;earthNumber:number;heavenAbove:boolean};yuanTang:YuanTangResult|null;later:null|{status:string;bits:string;changedBeforeSwap:string;yuanTangLine:number;operation:string};sourceEntered:null|{status:string;kingWen:number;yuanTangLine:number;sourceId:string;referenceDetail:string};trace:readonly string[];warnings:readonly string[]}
export function reduceNumber(total:number,kind:'heaven'|'earth'):NumberReduction;
export function validateProfile(profile:unknown):HaLacProfile|null;
export function calculateMinggua(input:unknown):MingguaResult;
export function placeYuanTang(bits:string,hourBranch:string):YuanTangResult;
export function nextHeavenHexagram(bits:string,line:number):NonNullable<MingguaResult['later']>;
