import type {LucHaoProfile} from '@thiendo/astrology-engine/src/luc-hao-profile.cjs';
import type {makeLineLedger} from './reading.cjs';
import type {makeNaJiaChart} from './na-jia.cjs';
import type {TemporalContext} from './temporal.cjs';
export type DepthContext=Omit<TemporalContext,'suggestedMonthBranch'>&{suggestedMonthBranch:string|null};
type Line=ReturnType<typeof makeNaJiaChart>['lines'][number];
type ReferenceLine=Pick<Line,'position'|'stem'|'branch'|'element'|'stemBranch'|'family'|'role'>;
type Clock={day:{branch:string;flags:readonly string[];element:string}|null;month:{branch:string;flags:readonly string[];element:string;monthBreak:boolean}|null;void:boolean|null};
type Role={name:string;kind:string|null;relation:string|null};
type Potential={kind:string;position:number;stemBranch:string;moving:boolean|null;role:Role;clock:Clock};
export type LucHaoDepth={input:LucHaoProfile;reading:ReturnType<typeof makeLineLedger>;chart:ReturnType<typeof makeNaJiaChart>;context:DepthContext|null;candidates:{kind:'visible'|'hidden';position:number;line:ReferenceLine}[];selected:{kind:'visible'|'hidden';position:number;line:ReferenceLine}|null;rows:(Line&{moving:boolean;clock:Clock;purposeRole:Role;spiritMeaning:string|null;conversion:{branch:string;element:string;family:string;stemBranch:string;reverse:string;reverseKind:string;label:string;flags:readonly string[];clock:Clock}|null})[];hiddenRows:(ReferenceLine&{kind:'hidden';flying:ReferenceLine;flyingMoving:boolean;purposeRole:Role;clock:Clock;flyingClock:Clock;flyingToHidden:string;hiddenToFlying:string})[];potentials:Potential[];synthesis:{generators:Potential[];controllers:Potential[];note:string;missing:string[]};warnings:string[];roles:Record<string,string>;sources:{id:string;title:string;url:string;scope:string}[];limits:string[]};
export declare function studyLucHao(raw:unknown):LucHaoDepth;

export declare function contextFor(calendar:LucHaoProfile['calendar']):DepthContext|null;
