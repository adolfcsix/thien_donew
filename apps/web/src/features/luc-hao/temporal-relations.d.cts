import type {NaJiaLine} from './na-jia.cjs';
import type {TemporalContext} from './temporal.cjs';
export type LineTemporal=Readonly<{position:number;branch:string;moving:boolean;void:boolean;day:readonly string[];month:readonly string[];dayElement:string;monthElement:string|null;changed:Readonly<{branch:string;stemBranch:string;element:string;relation:readonly string[]}>|null;tags:readonly string[]}>;
export declare const SIX_COMBINE:readonly (readonly string[])[];
export declare function relation(branch:string,target:string|null):readonly string[];
export declare function lineTemporalEvidence(chart:{lines:readonly NaJiaLine[]},reading:{ledger:readonly {position:number;moving:boolean}[]},context:TemporalContext|null):Readonly<{source:string|null;ready:boolean;monthVerified?:boolean;lines:readonly LineTemporal[];notes:readonly string[]}>;
