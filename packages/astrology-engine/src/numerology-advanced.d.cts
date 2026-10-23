import type {NumerologyInput,Reduction,NumberTrace} from './numerology-pythagorean.cjs';
export const METHOD:'pythagorean-advanced-comparison-v1';
export interface AdvancedNumerology {
 method:string;baseMethod:string;input:NumerologyInput;
 lifePathComparison:{segmented:{value:number;steps:number[];parts:NonNullable<NumberTrace['parts']>};allDigits:Reduction;agrees:boolean;note:string};
 maturity:Reduction|null;
 nameFrequency:{counts:Record<string,number>;hiddenPassion:number[];missingNumbers:number[]};
 personalMonths:Array<Reduction & {month:number}>;
 exampleDate:{date:string;personalYear:Reduction;personalMonth:Reduction;personalDay:Reduction};
 limitations:string[];
}
export function calculate(raw:unknown):AdvancedNumerology;

export function calculatePersonalDate(raw:unknown,selected:string):AdvancedNumerology['exampleDate'];
