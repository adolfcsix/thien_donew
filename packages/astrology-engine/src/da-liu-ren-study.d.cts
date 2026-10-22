export declare const RULESET:string;
export declare function resolveStudyAt(input:{instantIso:string;divinationHour:string;dayStem:string;dayBranch:string}):Readonly<{
 ruleSet:string;status:string;resolution:unknown;fourLessons:unknown|null;threeTransmissions:unknown|null;reason?:string;disclaimers?:readonly string[]
}>;
