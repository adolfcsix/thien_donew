export function assertAiUsageTransition(result: {rowCount?: number | null} | null | undefined): void;
export function sameAiGenerationConfig(before: {
  model: string; prompt_version: string; max_output_tokens: number;
  input_price_microusd_per_million: number | string;
  output_price_microusd_per_million: number | string;
} | null | undefined, locked: {
  model: string; prompt_version: string; max_output_tokens: number;
  input_price_microusd_per_million: number | string;
  output_price_microusd_per_million: number | string;
} | null | undefined): boolean;
