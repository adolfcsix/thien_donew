'use strict';

/** Consume precisely one reserved usage record before acknowledging AI output. */
function assertAiUsageTransition(result) {
  if (!result || result.rowCount !== 1) throw new Error('AI_RESERVATION_NOT_ACTIVE');
}

/** Detect an admin model/prompt/token-price update between prompt assembly and quota lock. */
function sameAiGenerationConfig(before, locked) {
  return Boolean(before && locked &&
    before.model === locked.model &&
    before.prompt_version === locked.prompt_version &&
    before.max_output_tokens === locked.max_output_tokens &&
    Number(before.input_price_microusd_per_million) === Number(locked.input_price_microusd_per_million) &&
    Number(before.output_price_microusd_per_million) === Number(locked.output_price_microusd_per_million));
}

module.exports = {assertAiUsageTransition, sameAiGenerationConfig};
