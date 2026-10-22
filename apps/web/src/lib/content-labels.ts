/** Presentation only: API filter values and stored subject IDs stay unchanged. */
const subjects:Record<string,string>={
 'nhap-mon':'Nhập môn','tu-vi':'Tử Vi','bat-tu':'Bát Tự','mai-hoa':'Mai Hoa',
 'luc-hao':'Lục Hào','ky-mon':'Kỳ Môn','kinh-dich':'Kinh Dịch','phong-thuy':'Phong thủy',
 'lich-phap':'Lịch pháp','chiem-tinh':'Chiêm tinh','tarot':'Tarot','than-so-hoc':'Thần số học',
 'truong-phai':'Trường phái','doi-chieu':'Đối chiếu','thuc-hanh':'Thực hành',
 'nghien-cuu':'Nghiên cứu','khac':'Khác',
};
export function subjectLabel(id:string){return subjects[id]||id}
