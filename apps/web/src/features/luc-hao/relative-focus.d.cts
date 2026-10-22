import type {Hexagram} from '../iching/hexagrams.cjs';
import type {NaJiaLine} from './na-jia.cjs';
import type {LineTemporal} from './temporal-relations.cjs';
export declare const RELATIVES: readonly string[];
export type FocusCandidate=Readonly<{position:number;stemBranch:string;branch:string;element:string;family:string;role:string|null;moving:boolean;void:boolean|null;day:readonly string[]|null;month:readonly string[]|null;changed:LineTemporal['changed']}>;
export declare function relativeFocus(chart:{lines:readonly NaJiaLine[]},reading:{original:Hexagram;transformed:Hexagram;ledger:readonly {position:number;moving:boolean}[]},evidence:{ready:boolean;lines:readonly LineTemporal[];monthVerified?:boolean}|null,selected?:string|null):Readonly<{selected:string|null;ready:boolean;count:number;hasTemporal:boolean;candidates:readonly FocusCandidate[];notes:readonly string[]}>;
