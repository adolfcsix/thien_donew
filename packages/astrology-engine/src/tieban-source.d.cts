export const METHOD:string;
export const TIME_METHODS:Readonly<Record<string,Readonly<{id:string;label:string;divisions:number;methodStatus:string}>>>;
export interface TimeSlice{ruleSet:string;methodId:string;methodStatus:string;sourceId:string;hour:number;minute:number;branchIndex:number;branch:string;part:number;partCount:number;startLocal:string;endLocal:string;status:string;noTextLookup:true;limitation:string}
export interface CorpusEntry{corpusId:string;edition:string;sourceUrl:string;page:string;section:string;articleNumber:string;transcription:string;license:string;verification:'unchecked'|'two-witnesses'|'source-scan-checked';notes:string}
export interface Comparison{ruleSet:string;status:string;entries:readonly CorpusEntry[];variants:readonly {key:string;editions:readonly string[];textVariants:number;requiresCollation:boolean}[];warnings:readonly string[]}
export function sliceTime(input:unknown):TimeSlice;
export function validateCorpusEntry(entry:unknown):CorpusEntry;
export function compareEntries(entries:unknown):Comparison;
