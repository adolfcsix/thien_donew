import Engine from '@thiendo/astrology-engine';
import type { BirthInput, AstrologyResult } from '@thiendo/shared-types';
export function calculateLocal(input: BirthInput): AstrologyResult {
  return Engine.calculate(input);
}
export const ruleSet = Engine.RULESET;
