import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { DatabaseService } from '../../common/database.service';
import { AuthService } from './auth.service';
import { inspectAvatar } from './avatar-image-validation.cjs';

export function validateAvatar(data:unknown, contentType:unknown) {
  const image = inspectAvatar(data,contentType);
  if (!image) throw new BadRequestException('Ảnh phải là JPEG, PNG hoặc WebP hoàn chỉnh, tối đa 300 KB, không vượt quá 8192 px/cạnh và 36 triệu điểm ảnh');
  return image.mime;
}
@Injectable()
export class ProfileService {
  constructor(private readonly db:DatabaseService, private readonly auth:AuthService) {}
  async update(req:Request,body:unknown) {
    const user = await this.auth.required(req);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('Hồ sơ không hợp lệ');
    const {displayName} = body as Record<string,unknown>;
    if (typeof displayName !== 'string') throw new BadRequestException('Tên hiển thị không hợp lệ');
    const name = displayName.trim().replace(/\s+/g,' ');
    if (name.length<2 || name.length>60 || /[\x00-\x1f\x7f<>]/.test(name)) throw new BadRequestException('Tên hiển thị từ 2 đến 60 ký tự');
    await this.db.query('UPDATE users SET display_name=$1 WHERE id=$2',[name,user.id]);
    return {updated:true,displayName:name};
  }
  async avatar(req:Request,res:Response) {
    const user = await this.auth.required(req);
    const found = await this.db.query<{avatar_data:Buffer|null;avatar_mime:string|null}>('SELECT avatar_data,avatar_mime FROM users WHERE id=$1',[user.id]);
    const {avatar_data:data,avatar_mime:mime} = found.rows[0] || {};
    if (!data || !mime) throw new NotFoundException('Chưa có ảnh đại diện');
    res.setHeader('Content-Type',mime);res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','private, no-store');
    return res.send(data);
  }
  async uploadAvatar(req:Request) {
    const user = await this.auth.required(req);
    const type = validateAvatar(req.body,req.headers['content-type']);
    await this.db.query('UPDATE users SET avatar_data=$1,avatar_mime=$2 WHERE id=$3',[req.body,type,user.id]);
    return {updated:true};
  }
  async removeAvatar(req:Request) {
    const user = await this.auth.required(req);
    await this.db.query('UPDATE users SET avatar_data=NULL,avatar_mime=NULL WHERE id=$1',[user.id]);
    return {updated:true};
  }
}
