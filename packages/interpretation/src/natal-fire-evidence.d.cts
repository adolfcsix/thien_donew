import type {AstrologyResult} from '@thiendo/shared-types';
/** Verified natal Hỏa Tinh placement, NOT a Miếu/Vượng/Hãm classification. */
export interface NatalFireEvidence {
 readonly verified:boolean;
 readonly branchIndex:number|null;
 readonly ruleSet:string;
 readonly fireStrengthVerified:false;
 readonly reason:string;
}
export declare function auditNatalFirePosition(chart:AstrologyResult):NatalFireEvidence;
