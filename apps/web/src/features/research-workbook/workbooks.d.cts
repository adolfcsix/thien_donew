import type {BaseFormation} from '../ky-mon/formation.cjs';
import type {RotatingHourPlate} from '../ky-mon/hour-plate.cjs';
import type {QuestionSelection} from '../ky-mon/question-reading.cjs';
import type {Topic,Family,CalendarInput} from '../luc-hao/question-evidence.cjs';
export type ResearchWorkbook={kind:'research-workbook';discipline:'mai-hoa'|'ky-mon'|'luc-hao';title:string;status:'ready'|'not-computed'|'awaiting-confirmation'|'unlocated';sections:readonly {id:string;title:string;facts:readonly {label:string;value:string;origin:string}[];explanation:string;questions:readonly string[]}[];gaps:readonly string[];sources:readonly {title:string;url:string}[];outcome:null;score:null;forecast:null;notice:string};
export declare function buildMaiHoaWorkbook(cast:unknown):ResearchWorkbook;
export declare function buildQimenWorkbook(base:BaseFormation,plate:RotatingHourPlate|null,selection:QuestionSelection):ResearchWorkbook;
export declare function buildLucHaoWorkbook(chart:unknown,options:{questionId:Topic;confirmedFamily:Family;context?:CalendarInput|null;movingPositions?:number[];instantIso?:string|null}):ResearchWorkbook;
export declare function workbookMarkdown(report:ResearchWorkbook):string;
