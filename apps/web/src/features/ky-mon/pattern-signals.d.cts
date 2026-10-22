import type {BaseFormation} from './formation.cjs';
import type {RotatingHourPlate} from './hour-plate.cjs';
export type PatternState='present'|'absent'|'not-computed'|'convention'|'not-represented';
export type PatternEntry={number:number;trigram:string;direction:string;heavenStem:string|null;earthStem:string;dragon:PatternState;bird:PatternState};
export type PatternReport={kind:'can-pattern-observations';status:'research-only'|'not-computed';profileId:string;sourceUrl:string;xunHead:string|null;hiddenStem:string|null;entries:readonly PatternEntry[];byPalace:Readonly<Record<number,PatternEntry>>;patterns:readonly {id:'dragon'|'bird';name:string;heavenStem:string|null;earthStem:string|null;status:PatternState;palaceNumber:number|null}[];interpretation:null;limits:readonly string[]};
export declare function observePatternPair(xun:string,heaven:string,earth:string):Readonly<{dragon:PatternState;bird:PatternState}>;
export declare function analyzePatternSignals(base:BaseFormation,plate?:RotatingHourPlate|null):PatternReport;
