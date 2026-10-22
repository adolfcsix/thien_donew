import type {Hexagram} from '../iching/hexagrams.cjs';
export declare const LINE_STATES:Record<number,{name:string;moving:boolean;yang:boolean}>;
export declare function makeLineLedger(lines:number[]):Readonly<{
 original:Hexagram;transformed:Hexagram;changing:number[];lines:number[];
 ledger:readonly {position:number;state:string;moving:boolean;before:string;after:string}[];
 notComputed:string[];
}>;
export declare function castThreeCoins(random?:()=>number):number[];
