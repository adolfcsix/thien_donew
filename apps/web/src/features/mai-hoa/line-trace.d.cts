import type {Hexagram} from '../iching/hexagrams.cjs';
export type MaiHoaTraceLine=Readonly<{position:number;before:'Dương'|'Âm';after:'Dương'|'Âm';changing:boolean;mainTrigram:'Hạ quái'|'Thượng quái';inLowerNuclear:boolean;inUpperNuclear:boolean}>;
export declare function makeLineTrace(cast:{original:Hexagram;nuclear:Hexagram;transformed:Hexagram;changingLine:number}):Readonly<{lines:readonly MaiHoaTraceLine[];nuclearLowerPositions:readonly number[];nuclearUpperPositions:readonly number[];notes:readonly string[]}>;
