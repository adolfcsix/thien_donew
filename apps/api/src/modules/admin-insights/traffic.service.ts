import {createHash} from 'node:crypto';
import type {Request} from 'express';
import {BadRequestException, Injectable, HttpException} from '@nestjs/common';
import {DatabaseService} from '../../common/database.service';

@Injectable()
export class TrafficService {
  constructor(private readonly db: DatabaseService) {}
  private readonly limits = new Map<string,{until:number;count:number}>();
  enabled() { return process.env.WEB_ANALYTICS_ENABLED === 'true'; }

  async record(req:Request, raw: unknown) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) ||
      typeof (raw as {eventId?: unknown}).eventId !== 'string' ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test((raw as {eventId: string}).eventId)) {
      throw new BadRequestException('Sự kiện lượt xem không hợp lệ');
    }
    if (!this.enabled()) return {recorded: false, reason: 'disabled'};
    const now=Date.now();
    const key=createHash('sha256').update(req.ip||req.socket?.remoteAddress||'unknown').digest('hex');
    for(const [id,entry] of this.limits) if(entry.until<=now) this.limits.delete(id);
    const limit=this.limits.get(key)||{until:now+60000,count:0};
    if(limit.count>=120||(!this.limits.has(key)&&this.limits.size>=4096)) throw new HttpException('Quá nhiều lượt ghi nhận',429);
    limit.count++;this.limits.set(key,limit);
    const eventId = (raw as {eventId: string}).eventId;
    // The same navigation UUID can be retried without increasing the count.
    return this.db.transaction(async client => {
      await client.query('INSERT INTO web_analytics_state(id) VALUES(1) ON CONFLICT DO NOTHING');
      const result = await client.query('INSERT INTO web_page_views(event_id) VALUES($1) ON CONFLICT DO NOTHING RETURNING event_id', [eventId]);
      return {recorded: result.rows.length === 1};
    });
  }
}
