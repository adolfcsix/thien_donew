export interface ExportDay {date:string;purposeLabel:string;gradeLabel:string;sourceTruc:string;daySpirit:string;daySpiritLabel:string;moonMansion:string;mixed:boolean;nearBoundary:boolean;ruleSet:string}
declare const exporter: {readonly HEADERS: readonly string[];cell(value:unknown):string;toCsv(days:ExportDay[]):string};
export = exporter;
