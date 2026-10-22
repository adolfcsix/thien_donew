import {ADMIN_CAPABILITIES,effectiveCapabilities} from '../admin-console/permissions';
import {Injectable, HttpException, HttpStatus, BadRequestException, ForbiddenException} from '@nestjs/common';
import type {Request} from 'express';
import {DatabaseService} from '../../common/database.service';
import {AdminMfaService} from '../auth/admin-mfa.service';
import {TrafficService} from './traffic.service';
import {AdminInsightAiService} from './admin-insight-ai.service';
import {insightInput, type InsightFact} from './insight-contract';
import {dashboardSnapshot} from './dashboard-snapshot';
import {publicRankSnapshot} from './rank-snapshot';

@Injectable()
export class AdminInsightsService {
  constructor(private readonly db: DatabaseService, private readonly mfa: AdminMfaService,
    private readonly traffic: TrafficService, private readonly ai: AdminInsightAiService) {}

  private async capabilities(actor:{id:string;role:string}) {
    if(actor.role==='owner')return [...ADMIN_CAPABILITIES];
    const row=(await this.db.query('SELECT capabilities FROM admin_permission_sets WHERE user_id=$1',[actor.id])).rows[0];
    return effectiveCapabilities(actor.role,row?.capabilities);
  }
  private assertTopics(topics:string[],caps:string[]){
    const needed:Record<string,string>={traffic:'overview.read',forum:'community.read',members:'members.read',ranks:'ranks.read',finance:'finance.read',system:'community.read',library:'library.read',charts:'ai.read'};
    if(topics.some(topic=>!needed[topic]||!caps.includes(needed[topic])))throw new ForbiddenException('Câu hỏi chứa dữ liệu ngoài phạm vi quản trị được cấp. Hãy chọn chủ đề thuộc quyền của bạn.');
  }
  async dashboard(req: Request, rawDays: unknown) {
    const actor = await this.mfa.requireAdmin(req);
    const caps=await this.capabilities(actor);
    const days = rawDays === undefined ? 7 : Number(rawDays);
    if (![1,7,30].includes(days)) throw new BadRequestException('Chọn kỳ 1, 7 hoặc 30 ngày');
    const report = await this.db.transaction(async client => {
      await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
      const lock=(await client.query<{locked:boolean}>("SELECT pg_try_advisory_xact_lock(hashtext('dashboard-' || $1)) AS locked",[actor.id])).rows[0];
      if (!lock.locked) throw new HttpException('Dashboard đang được tải; hãy đợi hoàn tất.',429);
      const recent = (await client.query<{n:string}>("SELECT COUNT(*)::text AS n FROM admin_audit WHERE actor_id=$1 AND action='dashboard.read' AND created_at>clock_timestamp()-INTERVAL '1 minute'",[actor.id])).rows[0];
      if (Number(recent.n)>=20) throw new HttpException('Tối đa 20 lượt tải dashboard/phút',429);
      const snapshot = await dashboardSnapshot(client,days,this.traffic.enabled(),caps);
      await client.query('INSERT INTO admin_audit(actor_id,action,target,details) VALUES($1,$2,$3,$4)',[actor.id,'dashboard.read','aggregate',JSON.stringify({days})]);
      return snapshot;
    });
    const fresh=await this.capabilities(await this.mfa.requireAdmin(req));
    if(caps.some(cap=>!fresh.includes(cap)))throw new ForbiddenException('Quyền vừa thay đổi; tải lại dashboard.');
    return report;
  }

