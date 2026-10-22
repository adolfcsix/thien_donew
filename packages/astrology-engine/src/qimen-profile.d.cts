export type QimenRow=[number,string,string[],string[],string|null,string|null];
export type QimenReference={layout:'rotating-reference'|'flying-reference';school:string;source:string;solarTermIndex:number;dayCycleIndex:number;hourBranchIndex:number;rows:QimenRow[]};
export type QimenProfile={method:'qimen-nine-palace-evidence-v1';version:1;knowledge:'11.131';solarTermIndex:number;dayCycleIndex:number;hourBranchIndex:number;center:'khon2'|'yin8-yang2';rules:'yanyi'|'baojian';clockSource:string;question:string;rationale:string;topic:string;indicator:string|null;referencePalace:number|null;readBoard:'auto'|'reference';reference:QimenReference|null};
export declare const METHOD:'qimen-nine-palace-evidence-v1',VERSION:1,STEMS:readonly string[],STARS:readonly string[],DOORS:readonly string[],DEITIES:readonly string[],TOPICS:readonly string[],INDICATORS:readonly string[];
export declare function validateQimenProfile(raw:unknown):QimenProfile;
export declare function createQimenProfile(raw?:Record<string,unknown>):QimenProfile;
