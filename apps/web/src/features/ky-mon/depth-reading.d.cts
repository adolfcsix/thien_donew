import type {QimenProfile,QimenRow} from '@thiendo/astrology-engine/src/qimen-profile.cjs';
import type {BaseFormation,CycleDay} from './formation.cjs';
import type {PALACES} from './luoshu.cjs';
type Cell={number:number;palace:typeof PALACES[number];earthStem:string;heavenStems:string[];stars:string[];door:string|null;deity:string|null;doorRelation:string|null;doorKind:string|null;menBach:boolean|null;graves:{stem:string;applies:boolean;target:number|null;present:boolean|null}[];guide:string[]};
type Difference={number:number;changes:string[]};
export type QimenDepth={input:QimenProfile;base:BaseFormation;hour:CycleDay;board:{centerHost:number;chiefStarLanding:number;chiefDoorLanding:number;chiefStar:string;chiefDoor:string;rows:QimenRow[]};cells:Cell[];ruleDifferences:{number:number;stem:string;selectedTarget:number;otherTarget:number}[];centerDifferences:Difference[];referenceDifferences:Difference[]|null;reading:{candidates:number[];selected:number|null;relation:{kind:string;label:string;from:number;to:number}|null;opposite:number|null;menBach:boolean|null;graves:Cell['graves'];guide:string;missing:string[];forecast:null;score:null};sources:{id:string;title:string;url:string;scope:string}[];limits:string[]};
export declare function studyQimen(raw:unknown):QimenDepth;
export declare function buildBoard(input:QimenProfile,base:BaseFormation):QimenDepth['board'];
