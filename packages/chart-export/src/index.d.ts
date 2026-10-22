import type {AstrologyResult,AnnualOverview} from '@thiendo/shared-types';
export function renderChartSvg(chart: AstrologyResult, label: string, annual?: AnnualOverview): string;

export interface CompleteChartOptions {showAuxiliary?:boolean;showCycles?:boolean;showAnnual?:boolean;showStrength?:boolean}
export function renderCompleteChartSvg(chart:AstrologyResult,label?:string,annual?:AnnualOverview,options?:CompleteChartOptions):string;
export function completeChartModel(chart:AstrologyResult,annual?:AnnualOverview,options?:CompleteChartOptions):{width:number;height:number;rowHeight:number;natalCount:number};
