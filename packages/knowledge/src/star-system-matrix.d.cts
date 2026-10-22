import type {AstrologyResult,AnnualOverview} from '@thiendo/shared-types';
export type MatrixBucket='all'|'main'|'support'|'cycle'|'annual'|'special';
export interface MatrixPlacement {branchIndex:number;branch:string;palace:string;star?:string}
export interface MatrixRow {id:string;name:string;layer:string;type:string;group:string;groupLabel:string;bucket:Exclude<MatrixBucket,'all'>;originId:string|null;originName:string|null;placementModule:string;editorialSources:string[];expertReviewed:boolean;lookupTerms:string[];placements:MatrixPlacement[];positionState:'catalog-only'|'computed'}
export interface MatrixCounts {main:number;support:number;cycles:number;natalAndCycle:number;annual:number;special:number;identities:number}
export interface ChartStarMatrix {schemaVersion:number;format:string;release:string;counts:MatrixCounts;annualYear:number|null;rows:MatrixRow[];notice:string}
export interface StarResolution {name:string;category:'missing'|'alias';candidate?:string;hanzi?:string;state:string;decision:string;remaining:string;sourceIds:string[];automaticPlacement:false;automaticAlias:false;relatedId?:string;ruleScope:string}
export const GROUPS:readonly {id:string;label:string;field:string}[];
export function catalogRows():MatrixRow[];
export function counts(rows?:MatrixRow[]):MatrixCounts;
export function filterRows(rows:MatrixRow[],query?:string,category?:MatrixBucket):MatrixRow[];
export function auditCatalog():{errors:string[];counts:MatrixCounts};
export function buildChartMatrix(chart:AstrologyResult,annual?:AnnualOverview|null):ChartStarMatrix;
export function getResolutions(query?:string,category?:'all'|'missing'|'alias'):StarResolution[];
