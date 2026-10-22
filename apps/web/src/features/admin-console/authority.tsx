'use client';
import Link from 'next/link';
import {useAdminSession} from '@/features/membership/admin-session';
import {ConsoleHero} from './shared';
import {AdminRoleBadge} from './role-badge';
import {adminLinks,domains} from './model';
import css from './console.module.css';

const responsibilities:Record<string,{text:string;paths:string[]}>= {
 overview:{text:'Theo dõi số liệu vận hành thật và hỏi trợ lý điều hành theo phạm vi dữ liệu được giao.',paths:['/admin','/admin/tro-ly']},
 content:{text:'Soạn bài, sửa bản nháp, xuất bản/gỡ xuất bản, thùng rác, khôi phục và lịch sử phiên bản Tạp Chí.',paths:['/admin/articles']},
 members:{text:'Tra cứu hồ sơ vận hành, cấp/thu hồi Chuyên gia, liên hệ riêng; Owner khóa/mở khóa và thu hồi phiên.',paths:['/admin/members']},
 library:{text:'Quản lý sách và tài liệu, tệp riêng, phạm vi Free/đăng nhập/Pro, duyệt và xuất bản theo quy trình.',paths:['/admin/books','/admin/van-kho']},
 community:{text:'Kiểm duyệt bài/bình luận, xử lý báo cáo cộng đồng và những tin nhắn được người tham gia báo cáo.',paths:['/admin/forum','/admin/community']},
 ranks:{text:'Cấp/thay đổi hoặc thu hồi 18 cảnh giới; xét minh chứng Tinh Văn và giữ lịch sử quyết định.',paths:['/admin/tinh-canh']},
 finance:{text:'Tặng/thu hồi Pro, quản lý đơn và gói, QR ngân hàng, đối soát, nội dung khóa và tư vấn riêng.',paths:['/admin/finance','/admin?panel=plans','/admin?panel=orders','/admin/access','/admin?panel=consultations']},
 ai:{text:'Cấu hình dịch vụ luận giải, mô hình và ngân sách theo chức năng hiện có. Thiếu cấu hình sẽ báo rõ.',paths:['/admin/huyen-giai']},
 portal:{text:'Biên tập hướng dẫn và chính sách; giữ quy trình duyệt riêng trước khi công khai.',paths:['/admin/huong-dan']},
 audit:{text:'Tra cứu nhật ký thao tác, người thực hiện, đối tượng, lý do và thời điểm để kiểm tra lại quyết định.',paths:['/admin/audit']},
};
export function AdminAuthority(){
 const {access,identity,capabilities,mfa,reverify}=useAdminSession();
 return <div className={css.page}>
  <ConsoleHero eyebrow="KIỂM SOÁT · QUYỀN HẠN" title="Quyền & chức năng quản trị" description={access.isOwner?'Bạn là Chủ hệ thống: vai trò cao nhất, có đầy đủ phạm vi quản trị hiện hành và quyền phân công đội ngũ.':'Đây là phạm vi công việc Chủ hệ thống đã giao cho tài khoản của bạn. Chức năng và dữ liệu luôn được kiểm quyền tại máy chủ.'}>
   <AdminRoleBadge identity={identity} size={106}/>
  </ConsoleHero>
  <section className={css.card} aria-label="Trạng thái quyền quản trị">
   <h2>{access.isOwner?'Chủ hệ thống · Quyền cao nhất':'Quản trị viên · Quyền được phân công'}</h2>
   <p>{capabilities.length} quyền thao tác/xem đang được máy chủ xác nhận · {domains.filter(([key])=>capabilities.includes(key+'.read')).length}/{domains.length} phân hệ có quyền xem.</p>
   <p>{mfa.stepUp?'MFA gần đây còn hiệu lực cho thao tác nhạy cảm.':'Xác minh MFA lại trước khi thực hiện thao tác nhạy cảm.'}</p>
   <div className={css.actions}><button onClick={reverify}>Xác minh MFA</button>{access.isOwner&&<Link className={css.button} href="/admin/team">Phân quyền đội ngũ</Link>}<Link className={css.button} href="/admin/profile">Tùy chỉnh huy hiệu quản trị</Link></div>
  </section>
  <div className={css.authorityGrid} aria-label="Các phân hệ quản trị">
   {domains.map(([key,title])=>{const read=capabilities.includes(key+'.read'),write=capabilities.includes(key+'.write'),info=responsibilities[key];return <section className={css.card} key={key} data-admin-domain={key}>
    <span className={css.pill}>{!read?'Chưa được cấp quyền':write?'Được xem & thao tác':'Được xem'}</span><h2>{title}</h2><p>{info.text}</p>
    {key==='content'&&read&&<p>Xuất bản: {capabilities.includes('content.publish')?'được cấp':'chưa được cấp'} · Xóa/khôi phục: {capabilities.includes('content.delete')?'được cấp':'chưa được cấp'}.</p>}
    {read&&<div className={css.actions}>{info.paths.map(path=>{const link=adminLinks.find(l=>l.href===path);return link?<Link className={css.button} key={path} href={path}>{link.label} ↗</Link>:null;})}</div>}
   </section>;})}
  </div>
  <section className={css.card}><h2>Quyền riêng của Chủ hệ thống</h2><p>Phân công/thu hồi quyền quản trị; khóa/mở khóa tài khoản; thu hồi phiên; sửa gói dịch vụ và thu hồi quyền Pro. Các chức năng này vẫn kiểm vai trò Owner dù tài khoản Admin được cấp mọi phân hệ.</p><p>Nhật ký và lý do thao tác được giữ lại. MFA, xác minh giao dịch, phê duyệt độc lập khi hoàn tiền và duyệt chính sách vẫn áp dụng với Owner.</p><p>Hộp thư quản trị dùng để liên hệ với thành viên; tin nhắn riêng của người khác chỉ được xem trong phạm vi báo cáo mà người tham gia gửi.</p></section>
 </div>;
}
