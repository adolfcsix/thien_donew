export type BirthCalendar = 'solar' | 'lunar';
export type Gender = 'Nam' | 'Nữ';
export interface BirthInput {date: string; hour: number; minute: number; calendar: BirthCalendar; leap: boolean; gender: Gender;}
export interface ChartInput extends BirthInput {label: string;}
export interface AdditionalStarPlacement {name:string;branch:number;basis:'thang-am'|'chi-nam-sinh'|'ta-phu-va-ngay-am'|'huu-bat-va-ngay-am';ruleSet:string;}
export interface TraditionalStarPlacement {name:string;branch:number;basis:string;ruleSet:string;}
export interface BeneficStarPlacement {name:'Thiên Đức'|'Nguyệt Đức'|'Thiên Giải'|'Địa Giải';branch:number;basis:string;ruleSet:string;}
export interface PositionalStarPlacement {name:'Thiên La'|'Địa Võng'|'Thiên Thương'|'Thiên Sứ';branch:number;basis:string;kind:'branch-marker'|'palace-star';ruleSet:string;}
export interface MissingStarPlacement {name:'Thiên Trù'|'Lưu Hà'|'Thiên Không'|'Đẩu Quân';branch:number;basis:string;ruleSet:string;}
export interface DerivedStarPlacement {name:'Thiên Tài'|'Thiên Thọ'|'Đường Phù';branch:number;basis:string;ruleSet:string;}
export interface NatalExtensionPlacement {name:'Quốc Ấn'|'Kiếp Sát'|'Phá Toái';branch:number;basis:string;ruleSet:string;}
export interface AdvancedStarPlacement {name:'Địa Kiếp'|'Địa Không'|'Hỏa Tinh'|'Linh Tinh';branch:number;basis:string;ruleSet:string;}
export interface ObstructionMarker {name:'Tuần'|'Triệt';branches:number[];basis:string;ruleSet:string;}
export type MainStarStrengthStatus = 'M'|'V'|'D'|'B'|'H';
export interface MainStarStrength {name:string;branch:number;branchName:string;status:MainStarStrengthStatus;label:string;ruleSet:string;source:string;}
export interface AstrologyHouse {branch: string; branchIndex: number; cell: number; stem: string; palace: string; isThan: boolean; stars: string[]; mainStarStrengths?:MainStarStrength[]; auxiliaryStars: string[]; yearStars: string[]; additionalStars?: string[]; additionalStarDetails?: AdditionalStarPlacement[]; traditionalStars?:string[]; traditionalStarDetails?:TraditionalStarPlacement[]; beneficStars?:string[];beneficStarDetails?:BeneficStarPlacement[];positionalStars?:string[];positionalStarDetails?:PositionalStarPlacement[];derivedStars?:string[];derivedStarDetails?:DerivedStarPlacement[];missingStars?:string[];missingStarDetails?:MissingStarPlacement[];natalExtensionStars?:string[];natalExtensionStarDetails?:NatalExtensionPlacement[]; advancedStars?:string[];advancedStarDetails?:AdvancedStarPlacement[];obstructionMarkers?:string[]; tuHoa: {name: string; star: string}[]; cycleStars: {thaiTue: string[]; bacSi: string[]; trangSinh: string[]}; daiHan?: {fromAge:number; toAge:number};}
export interface AstrologyResult {ruleSet: string; hour:number; minute:number; hourBranch:string; gender:Gender; thanPalace:string; solar: {year:number;month:number;day:number}; lunar: {year:number;month:number;day:number;leap:boolean}; menh:string; than:string; cuc:{number:number;name:string}; yearCanChi:string; additionalStars?: AdditionalStarPlacement[]; additionalStarRuleSet?: string; traditionalStars?:TraditionalStarPlacement[]; traditionalStarRuleSet?:string; beneficStars?:BeneficStarPlacement[];beneficStarRuleSet?:string;positionalStars?:PositionalStarPlacement[];positionalStarRuleSet?:string;derivedStars?:DerivedStarPlacement[];derivedStarRuleSet?:string;missingStars?:MissingStarPlacement[];missingStarRuleSet?:string;natalExtensionStars?:NatalExtensionPlacement[];natalExtensionStarRuleSet?:string; advancedStars?:AdvancedStarPlacement[];advancedStarRuleSet?:string;obstructionMarkers?:ObstructionMarker[]; mainStarStrengthRuleSet?:string; houses:AstrologyHouse[]; warnings:string[]; coverage:Record<string,unknown>;}
export interface SavedChart extends ChartInput {id:string; ruleSet:string; createdAt:string;}
export interface ChartBackupV1 { format:'thien-do.saved-charts'; version:1; exportedAt?:string; charts: SavedChart[]; }
export interface ChartImportSummary { imported:number; skipped:number; total:number; }
export interface AuthUser {id:string; email:string; username?:string|null; displayName?:string|null; hasAvatar?:boolean; hasPassword?:boolean; hasGoogle?:boolean;}

