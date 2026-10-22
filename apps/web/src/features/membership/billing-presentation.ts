const vnd=new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0});
export const formatVnd=(value:string|number)=>vnd.format(Number(value));
export const paymentStateNames:Record<string,string>={
 creating:'Đang tạo thanh toán',pending:'Chờ thanh toán',paid:'Đã thanh toán',
 failed:'Cần đối soát',cancelled:'Đã hủy',refunded:'Đã ghi nhận hoàn tiền',
};
