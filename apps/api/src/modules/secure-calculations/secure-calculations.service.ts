import {BadRequestException,HttpException,Injectable} from '@nestjs/common';
import type {Request} from 'express';
import {AuthService} from '../auth/auth.service';
import {calculate,validateInput} from '@thiendo/astrology-engine/src/western-natal.cjs';
import {createRelationshipInput,parseRelationshipInput} from '@thiendo/astrology-engine/src/relationship-input.cjs';
import {getWesternKnowledge,readingMetadata,studyWesternInput} from '@thiendo/interpretation/src/western-depth.cjs';
import {studyRelationship} from '@thiendo/interpretation/src/relationship-reading.cjs';

/** Account-keyed, bounded per-process budget; ingress also limits aggregate API traffic.
 * No birth input, result, session token or secret is retained in this limiter. */
@Injectable()
export class SecureCalculationsService {
 private readonly budgets=new Map<string,{reset:number;used:number}>();
 constructor(private readonly auth:AuthService){}
 private async admit(req:Request,cost:number){
  const user=await this.auth.required(req),now=Date.now();
  let slot=this.budgets.get(user.id);
  if(!slot||slot.reset<=now){
   if(this.budgets.size>=5000){for(const [key,value] of this.budgets)if(value.reset<=now)this.budgets.delete(key);}
   if(!slot&&this.budgets.size>=5000)throw new HttpException('Máy chủ đang bận; vui lòng thử lại sau một phút.',429);
   slot={reset:now+60000,used:0};this.budgets.set(user.id,slot);
  }
  if(slot.used+cost>120)throw new HttpException('Đã đạt giới hạn tra cứu trong phút; vui lòng đợi rồi thử lại.',429);
  slot.used+=cost;
 }
 private object(raw:unknown):Record<string,unknown>{
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||Buffer.byteLength(JSON.stringify(raw),'utf8')>16384)throw new BadRequestException('Đầu vào tính toán không hợp lệ hoặc vượt 16 KiB.');
  return raw as Record<string,unknown>;
 }
 async natal(req:Request,raw:unknown){
  await this.admit(req,2);const body=this.object(raw);
  try{
   const source=this.object(body.input);
   // Restores preserve legacy metadata; only a new calculation pins current reading metadata.
   const input=validateInput(body.pinReading===true?{...source,reading:source.reading||readingMetadata()}:source);
   return {result:calculate(input),report:studyWesternInput(input)};
  }catch(error){if(error instanceof BadRequestException)throw error;throw new BadRequestException((error as Error).message);}
 }
 async relationship(req:Request,raw:unknown){
  await this.admit(req,6);const body=this.object(raw);
  try{
   const input=body.archive!==undefined?parseRelationshipInput(body.archive):createRelationshipInput(body.a as never,body.b as never,body.options as never);
   return {report:studyRelationship(input)};
  }catch(error){throw new BadRequestException((error as Error).message);}
 }
 async catalog(req:Request,tab='planets',index='0'){
  await this.admit(req,1);
  if(!['planets','signs','houses','aspects'].includes(tab)||!/^\d{1,2}$/.test(index))throw new BadRequestException('Mục tri thức không hợp lệ.');
  const data=getWesternKnowledge(),key=tab as 'planets'|'signs'|'houses'|'aspects',list=data[key],position=Number(index);
  if(position>=list.length)throw new BadRequestException('Mục tri thức nằm ngoài phạm vi.');
  return {navigation:{planets:data.planets.map(p=>({body:p.body,name:p.name})),signs:data.signs.map(p=>({name:p.name})),houses:data.houses.map(p=>({number:p.number,area:p.area})),aspects:data.aspects.map(p=>({angle:p.angle,name:p.name})),contexts:Object.fromEntries(Object.entries(data.contexts).map(([id,p])=>[id,{name:p.name}]))},item:list[position]};
 }
}
