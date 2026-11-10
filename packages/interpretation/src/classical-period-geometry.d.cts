import type {AstrologyResult} from '@thiendo/shared-types';
/** Structural consistency only: no classical period-formation verdict. */
export interface ClassicalPeriodGeometry {
 readonly verifiedGeometry:boolean;
 readonly sourceInterpretationVerified:false;
 readonly matchedPeriods:number;
 readonly ruleSet:string;
 readonly reason:string;
}
export declare function auditClassicalPeriodGeometry(chart:AstrologyResult):ClassicalPeriodGeometry;
