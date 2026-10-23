import type {TarotDepthReading} from '@thiendo/interpretation/src/tarot-depth.cjs';
export function tarotReadingRoute(report:TarotDepthReading,options?:{anchor?:number;limit?:number}):{pairs:TarotDepthReading['combinations'];coveredPositions:number[];totalPositions:number;availablePairs:number;anchor:number;notice:string};
