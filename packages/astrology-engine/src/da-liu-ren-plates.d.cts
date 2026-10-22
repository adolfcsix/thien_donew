export declare const BRANCHES:readonly string[];
export declare const ZHONG_QI: Readonly<Record<string,string>>;
export declare const RULESET:'da-liu-ren-month-general-on-hour-reference-v1';
export declare const MONTH_GENERAL_SOURCE:string;
export declare function monthGeneralAfterZhongQi(term:string):string;
export declare function buildHeavenEarthPlates(input:{monthGeneral:string;divinationHour:string}):Readonly<{
  ruleSet:string;methodId:'dai-luc-nham-yuejiang';status:'deterministic-subroutine-only';monthGeneral:string;divinationHour:string;offset:number;
  pattern:'phuc-ngam'|'phan-ngam'|'normal';
  positions:readonly Readonly<{earth:string;heaven:string;earthIndex:number;heavenIndex:number}>[];
  boundaries:readonly string[];
}>;
