import {BadRequestException,ConflictException,Injectable,NotFoundException} from '@nestjs/common';
import {randomUUID} from 'node:crypto';
import type {Request} from 'express';
import {DatabaseService} from '../../common/database.service';
import {AuthService} from '../auth/auth.service';
import {assertChartId} from '../../common/identifiers';
import {validateBirthProfile} from './birth-profile-validation.cjs';

export const PROFILE_SELECT=`SELECT id,name,birth_date::text AS date,hour,minute,calendar,leap,gender,
 time_zone AS "timeZone",birth_place AS "birthPlace",latitude,longitude,time_accuracy AS "timeAccuracy",notes,
 created_at AS "createdAt",updated_at AS "updatedAt" FROM birth_profiles`;
@Injectable()
export class BirthProfilesService {
 constructor(private readonly db:DatabaseService,private readonly auth:AuthService){}
 async list(req:Request){const user=await this.auth.required(req);const rows=await this.db.query(`${PROFILE_SELECT} WHERE user_id=$1 ORDER BY updated_at DESC,id LIMIT 100`,[user.id]);return {profiles:rows.rows};}
 async get(req:Request,id:string){const user=await this.auth.required(req);assertChartId(id);const result=await this.db.query(`${PROFILE_SELECT} WHERE user_id=$1 AND id=$2`,[user.id,id]);if(!result.rows[0])throw new NotFoundException('Không tìm thấy hồ sơ sinh');return {profile:result.rows[0]};}
 private validate(body:unknown){try{return validateBirthProfile(body);}catch(e){throw new BadRequestException((e as Error).message);}}
 async create(req:Request,body:unknown){const user=await this.auth.required(req);const x=this.validate(body);return this.db.transaction(async client=>{
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[user.id]);
  const count=await client.query<{n:string}>('SELECT COUNT(*)::text AS n FROM birth_profiles WHERE user_id=$1',[user.id]);
  if(Number(count.rows[0].n)>=100)throw new ConflictException('Tối đa 100 hồ sơ sinh cho một tài khoản');const id=randomUUID();
  await client.query(`INSERT INTO birth_profiles(id,user_id,name,birth_date,hour,minute,calendar,leap,gender,time_zone,birth_place,latitude,longitude,time_accuracy,notes)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
   [id,user.id,x.name,x.date,x.hour,x.minute,x.calendar,x.leap,x.gender,x.timeZone,x.birthPlace,x.latitude,x.longitude,x.timeAccuracy,x.notes]);return {id};});}
 async update(req:Request,id:string,body:unknown){const user=await this.auth.required(req);assertChartId(id);const x=this.validate(body);
  const result=await this.db.query(`UPDATE birth_profiles SET name=$3,birth_date=$4,hour=$5,minute=$6,calendar=$7,leap=$8,gender=$9,time_zone=$10,birth_place=$11,latitude=$12,longitude=$13,time_accuracy=$14,notes=$15,updated_at=NOW() WHERE user_id=$1 AND id=$2 RETURNING id`,
  [user.id,id,x.name,x.date,x.hour,x.minute,x.calendar,x.leap,x.gender,x.timeZone,x.birthPlace,x.latitude,x.longitude,x.timeAccuracy,x.notes]);if(!result.rowCount)throw new NotFoundException('Không tìm thấy hồ sơ sinh');return {updated:true};}
 async remove(req:Request,id:string){const user=await this.auth.required(req);assertChartId(id);const result=await this.db.query('DELETE FROM birth_profiles WHERE id=$1 AND user_id=$2',[id,user.id]);if(!result.rowCount)throw new NotFoundException('Không tìm thấy hồ sơ sinh');return {deleted:true};}
}
