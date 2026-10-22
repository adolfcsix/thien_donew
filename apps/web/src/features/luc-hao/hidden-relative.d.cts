export declare const RULE: 'jing-fang-pure-palace-absent-relative-v11.97';
export type RelativeName = 'Phụ Mẫu'|'Huynh Đệ'|'Tử Tôn'|'Thê Tài'|'Quan Quỷ';
export type ElementRelation = 'same'|'generate'|'generated-by'|'control'|'controlled-by';
export type LineRef = Readonly<{position:number;stem:string;branch:string;stemBranch:string;element:string;family:RelativeName;role:string|null}>;
export type CalendarEvidence = Readonly<{day:Readonly<{branch:string;relation:readonly string[];elementFromDay:ElementRelation}>|null;
 month:Readonly<{branch:string;relation:readonly string[];elementFromMonth:ElementRelation;opposed:boolean}>|null;
 void:boolean|null;monthUsable:boolean}>;
export declare function hiddenRelativeEvidence(chart:unknown,selected:RelativeName,options?:{
 context?: {source:string;date:string|null;dayStem:string;dayBranch:string;monthBranch:string|null;voidBranches:readonly string[]}|null
}):Readonly<{rule:string;school:string;selected:RelativeName;palace:string;stage:string;purePalaceBits:string;
 status:'VISIBLE'|'HIDDEN_REFERENCE';visible:readonly Readonly<{line:LineRef;calendar:CalendarEvidence;status:'VISIBLE_CANDIDATE'}>[];
 hidden:readonly Readonly<{position:number;hidden:LineRef;flying:LineRef;flyingToHidden:ElementRelation;
 hiddenToFlying:ElementRelation;calendar:CalendarEvidence;flyingCalendar:CalendarEvidence;status:'HIDDEN_REFERENCE_ONLY'}>[];
 calendarStatus:string;decision:Readonly<{usefulGod:null;prosperity:null;auspiciousness:null;timing:null}>;notes:readonly string[]}>;
