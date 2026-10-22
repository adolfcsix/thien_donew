'use client';
import {useEffect,useState} from 'react';
import {api} from '@/lib/api';
import styles from './membership.module.css';
type Bank={bankBin:string;accountNumber:string;accountName:string;instructions:string};
export default function BankPaymentInfo(){
 const [bank,setBank]=useState<Bank|null>(null);
 useEffect(()=>{let alive=true;api<{enabled:boolean;bank:Bank|null}>('/api/billing/bank-instructions').then(r=>{if(alive)setBank(r.enabled?r.bank:null);}).catch(()=>{});return()=>{alive=false;};},[]);
 if(!bank)return null;
 const valid=/^[0-9]{6,8}$/.test(bank.bankBin)&&/^[0-9]{6,30}$/.test(bank.accountNumber);
 const qrUrl=valid?`https://img.vietqr.io/image/${bank.bankBin}-${bank.accountNumber}-compact2.png?accountName=${encodeURIComponent(bank.accountName)}`:'';
 return <section className={styles.card} style={{marginTop:20}}><h2>Thông tin ngân hàng — tham khảo</h2><p><strong>Không chuyển tiền cho gói Pro qua QR thủ công.</strong> Gói Pro và tư vấn chỉ được ghi nhận tự động qua trang thanh toán PayOS. Thông tin dưới đây dành cho trường hợp bộ phận hỗ trợ hướng dẫn riêng.</p><p>Ngân hàng BIN: {bank.bankBin}<br/>Số tài khoản: <strong>{bank.accountNumber}</strong><br/>Người nhận: {bank.accountName}</p>{qrUrl&&<><p className={styles.muted}>Ảnh QR do dịch vụ VietQR bên ngoài cung cấp; có thể không khả dụng khi dịch vụ gián đoạn.</p><img src={qrUrl} referrerPolicy="no-referrer" width={230} height={280} alt="Mã QR chuyển khoản tham khảo, không tự xác nhận thanh toán" style={{maxWidth:'100%',height:'auto'}} loading="lazy"/></>}{bank.instructions&&<p>{bank.instructions}</p>}</section>;
}
