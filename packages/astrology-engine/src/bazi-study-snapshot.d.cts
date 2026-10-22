export type BaZiSnapshot={schemaVersion:1;methodId:string;coreRuleSet:string;daYunRuleSet:string;date:string;hour:number;minute:number;dayBoundary:'midnight'|'late-zi';sex:'male'|'female';utcOffsetMinutes:420;timeZone:'Asia/Ho_Chi_Minh';solarTimeCorrection:false};
export const METHOD_ID:string;
export const SCHEMA_VERSION:1;
export const OFFSET_MINUTES:420;
export function validateBaziSnapshot(raw:unknown):BaZiSnapshot;
export function createBaziSnapshot(raw:{date:string;hour:number;minute:number;dayBoundary:'midnight'|'late-zi';sex:'male'|'female'}):BaZiSnapshot;
