export type AdminIdentity={role:'admin'|'owner';badgeStyle:'gate'|'orbit'|'seal';badgeTone:'gold'|'jade'|'azure';motto:string;showcaseLevels?:number[]};
export const domains=[['overview','Tổng quan'],['content','Tạp chí & bài viết'],['members','Thành viên'],['library','Sách & Văn Khố'],['community','Cộng đồng'],['ranks','Huy hiệu & Tinh Văn'],['finance','Tài chính & Pro'],['ai','Huyền Giải AI'],['portal','Hướng dẫn & chính sách'],['audit','Nhật ký']] as const;
export const adminLinks=[
 {href:'/admin',label:'Bàn điều hành',group:'ĐIỀU HÀNH',cap:null,symbol:'◈'},
 {href:'/admin/authority',label:'Quyền & chức năng',group:'ĐIỀU HÀNH',cap:null,symbol:'♜'},
 {href:'/admin/members',label:'Thành viên',group:'ĐIỀU HÀNH',cap:'members.read',symbol:'◎'},
 {href:'/admin/team',label:'Đội ngũ & phân quyền',group:'ĐIỀU HÀNH',cap:'owner',symbol:'♜'},
 {href:'/admin/articles',label:'Tạp chí & bài viết',group:'NỘI DUNG',cap:'content.read',symbol:'▤'},
 {href:'/admin/books',label:'Tàng Thư Các',group:'NỘI DUNG',cap:'library.read',symbol:'▥'},
 {href:'/admin/van-kho',label:'Văn Khố',group:'NỘI DUNG',cap:'library.read',symbol:'▧'},
 {href:'/admin/forum',label:'Kiểm duyệt cộng đồng',group:'NỘI DUNG',cap:'community.read',symbol:'☷'},
 {href:'/admin/tinh-canh',label:'Huy hiệu & Tinh Văn',group:'VẬN HÀNH',cap:'ranks.read',symbol:'✧'},
 {href:'/admin/finance',label:'Tài chính & đối soát',group:'VẬN HÀNH',cap:'finance.read',symbol:'◇'},
 {href:'/admin?panel=plans',label:'Gói Pro & hỗ trợ',group:'VẬN HÀNH',cap:'finance.read',symbol:'⊕'},
 {href:'/admin?panel=orders',label:'Đơn hàng & quyền Pro',group:'VẬN HÀNH',cap:'finance.read',symbol:'▤'},
 {href:'/admin?panel=consultations',label:'Tư vấn riêng',group:'VẬN HÀNH',cap:'finance.read',symbol:'⌘'},
 {href:'/admin/huyen-giai',label:'Cấu hình Huyền Giải',group:'VẬN HÀNH',cap:'ai.read',symbol:'✺'},
 {href:'/admin/tro-ly',label:'Trợ lý điều hành AI',group:'VẬN HÀNH',cap:'overview.read',symbol:'✦'},
 {href:'/admin/community',label:'Báo cáo tin nhắn',group:'VẬN HÀNH',cap:'community.read',symbol:'✉'},
 {href:'/admin/access',label:'Nội dung Pro & khóa',group:'VẬN HÀNH',cap:'finance.read',symbol:'◇'},
 {href:'/admin/audit',label:'Nhật ký quản trị',group:'HỆ THỐNG',cap:'audit.read',symbol:'◷'},
 {href:'/admin/messages',label:'Hộp thư quản trị',group:'HỆ THỐNG',cap:null,symbol:'✉'},
 {href:'/admin/profile',label:'Hồ sơ quản trị',group:'HỆ THỐNG',cap:null,symbol:'天'},
 {href:'/admin/huong-dan',label:'Hướng dẫn & chính sách',group:'TRỢ GIÚP',cap:'portal.read',symbol:'▱'},
];
/** Query-based workspaces have their own title, permission and active menu item. */
export function resolveAdminLink(pathname:string,search:string){
 const panel=new URLSearchParams(search).get('panel');
 return adminLinks.find(link=>link.href===pathname+(panel?'?panel='+encodeURIComponent(panel):''))||adminLinks.find(link=>link.href===pathname);
}
export function parseWorkspace(value:unknown):{identity:AdminIdentity;capabilities:string[]}{
 const v=value as {identity?:AdminIdentity;capabilities?:unknown};const i=v?.identity;
 if(!i||!['admin','owner'].includes(i.role)||!['gate','orbit','seal'].includes(i.badgeStyle)||!['gold','jade','azure'].includes(i.badgeTone)||typeof i.motto!=='string'||!Array.isArray(v.capabilities)||!v.capabilities.every(c=>typeof c==='string'))throw Error('Phản hồi không gian quản trị không hợp lệ');
 const levels=i.showcaseLevels??[];if(!Array.isArray(levels)||levels.length>18||levels.some(n=>!Number.isInteger(n)||n<1||n>18)||new Set(levels).size!==levels.length)throw Error('Bộ huy hiệu quản trị không hợp lệ');
 return {identity:i,capabilities:v.capabilities};
}
