import type {Hexagram, Trigram} from '../iching/hexagrams.cjs';

export declare const BRANCHES: readonly string[];
export declare const PRIOR_HEAVEN: readonly (Trigram & {number: number})[];
export declare function moduloOne(value: number, base: number): number;

type LunarInput = {yearBranch: number; lunarMonth: number; lunarDay: number; hourBranch: number};
type NumberInput = {first: number; second: number};
type CastOutcome<TInput, TMethod extends string> = Readonly<{
  method: TMethod;
  inputs: TInput;
  arithmetic: {
    base: number;
    total: number;
    upperRemainder: number;
    lowerRemainder: number;
    changingRemainder: number;
    movingSeed: number;
  };
  upper: Trigram;
  lower: Trigram;
  changingLine: number;
  original: Hexagram;
  transformed: Hexagram;
  nuclear: Hexagram;
  body: Trigram;
  use: Trigram;
  relation: {kind: string; label: string; summary: string};
  relationshipPerspective: string;
  notes: string[];
}>;

export declare function castByNumbers(input: NumberInput): CastOutcome<NumberInput, 'two-number-sum'>;
export declare function castByLunarTime(input: LunarInput): CastOutcome<LunarInput, 'lunar-branch-sum'>;

export declare function castByLaterHeaven(input: {objectTrigram:number;directionTrigram:number;hourBranch:number}):
 CastOutcome<{objectTrigram:number;directionTrigram:number;hourBranch:number},'later-heaven-object-direction-hour'>;
export declare function compareLaterHeavenWithTwoNumbers(input: {objectTrigram:number;directionTrigram:number;hourBranch:number}): Readonly<{
 status:'METHOD_COMPARISON_ONLY'; later:ReturnType<typeof castByLaterHeaven>; simple:ReturnType<typeof castByNumbers>;
 sameOriginal:boolean; sameMovingLine:boolean; sameTransformed:boolean;
 difference:Readonly<{movingSeedDelta:number;movingLineChanged:boolean;bodyChanged:boolean;useChanged:boolean}>;
 verdict:null;
}>;

export declare function castByCountHour(input:{count:number;hourBranch:number}):CastOutcome<{count:number;hourBranch:number},'object-count-hour'>;
export declare function castBySoundHour(input:{first:number;second:number;hourBranch:number}):CastOutcome<{first:number;second:number;hourBranch:number},'two-sound-batches-hour'>;
