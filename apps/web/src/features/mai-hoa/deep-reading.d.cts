import type {Trigram,Hexagram} from '../iching/hexagrams.cjs';
export declare function matchTrigram(bits:string):Trigram;
export declare function makeDeepReading(cast:{original:Hexagram;nuclear:Hexagram;transformed:Hexagram;body:Trigram;use:Trigram;changingLine:number}):Readonly<{
 bodyLocation:'upper'|'lower';body:Trigram;use:Trigram;original:Hexagram;nuclear:Hexagram;transformed:Hexagram;
 layers:readonly Readonly<{id:string;stage:string;trigram:Trigram;what:string;relation:{kind:string;label:string;summary:string}}>[];
 checks:Readonly<{agree:number;oppose:number;neutral:number}>;limit:string;
}>;
