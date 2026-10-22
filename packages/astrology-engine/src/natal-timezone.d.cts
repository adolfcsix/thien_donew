export const TZDB_VERSION:'2026e';
export interface TimeCandidate {utc:string;offsetSeconds:number}
export function names():string[];
export function candidates(date:string,hour:number,minute:number,timeZone:string):TimeCandidate[];
export function resolve(date:string,hour:number,minute:number,timeZone:string,disambiguation?:'reject'|'earlier'|'later'):TimeCandidate & {timeZone:string;tzdbVersion:string;disambiguation:'reject'|'earlier'|'later'};
export function formatOffset(seconds:number):string;
