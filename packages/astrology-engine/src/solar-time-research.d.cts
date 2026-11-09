export const RULESET: 'tuvi-solar-time-sensitivity-v1';
export const BRANCHES: readonly string[];
export interface SolarTimeInput {
  date: string;
  hour: number;
  minute?: number;
  longitude: number;
  /** Standard local UTC offset, in minutes. Daylight saving is NOT inferred. */
  utcOffsetMinutes?: number;
}
export interface SolarTimeResult {
  ruleSet: string;
  clock: Readonly<{date: string; hour: number; minute: number; branch: string}>;
  corrected: Readonly<{date: string; hour: number; minute: number; second: number; branch: string}>;
  utcOffsetMinutes: number;
  longitude: number;
  standardMeridian: number;
  longitudeCorrectionMinutes: number;
  equationOfTimeMinutes: number;
  correctionMinutes: number;
  dayOffset: number;
  branchChanged: boolean;
  nearBranchBoundary: boolean;
  boundaryDistanceMinutes: number;
  precision: string;
  note: string;
}
export function assess(input: SolarTimeInput): Readonly<SolarTimeResult>;

