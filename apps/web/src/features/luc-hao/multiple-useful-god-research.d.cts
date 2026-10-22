export const RULE: string;
export const SCHOOL: string;
export const SOURCES: Readonly<{ multi:string; hidden:string }>;
export const NOTES: readonly string[];
export function monthFromJie(input:{instantIso:string}):Readonly<{rule:string;instantUtc:string;sourceId:string;quality:string;guardSeconds:number;researchOnly:true;referenceStatus:string;status:string;monthBranch:string|null;activeTerm:string|null;boundary:unknown;verified:false;activeEventUtc?:string}>;
export function analyzeMultiple(chart:unknown,options:{questionId:string;confirmedFamily:string;context?:unknown;movingPositions?:number[];instantIso?:string|null}):Readonly<{rule:string;school:string;researchOnly:true;status:string;calendar:unknown;reading?:null;calendarQuality?:string;candidateCount?:number;multiple?:boolean;candidates:readonly unknown[];conflicts:readonly unknown[];chosenUsefulGodLine?:null;decision:unknown;sources:unknown;notes:readonly string[]}>;
