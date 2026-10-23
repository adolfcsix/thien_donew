import type {AdvancedNumerology} from '../../astrology-engine/src/numerology-advanced.cjs';
export type NumberProfile={title:string;focus:string;resource:string;tension:string;practice:string;check:string};
export const PROFILES:Record<number,NumberProfile>;
export const METRICS:Record<string,{label:string;lens:string}>;
export type NumerologyStudy={format:string;version:number;baseMethod:string;conventions:{masters:boolean;yMode:string};metrics:{id:string;label:string;lens:string;value:number|null;steps:number[];profile:NumberProfile|null}[];personalDate:AdvancedNumerology['exampleDate'];comparison:{agrees:boolean;segmented:number;allDigits:number};notice:string};
export function buildNumerologyStudy(raw:unknown,selectedDate:string):NumerologyStudy;
