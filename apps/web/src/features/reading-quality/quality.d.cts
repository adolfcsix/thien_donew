export type ReviewItem={readonly id:string;readonly label:string;readonly evidence:string;readonly meaning:string;readonly status:'observed'|'needs-check'|'blocked'};
export type ReadingQualityReport={readonly discipline:string;readonly method:string;readonly stage:'blocked'|'provisional'|'structural';readonly items:readonly ReviewItem[];readonly questions:readonly string[];readonly limits:readonly string[];readonly notice:string};
export function buildMaiHoaQuality(cast:unknown):ReadingQualityReport;
export function buildLucHaoQuality(reading:unknown,naJia:unknown,temporal:unknown,focus:unknown):ReadingQualityReport;
export function buildKyMonQuality(formation:unknown,options?:{source?:'auto'|'manual';decision?:unknown;withHour?:boolean;hourPlate?:unknown}):ReadingQualityReport;
export function buildFengShuiQuality(orientation:unknown):ReadingQualityReport;
export function buildTuViQuality(reading:unknown):ReadingQualityReport;
