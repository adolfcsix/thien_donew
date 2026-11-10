import type {AstrologyResult} from '@thiendo/shared-types';
/** Only validates versioned natal Tuần/Triệt markers; not full Không Vong. */
export interface NatalObstructionEvidence {
 readonly verified:boolean;
 readonly ruleSet:string;
 readonly atMenh:readonly string[];
 readonly reason:string;
}
export declare function auditNatalObstructionEvidence(chart:AstrologyResult):NatalObstructionEvidence;
