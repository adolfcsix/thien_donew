export type StarCandidateInput = {birthCycleIndex:number;annualBranch:number;layer?:'birth'|'annual'};
export type SourceCandidate = {branch:string;methodId:string;sourceId:string;input:'birth'|'annual';evidenceStatus:string};
export type CandidateRow = {name:string;system:string;hanzi:string|null;status:string;input:'birth'|'annual';candidates:SourceCandidate[];disagreement:boolean;automaticPlacement:false;gate:{independentChartFixture:boolean;schoolReview:boolean};note:string};
export type StarCandidatePreview = {schemaVersion:1;release:string;scope:string;automaticPlacement:false;automaticAlias:false;birthCycleIndex:number;birthYear:{stem:string;branch:string};annualBranch:string;selectedLayer:'birth'|'annual';selectedBranch:string;rows:CandidateRow[];blockedIntegration:true;notice:string};
export function getStarCandidatePreview(input:StarCandidateInput):StarCandidatePreview;
export function auditCandidates():{errors:string[];inputs:number;names:number;tuongNames:number;unresolved:number;automaticPlacement:false};
export const NAME_ORDER:readonly string[];
export const TUONG_NAMES:readonly string[];
