import type {AstrologyResult,AnnualOverview} from '@thiendo/shared-types';
import {buildPalaceReading,matchCombinations} from '../../packages/interpretation/src/index';
import type {CombinationRule,StarSymbol,ObstructionSymbol} from '../../packages/knowledge/src/index';

declare const chart:AstrologyResult;
declare const annual:AnnualOverview;
declare const rule:CombinationRule;
declare const star:StarSymbol;
declare const obstruction:ObstructionSymbol;
const reading=buildPalaceReading({chart,branchIndex:0,annual,includeAnnual:true});
const matched=matchCombinations(chart.houses[0]);
const profiles: string[] = reading.supportingProfiles.map(x => x.name);
const family: string[] = reading.cycleProfiles.map(x => x.family);
const notices: Array<string | null> = reading.obstructionProfiles.map(x => x.caution);
const predicates: boolean[] = matched.map(x => x.evidence.scope === 'same-palace');
const conditions: 'same-palace' | 'natal-transformation' = rule.conditions.scope;
const label: string = star.motif + obstruction.motif;
void profiles;void family;void notices;void predicates;void conditions;void label;
