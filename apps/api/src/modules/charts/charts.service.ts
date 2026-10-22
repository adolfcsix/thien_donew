import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import Engine = require('@thiendo/astrology-engine');
import { DatabaseService } from '../../common/database.service';
import { validBirth, validChart, resultVerified } from '../../common/validation';
import { assertChartId } from '../../common/identifiers';
import {birthProfileRef} from '../../common/profile-identifiers';
import { AuthService } from '../auth/auth.service';

type CountRow = { n: string };
const CHART_SELECT = `
  SELECT id,label,birth_date AS date,
         hour,minute,calendar,leap,gender,
         rule_set AS "ruleSet",birth_profile_id AS "birthProfileId", created_at AS "createdAt"
  FROM charts
`;

/** Identity includes the descriptive label: rerunning the same backup is idempotent. */
function fingerprint(input: {label:string;date:string;hour:number;minute:number;calendar:string;leap:boolean;gender:string}) {
  return JSON.stringify([input.label.trim(),input.date,input.hour,input.minute,input.calendar,input.leap,input.gender]);
}

@Injectable()
export class ChartsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auth: AuthService,
  ) {}

  calculate(body: unknown) {
    const input = validBirth(body);
    return { result: resultVerified(input), ruleSet: Engine.RULESET };
  }

  async calculateForUser(req: Request, body: unknown) {
    await this.auth.required(req);
    return this.calculate(body);
  }

  async list(req: Request) {
    const user = await this.auth.required(req);
    const result = await this.db.query(
      `${CHART_SELECT} WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`,
      [user.id],
    );
    return { charts: result.rows };
  }

  async save(req: Request, body: unknown) {
    const user = await this.auth.required(req);
    const input = validChart(body);
    const birthProfileId=birthProfileRef((body as Record<string,unknown>).birthProfileId);
    // The server always recalculates; never trust a client-submitted house/star list.
    resultVerified(input);
    // Serialize writes per account so two parallel saves cannot bypass the 100-chart cap.
    return this.db.transaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [user.id]);
      const count = await client.query<CountRow>(
        'SELECT COUNT(*)::text AS n FROM charts WHERE user_id=$1',
        [user.id],
      );
      if (Number(count.rows[0].n) >= 100) {
        throw new ConflictException('Tối đa 100 lá số');
      }
      if(birthProfileId){
        const checked=await client.query<{date:string;hour:number|null;minute:number|null;calendar:string;leap:boolean;gender:string|null;timeZone:string}>(
          `SELECT birth_date::text AS date,hour,minute,calendar,leap,gender,time_zone AS "timeZone" FROM birth_profiles WHERE id=$1 AND user_id=$2`,[birthProfileId,user.id]);
        const source=checked.rows[0];
        if(!source)throw new NotFoundException('Hồ sơ sinh không thuộc tài khoản');
        if(source.date!==input.date||source.hour!==input.hour||source.minute!==input.minute||source.calendar!==input.calendar||source.leap!==input.leap||source.gender!==input.gender||source.timeZone!=='Asia/Ho_Chi_Minh')
          throw new BadRequestException('Dữ liệu sinh đã khác nguồn; hãy bỏ liên kết hoặc lập lại từ hồ sơ sinh');
      }
      const id = randomUUID();
      await client.query(
        `INSERT INTO charts(id,user_id,label,birth_date,hour,minute,calendar,leap,gender,rule_set,birth_profile_id)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [id, user.id, input.label, input.date, input.hour, input.minute,
          input.calendar, input.leap, input.gender, Engine.RULESET,birthProfileId],
      );
      return { id, ruleSet: Engine.RULESET, verified: true };
    });
  }

  /** Import a V8.4+ JSON export atomically into the authenticated user's collection.
   * The file is untrusted: discard IDs, owners, stored rule sets and computed placements.
   * Entire transaction rolls back on an invalid file, DB failure or exceeding 100 charts.
   */
  async importBackup(req: Request, body: unknown) {
    const user = await this.auth.required(req);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('Tệp sao lưu không hợp lệ');
    }
    const payload = body as Record<string, unknown>;
    if (payload.format !== 'thien-do.saved-charts' || payload.version !== 1 ||
        !Array.isArray(payload.charts) || payload.charts.length === 0 || payload.charts.length > 100) {
      throw new BadRequestException('Chỉ hỗ trợ định dạng sao lưu THIÊN ĐỒ phiên bản 1, từ 1 đến 100 lá số');
    }
    // Enforce a deterministic bound even when called internally without the HTTP JSON parser.
    if (Buffer.byteLength(JSON.stringify(payload), 'utf8') > 65536) throw new BadRequestException('Tệp sao lưu vượt giới hạn 64 KB');
    const requested = payload.charts.map(value => {
      const input = validChart(value);
      resultVerified(input); // never trust stored stars; reject invalid lunar/leap dates
      return input;
    });
    return this.db.transaction(async client => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [user.id]);
      const existing = await client.query(`${CHART_SELECT} WHERE user_id=$1`, [user.id]);
      const seen = new Set(existing.rows.map(fingerprint));
      let imported = 0;
      let skipped = 0;
      const toInsert: typeof requested = [];
      for (const input of requested) {
        const key = fingerprint(input);
        if (seen.has(key)) { skipped++; continue; }
        seen.add(key);
        toInsert.push(input);
      }
      if (existing.rows.length + toInsert.length > 100) {
        throw new ConflictException('Khôi phục sẽ vượt giới hạn 100 lá số; không có dữ liệu nào được nhập');
      }
      for (const input of toInsert) {
        await client.query(
          `INSERT INTO charts(id,user_id,label,birth_date,hour,minute,calendar,leap,gender,rule_set)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [randomUUID(), user.id, input.label, input.date, input.hour, input.minute,
            input.calendar, input.leap, input.gender, Engine.RULESET]
        );
        imported++;
      }
      return { imported, skipped, total: existing.rows.length + imported };
    });
  }

  async get(req: Request, id: string) {
    const user = await this.auth.required(req);
    assertChartId(id);
    const result = await this.db.query(
      `${CHART_SELECT} WHERE id=$1 AND user_id=$2`,
      [id, user.id],
    );
    const chart = result.rows[0];
    if (!chart) throw new NotFoundException('Không tìm thấy lá số');
    return {
      chart,
      outdated: chart.ruleSet !== Engine.RULESET,
      // Rows returned by PostgreSQL are untrusted at the TypeScript boundary.
      // Validate the persisted birth fields before recalculating the chart.
      result: resultVerified(validBirth(chart)),
    };
  }

  async remove(req: Request, id: string) {
    const user = await this.auth.required(req);
    assertChartId(id);
    const result = await this.db.query(
      'DELETE FROM charts WHERE id=$1 AND user_id=$2',
      [id, user.id],
    );
    if (!result.rowCount) throw new NotFoundException('Không tìm thấy lá số');
    return { deleted: true };
  }
}