export interface AnnualPosition {name:string;star?:string;branch:number;palace:string;basis?:string;ruleSet?:string;}
export interface AnnualFourTransformations {ruleSet:string;yearStemIndex:number;items:AnnualPosition[];}
export interface AnnualStars {ruleSet:string;items:AnnualPosition[];}
export interface AnnualOverview {
  ruleSet:string; luuTuHoa:AnnualFourTransformations; luuStars:AnnualStars; year:number; canChi:string; luuThaiTueBranch:string; luuThaiTueBranchIndex:number; ageMu:number;
  activeDaiHan:null|{branchIndex:number;branch:string;palace:string;fromAge:number;toAge:number};
  tieuHan:{ruleSet:string;branchIndex:number;branch:string;palace:string;startBranchIndex:number;startBranch:string;direction:'thuận'|'nghịch';ageMu:number};
  note:string;
}

/** Position-only research evidence. All paths describe existing fields, not new star-placement rules. */
export type PalaceResearchLayerId = 'main'|'auxiliary'|'year'|'additional'|'traditional'|'natal-extensions'|'benefic'|'positional'|'derived'|'missing-stars'|'advanced'|'birth-transformation'|'annual-transformation'|'annual-star';
export interface PalaceEvidenceRecord {kind:PalaceResearchLayerId;name:string;branchIndex:number;path:string;transformation?:string;}
export interface PalaceEvidenceLayer {id:PalaceResearchLayerId;label:string;path:string;records:PalaceEvidenceRecord[];}
export interface PalaceResearchPerspective {
  role:'selected'|'tam-hop'|'opposite';branchIndex:number;branch:string;palace:string;stem:string;
  layers:PalaceEvidenceLayer[];natalStarCount:number;
  transformationTargets:(PalaceEvidenceRecord & {targetPresentInNatal:boolean})[];
}
export type TraceableFindingCategory = 'dong-cung'|'tam-phuong'|'tu-hoa'|'luu-nien'|'doi-chieu'|'kiem-tra';
export interface TraceableEvidence {
  role:PalaceResearchPerspective['role'];branchIndex:number;palace:string;branch:string;
  layer:PalaceResearchLayerId;star:string|null;path:string;transformation?:string;
}
export interface TraceableFinding {
  id:string;title:string;description:string;category:TraceableFindingCategory;annual:boolean;evidence:TraceableEvidence[];
}
export interface TraceableFindingsResult {
  ruleSet:string;sourceRuleSet:string;annualYear:number|null;anchorBranchIndex:number;anchorPalace:string;
  findings:TraceableFinding[];summary:{all:number;natal:number;annual:number};disclaimer:string;
}
export interface PalaceResearchResult {
  ruleSet:string;birthRuleSet:string|null;annualRuleSet:string|null;annualYear:number|null;
  branchIndex:number;palace:string;perspectives:PalaceResearchPerspective[];disclaimer:string;
}
