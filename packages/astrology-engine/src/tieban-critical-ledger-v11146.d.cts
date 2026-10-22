export const RULESET:string;
export const FORMAT:string;
export const FORMAT_VERSION:number;
export const MAX_SOURCES:number;
export const MAX_WITNESSES:number;
export const BRANCHES:readonly string[];
export interface TiebanSource {id:string;title:string;edition:string;sourceUrl:string;rights:string;lineageId:string;scanStatus:'unreviewed'|'catalogue-only'|'scan-inspected'}
export interface TiebanWitness {sourceId:string;articleNumber:string;page:string;part:number;transcription:string;reviewStatus:'transcribed'|'scan-checked'}
export interface LedgerInput {methodId:string;branchIndex:number;sources:readonly TiebanSource[];witnesses:readonly TiebanWitness[]}
export interface LedgerRow {part:number;range:string;status:string;articleNumbers:readonly string[];sourceIds:readonly string[];lineageCount:number;scanCheckedCount:number;collationFlags:readonly string[]}
export interface LedgerOutput extends LedgerInput {ruleSet:string;status:string;branch:string;rows:readonly LedgerRow[];limits:Readonly<{determinesBirthTime:false;derivesArticleNumber:false;validatesPrediction:false}>;notes:readonly string[]}
export function validateSource(value:unknown):TiebanSource;
export function buildLedger(input:LedgerInput):LedgerOutput;
export function exportLedger(input:LedgerInput):string;
export function importLedger(value:string):{methodId:string;branchIndex:number;sources:TiebanSource[];witnesses:TiebanWitness[]};
export function observedSlot(input:unknown):number;
