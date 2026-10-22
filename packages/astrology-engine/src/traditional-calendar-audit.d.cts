export const RULESET:string;
export const STEMS:readonly string[];
export const BRANCHES:readonly string[];
export const CYCLE:readonly {ordinal:number;stem:string;branch:string;name:string}[];
export const RULES:Readonly<Record<string,{id:string;changeHour:number;label:string}>>;
export interface CalendarAudit{ruleSet:string;researchOnly:true;inputs:{date:string;hour:number;minute:number;timezone:string;dayBoundary:string;yearBoundary:string};day:{originalDate:string;effectiveDate:string;shifted:boolean;pillar:string;cycle:{ordinal:number;stem:string;branch:string;name:string};jdn:number;sourceId:string};year:{status:string;name:string|null;sourceId?:string;boundary:string};month:{status:string;candidate:string;approximate:true;nearBoundary:boolean;sourceId:string;note:string};lunar:{day:number;month:number;year:number;leap:boolean;sourceId:string};jie:{name:string;longitudeDeg:number;nearBoundary:boolean;approximate:true};warnings:readonly string[]}
export function strictDate(x:unknown):{year:number;month:number;day:number};
export function pillar(name:string):{ordinal:number;stem:string;branch:string;name:string}|null;
export function assess(input:unknown):CalendarAudit;
