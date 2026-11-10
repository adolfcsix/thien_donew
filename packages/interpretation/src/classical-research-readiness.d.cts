import type {ClassicalCatalogReport} from './classical-pattern-catalog.cjs';
export type ReadinessScope='natal-research'|'period-research';
export interface ClassicalPendingPrerequisite {
 readonly id:string;
 readonly scope:ReadinessScope;
 readonly blocker:string;
 readonly sourceUrl:string;
}
export interface ClassicalResearchReadinessCounts {
 readonly total:number;
 readonly pending:number;
 readonly disputed:number;
 readonly unreachable:number;
 readonly natalPending:number;
 readonly periodPending:number;
}
export interface ClassicalResearchReadiness {
 readonly counts:ClassicalResearchReadinessCounts;
 readonly byId:Readonly<Record<string,ClassicalPendingPrerequisite>>;
}
export declare const PENDING_BLOCKERS:Readonly<Record<string,string>>;
export declare function summarizeClassicalResearchReadiness(report:ClassicalCatalogReport):ClassicalResearchReadiness;