  async ask(req: Request, raw: unknown) {
    const actor = await this.mfa.requireAdmin(req);
    const input = insightInput(raw);
    this.assertTopics(input.topics,await this.capabilities(actor));
    const report = await this.db.transaction(async client => {
      // One coherent data snapshot. The final guard below rechecks access after the read/provider wait.
      await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
      const lock=(await client.query<{locked:boolean}>("SELECT pg_try_advisory_xact_lock(hashtext('admin-insight-' || $1)) AS locked", [actor.id])).rows[0];
      if(!lock.locked) throw new HttpException('Một báo cáo đang được đọc. Hãy đợi hoàn tất.',429);
      const recent = (await client.query<{n:string}>("SELECT COUNT(*)::text AS n FROM admin_audit WHERE actor_id=$1 AND action='insights.read' AND created_at>clock_timestamp()-INTERVAL '1 minute'", [actor.id])).rows[0];
      if (Number(recent.n)>=12) throw new HttpException('Tối đa 12 báo cáo/phút; hãy đợi trước khi hỏi lại.',HttpStatus.TOO_MANY_REQUESTS);
      const offset = input.period==='week'?6:input.period==='month'?29:input.period==='yesterday'?1:0;
      const time = (await client.query<{start:Date;end:Date;generatedAt:Date}>(`
        SELECT (date_trunc('day',now() AT TIME ZONE 'Asia/Ho_Chi_Minh')-$1::int*INTERVAL '1 day') AT TIME ZONE 'Asia/Ho_Chi_Minh' AS start,
        CASE WHEN $2::boolean THEN date_trunc('day',now() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh' ELSE now() END AS end,
        now() AS "generatedAt"`, [offset,input.period==='yesterday'])).rows[0];
      const facts: InsightFact[] = [];
      let queues: {orders:unknown[];reports:unknown[]}|null=null;
      const count = async (id:string,label:string,source:string,sql:string) => {
        const row=(await client.query<{n:string}>(sql,[time.start,time.end])).rows[0];
        const value=Number(row.n);
        if(!Number.isSafeInteger(value)||value<0) throw new Error('Invalid metric');
        facts.push({id,label,source,value});
      };
      const warnings:string[]=[];
      let tracking: {enabled:boolean;startedAt:Date|null} | null=null;
      if(input.topics.includes('traffic')) {
        const state=(await client.query<{started_at:Date}>('SELECT started_at FROM web_analytics_state WHERE id=1')).rows[0];
        tracking={enabled:this.traffic.enabled(),startedAt:state?.started_at||null};
        if(!tracking.enabled||!tracking.startedAt) warnings.push('Lượt xem chưa được bật/chưa có sự kiện; chưa có số liệu, không được hiểu là 0 lượt truy cập.');
        else {
          await count('traffic.views','Lượt xem trang ghi nhận','web_page_views.created_at', 'SELECT COUNT(*)::text AS n FROM web_page_views WHERE created_at>=$1 AND created_at<$2');
          warnings.push('Đây là lượt xem trang từ trình duyệt, không phải số người/phiên duy nhất. Không có dữ liệu trước lúc bắt đầu, khi tắt ghi nhận, DNT hoặc bị chặn. Dữ liệu sự kiện giữ 90 ngày.');
        }
      }
      if(input.topics.includes('forum')) {
        await count('forum.threads','Bài diễn đàn tạo mới (mọi trạng thái)','forum_threads.created_at','SELECT COUNT(*)::text AS n FROM forum_threads WHERE created_at>=$1 AND created_at<$2');
        await count('forum.public','Bài mới hiện công khai','forum_threads.created_at/state/visibility',"SELECT COUNT(*)::text AS n FROM forum_threads WHERE created_at>=$1 AND created_at<$2 AND state='visible' AND visibility='public'");
        await count('forum.comments','Bình luận tạo mới (mọi trạng thái)','forum_comments.created_at','SELECT COUNT(*)::text AS n FROM forum_comments WHERE created_at>=$1 AND created_at<$2');
        warnings.push('Bản ghi đã xóa vĩnh viễn không còn trong thống kê; trạng thái công khai là trạng thái tại thời điểm đọc.');
      }
      if(input.topics.includes('members')) await count('members.new','Tài khoản tạo mới còn trong hệ thống','users.created_at','SELECT COUNT(*)::text AS n FROM users WHERE created_at>=$1 AND created_at<$2');
      const ranks=input.topics.includes('ranks')?await publicRankSnapshot(client,input.minLevel):null;
      if(ranks) {
        facts.push({id:'ranks.matches',label:`Hồ sơ công khai cấp ${input.minLevel}+ trong mẫu hiện tại`,value:ranks.matchingInSample,source:'verified ledgers + latest active manual grant; Rules.evaluate'});
        warnings.push('Cảnh giới là ảnh chụp hiện tại, không phải lịch sử theo khoảng ngày. Chỉ hồ sơ công khai, không bị khóa/hạn chế; tối đa 500 ứng viên và hiển thị 30 kết quả. Cấp thủ công không làm tăng điểm.');
        if(ranks.truncated) warnings.push('Có hơn 500 ứng viên: danh sách và số lượng cấp cao là một mẫu, không phải toàn hệ thống.');
      }
      if (input.topics.some(topic=>['finance','system','library','charts'].includes(topic))) {
        queues={orders:[],reports:[]};
        if(input.topics.includes('finance')) {
          queues.orders=(await client.query("SELECT id,amount_vnd AS \"amountVnd\",status,created_at AS \"createdAt\" FROM billing_orders WHERE status IN ('creating','pending') ORDER BY created_at ASC,id LIMIT 30")).rows;
          await count('finance.gross','Tổng thu trước hoàn tiền (VND)','billing_orders.paid_at · paid/refunded, chưa trừ phí/thuế',"SELECT COALESCE(SUM(amount_vnd),0)::text AS n FROM billing_orders WHERE paid_at>=$1 AND paid_at<$2 AND status IN ('paid','refunded')");
          const pending=(await client.query<{n:string}>("SELECT COUNT(*)::text AS n FROM billing_orders WHERE status IN ('creating','pending')")).rows[0];
          facts.push({id:'finance.pending',label:'Đơn đang chờ (ảnh chụp hiện tại)',value:Number(pending.n),source:'billing_orders.status=creating/pending'});
          warnings.push('Danh sách tối đa 30 đơn chờ cũ nhất; không bao gồm email, thông tin thanh toán hay bí mật người dùng. Doanh thu là tổng thu đã xác nhận trước hoàn tiền, chưa trừ phí/thuế. Không cung cấp thông tin giao dịch cá nhân trong chat; xem Admin Tài chính.');
        }
        if(input.topics.includes('system')) {
          queues.reports=(await client.query("SELECT id,reason,status,created_at AS \"createdAt\" FROM forum_reports WHERE status IN ('open','reviewing') ORDER BY created_at ASC,id LIMIT 30")).rows;
          const queue=(await client.query<{n:string}>("SELECT COUNT(*)::text AS n FROM forum_reports WHERE status IN ('open','reviewing')")).rows[0];
          facts.push({id:'system.reports',label:'Báo cáo cần xử lý (hiện tại)',value:Number(queue.n),source:'forum_reports.status=open/reviewing'});
          warnings.push('Database trả lời truy vấn ở thời điểm báo cáo. Chưa đo CPU, RAM, độ sẵn sàng email/payOS/Gemini; không suy ra hệ thống hoàn toàn khỏe. Xem hàng đợi tại /admin/forum.');
        }
        if(input.topics.includes('library')) {
          await count('library.books','Sách tạo mới còn trong hệ thống','library_books.created_at','SELECT COUNT(*)::text AS n FROM library_books WHERE created_at>=$1 AND created_at<$2');
          await count('library.documents','Tài liệu tạo mới còn trong hệ thống','van_kho_documents.created_at','SELECT COUNT(*)::text AS n FROM van_kho_documents WHERE created_at>=$1 AND created_at<$2');
        }
        if(input.topics.includes('charts')) {
          await count('charts.saved','Lá số đã lưu mới','charts.created_at · không đếm lần lập chưa lưu','SELECT COUNT(*)::text AS n FROM charts WHERE created_at>=$1 AND created_at<$2');
          await count('ai.completed','Yêu cầu AI hoàn tất','ai_usage.created_at/status=completed',"SELECT COUNT(*)::text AS n FROM ai_usage WHERE created_at>=$1 AND created_at<$2 AND status='completed'");
        }
      }
      await client.query('INSERT INTO admin_audit(actor_id,action,target,details) VALUES($1,$2,$3,$4)',[actor.id,'insights.read','aggregate',JSON.stringify({topics:input.topics,period:input.period,minLevel:input.minLevel,geminiRequested:input.explain})]);
      return {period:input.period,timeZone:'Asia/Ho_Chi_Minh',...time,facts,warnings,tracking,ranks,queues};
    });
    this.assertTopics(input.topics,await this.capabilities(await this.mfa.requireAdmin(req)));
    let interpretation: Awaited<ReturnType<AdminInsightAiService['explain']>> | null=null;
    let aiError: string | null=null;
    if(input.explain && report.facts.length) {
      try { interpretation=await this.ai.explain(actor.id,report.facts); }
      catch(error) { aiError=error instanceof HttpException?error.message:'Chưa phân tích được bằng Gemini; số liệu gốc vẫn có bên dưới.'; }
    }
    // Never return a completed snapshot to a revoked role/expired MFA session.
    this.assertTopics(input.topics,await this.capabilities(await this.mfa.requireAdmin(req)));
    return {...report,interpretation,aiError};
  }
}
