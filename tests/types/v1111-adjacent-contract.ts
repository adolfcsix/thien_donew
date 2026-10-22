import type {AstrologyResult} from '@thiendo/shared-types';
import {buildPalaceReading, matchAdjacentPatterns, compareMenhThan} from '@thiendo/interpretation';
import {adjacentPalacePatterns} from '@thiendo/knowledge';
declare const chart:AstrologyResult;
const matches=matchAdjacentPatterns(chart,0);
const relation=compareMenhThan(chart,0);
const reading=buildPalaceReading({chart,branchIndex:0});
const title:string=matches[0]?.title??'';
const id:string=adjacentPalacePatterns[0]?.id??'';
const evaluated:number=reading.coverage.adjacentPatternsEvaluated;
if(relation.status==='verified') {
  const menh:string=relation.menh.branch;
  const than:string=relation.than.palace;
  console.log(menh,than);
} else {
  const message:string=relation.notice;
  console.log(message);
}
console.log(title,id,evaluated);
