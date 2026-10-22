/** Minimum read-only contract used by snapshot validation; runtime validates unknown input. */
declare module '@thiendo/astrology-engine/src/taiyi-depth.cjs' {
  export function calculateTaiyi(input: unknown): Readonly<{status: string; result: unknown}>;
}
