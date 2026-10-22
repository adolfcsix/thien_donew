import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type { Request } from 'express';
import { DatabaseService } from '../../common/database.service';
import { AuthService } from '../auth/auth.service';
import { assertChartId } from '../../common/identifiers';
import { birthProfileRef, createStudyEntry, patchStudyEntry, studyImportId, validateStudyImport } from './study-validation';

const SELECT = `SELECT id,discipline,title,summary,notes,tags,snapshot,pinned, birth_profile_id AS "birthProfileId",
 created_at AS "createdAt",updated_at AS "updatedAt" FROM study_entries`;

@Injectable()
export class StudyService {
  constructor(private readonly db: DatabaseService, private readonly auth: AuthService) {}

  async list(req: Request) {
    const user = await this.auth.required(req);
    const result = await this.db.query(`${SELECT} WHERE user_id=$1 ORDER BY pinned DESC,updated_at DESC,id LIMIT 200`, [user.id]);
    return {entries: result.rows};
  }
  async get(req: Request, id: string) {
    const user = await this.auth.required(req);
    assertChartId(id);
    const result = await this.db.query(`${SELECT} WHERE id=$1 AND user_id=$2`,[id,user.id]);
    if (!result.rows[0]) throw new NotFoundException('Không tìm thấy hồ sơ nghiên cứu');
    return {entry:result.rows[0]};
  }
  async create(req: Request, body: unknown) {
    const user = await this.auth.required(req);
    const input = createStudyEntry(body);
    const profileId=birthProfileRef((body as Record<string,unknown>).birthProfileId);
    return this.db.transaction(async client => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[user.id]);
      const count = await client.query<{n:string}>('SELECT COUNT(*)::text AS n FROM study_entries WHERE user_id=$1',[user.id]);
      if (Number(count.rows[0].n) >= 200) throw new ConflictException('Tối đa 200 hồ sơ nghiên cứu');
      if(profileId){const related=await client.query('SELECT id FROM birth_profiles WHERE id=$1 AND user_id=$2',[profileId,user.id]);
        if(!related.rowCount) throw new NotFoundException('Hồ sơ sinh không thuộc tài khoản');}
      const id = randomUUID();
      await client.query(`INSERT INTO study_entries(id,user_id,discipline,title,summary,notes,tags,snapshot,birth_profile_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
       [id,user.id,input.discipline,input.title,input.summary,input.notes,input.tags,JSON.stringify(input.snapshot),profileId]);
      return {id};
    });
  }
  /** Import is all-or-nothing AND idempotent, including lost responses after COMMIT.
   * Receipt and entries are written on one transaction/client. Reuse of a key
   * with different validated contents is rejected, even after quota is full.
   */
  async importBackup(req: Request, body: unknown) {
    const user = await this.auth.required(req);
    const entries = validateStudyImport(body);
    const importId = studyImportId((body as Record<string, unknown>).importId);
    const digest = createHash('sha256').update(JSON.stringify(entries)).digest('hex');
    return this.db.transaction(async client => {
      // Same advisory lock used by single-entry create: serialize quota and retries per owner.
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [user.id]);
      const receipt = await client.query<{payload_sha256:string;imported_count:number}>(
        'SELECT payload_sha256,imported_count FROM study_import_receipts WHERE user_id=$1 AND import_id=$2',
        [user.id,importId],
      );
      if (receipt.rows[0]) {
        if (receipt.rows[0].payload_sha256.trim() !== digest) {
          throw new ConflictException('Mã lần nhập đã dùng với nội dung khác; hãy chọn tệp để tạo lần nhập mới');
        }
        return { importId, imported: receipt.rows[0].imported_count, replayed: true };
      }
      const count = await client.query<{n:string}>('SELECT COUNT(*)::text AS n FROM study_entries WHERE user_id=$1', [user.id]);
      if (Number(count.rows[0].n) + entries.length > 200) {
        throw new ConflictException(`Thư phòng chỉ còn ${Math.max(0, 200 - Number(count.rows[0].n))} chỗ trống`);
      }
      for (const entry of entries) {
        await client.query(`INSERT INTO study_entries(id,user_id,discipline,title,summary,notes,tags,snapshot,pinned)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [randomUUID(),user.id,entry.discipline,entry.title,entry.summary,entry.notes,
            entry.tags,JSON.stringify(entry.snapshot),entry.pinned]);
      }
      await client.query(`INSERT INTO study_import_receipts(user_id,import_id,payload_sha256,imported_count)
        VALUES($1,$2,$3,$4)`, [user.id,importId,digest,entries.length]);
      return { importId, imported: entries.length, replayed: false };
    });
  }
  /** Owner-scoped receipt: answers whether a possibly-disconnected request committed.
   * A missing receipt does NOT prove the original request stopped running.
   * Re-sending the SAME importId remains safe in either case.
   */
  async importStatus(req: Request, id: string) {
    const user = await this.auth.required(req);
    const importId = studyImportId(id);
    const receipt = await this.db.query<{imported_count:number}>(
      'SELECT imported_count FROM study_import_receipts WHERE user_id=$1 AND import_id=$2',
      [user.id,importId],
    );
    if (!receipt.rows[0]) throw new NotFoundException('Chưa có biên nhận nhập dữ liệu đã hoàn thành');
    return { importId, imported: receipt.rows[0].imported_count, committed: true };
  }
  async update(req: Request, id: string, body: unknown) {
    const user = await this.auth.required(req);
    assertChartId(id);
    const fields = patchStudyEntry(body);
    const keys = Object.keys(fields) as Array<keyof typeof fields>;
    const names:Record<string,string> = {title:'title',notes:'notes',tags:'tags',pinned:'pinned',birthProfileId:'birth_profile_id'};
    const clauses = keys.map((field,index) => `${names[field]}=$${index+3}`);
    const values = keys.map(field => fields[field]);
    // Owner-scoped referential condition in the same UPDATE prevents cross-account
    // links and avoids a TOCTOU gap between checking and setting the relation.
    const profileIndex=keys.indexOf('birthProfileId');
    const ownerGuard=profileIndex<0?'':` AND ($${profileIndex+3}::uuid IS NULL OR EXISTS (SELECT 1 FROM birth_profiles WHERE id=$${profileIndex+3} AND user_id=$2))`;
    const result=await this.db.query(`UPDATE study_entries SET ${clauses.join(',')},updated_at=NOW() WHERE id=$1 AND user_id=$2${ownerGuard} RETURNING id`,[id,user.id,...values]);
    if (!result.rowCount) throw new NotFoundException('Không tìm thấy hồ sơ nghiên cứu');
    return {updated:true};
  }
  async remove(req: Request, id: string) {
    const user = await this.auth.required(req);
    assertChartId(id);
    const result = await this.db.query('DELETE FROM study_entries WHERE id=$1 AND user_id=$2',[id,user.id]);
    if (!result.rowCount) throw new NotFoundException('Không tìm thấy hồ sơ nghiên cứu');
    return {deleted:true};
  }
}
