export type TemporalContext=Readonly<{
 source:'calendar-utc7-noon-approx'|'user-verified-manual';date:string|null;dayStem:string;dayBranch:string;
 monthBranch:string|null;suggestedMonthBranch:string;needsMonthVerification:boolean;
 solarTerm:string|null;dayCanChi:string;monthCanChi:string|null;
 xun:string;voidBranches:readonly string[];jiaBranch:string;xunIndex:number;warnings:readonly string[];
}>;
export declare const STEMS:readonly string[];
export declare const BRANCHES:readonly string[];
export declare const XUN_NAMES:readonly string[];
export declare function xunVoid(dayStem:string,dayBranch:string):Readonly<{xun:string;voidBranches:readonly string[];jiaBranch:string;xunIndex:number}>;
export declare function manualContext(input:{dayStem:string;dayBranch:string;monthBranch:string}):TemporalContext;
export declare function calendarContext(dayInfo:{solar:{iso:string};dayCanChi:string;monthCanChi:{name:string;nearBoundary:boolean};solarTerm:{name:string;nearBoundary:boolean}}):TemporalContext;
