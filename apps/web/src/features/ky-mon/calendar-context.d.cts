export type TermSuggestion={index:number;name:string;dun:'âm'|'dương';longitudeDeg:number;boundaryDistanceDeg:number;nearBoundary:boolean;precision:string};
export type CalendarSuggestion={source:string;timezone:string;date:string;hour:number;minute:number;dayBoundary:'midnight'|'late-zi';dayCanChi:string;hourCanChi:string;dayCycleIndex:number;hourCycleIndex:number;hourBranchIndex:number;solarTerm:TermSuggestion;status:'ready'|'needs-verification';canAutoForm:boolean;reasons:readonly string[];notes:readonly string[]};
export declare const GUARD_DEGREES:number;
export declare function termAtLongitude(longitudeDeg:number):TermSuggestion;
export declare function suggestKymonContext(input:{date:string;hour:number;minute?:number;dayBoundary?:'midnight'|'late-zi';longitudeDeg:number;dayCanChi:string;hourCanChi:string;lateZiAcknowledged?:boolean}):CalendarSuggestion;
