import {BadRequestException} from '@nestjs/common';
/** Validate an optional foreign-key reference without importing any calculation engine. */
export function birthProfileRef(value:unknown):string|null {
 if(value===null||value===undefined)return null;
 if(typeof value!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value))
  throw new BadRequestException('Mã hồ sơ sinh không hợp lệ');
 return value.toLowerCase();
}
