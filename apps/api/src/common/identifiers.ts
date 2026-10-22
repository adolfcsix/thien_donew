import { BadRequestException } from '@nestjs/common';

/** UUIDs are an API input contract, not a PostgreSQL exception.
 * Canonical RFC4122 variants accepted; do not use DB errors for validation. */
export function assertChartId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)) {
    throw new BadRequestException('Mã lá số không hợp lệ');
  }
  return value;
}
