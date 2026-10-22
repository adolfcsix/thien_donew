import Link from 'next/link';
import {StarSystemMatrix} from '@/features/chart/components/star-system-matrix';
import {StarStemStudy} from '@/features/chart/components/star-stem-study';
export default function StarSystemPage(){return <div><header><span className="eyebrow">THIÊN ĐỒ / TỬ VI</span><h1 className="serif">Hệ thống sao và các lớp thời gian</h1><p>Tra cứu riêng chính tinh, phụ tinh, ba vòng sao và lưu tinh. Quan hệ tên gọi, nguồn quy tắc và lớp năm được giữ rõ khi đối chiếu.</p><Link href="/chart">Lập lá số để xem vị trí ↗</Link> · <Link href="/research/star-audit">Hồ sơ nguồn và dị bản ↗</Link></header><StarSystemMatrix/><StarStemStudy/></div>;}
