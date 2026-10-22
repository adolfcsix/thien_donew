'use strict';
/** Documentary crosswalks, not divination algorithms.  Jewish Kabbalah != Hermetic Qabalah. */
const {CARDS}=require('./tarot-rws.cjs');
const SEFIROT=Object.freeze([
 ['Keter','כתר','Vương miện'],['Chokhmah','חכמה','Minh triết'],['Binah','בינה','Thấu hiểu'],
 ['Chesed','חסד','Nhân từ'],['Gevurah','גבורה','Nghiêm lực'],['Tiferet','תפארת','Hài hòa'],
 ['Netzach','נצח','Bền vững'],['Hod','הוד','Huy hoàng'],['Yesod','יסוד','Nền tảng'],['Malkhut','מלכות','Vương quốc']
].map(([name,hebrew,gloss],i)=>Object.freeze({id:i+1,name,hebrew,gloss})));
const LETTERS='אבגדהוזחטיכלמנסעפצקרשת'.split('');
const LETTER_NAMES=['Aleph','Bet','Gimel','Dalet','He','Vav','Zayin','Het','Tet','Yod','Kaf','Lamed','Mem','Nun','Samekh','Ayin','Pe','Tsadi','Qof','Resh','Shin','Tav'];
const LETTER_VALUES=[1,2,3,4,5,6,7,8,9,10,20,30,40,50,60,70,80,90,100,200,300,400];
const PATHS_PAIRS=[[1,2],[1,3],[1,6],[2,3],[2,6],[2,4],[3,6],[3,5],[4,5],[4,6],[4,7],[5,6],[5,8],[6,7],[6,9],[6,8],[7,8],[7,9],[7,10],[8,9],[8,10],[9,10]];
const PATHS=Object.freeze(LETTERS.map((hebrew,i)=>Object.freeze({id:11+i,letter:hebrew,letterName:LETTER_NAMES[i],gematria:LETTER_VALUES[i],from:PATHS_PAIRS[i][0],to:PATHS_PAIRS[i][1],rwsCardId:`major-${String(i).padStart(2,'0')}`,tradition:'hermetic-golden-dawn-kircher-v1'})));
const DECKS=Object.freeze([
 {id:'rws-1909',name:'Rider–Waite–Smith',period:'1909',origin:'Anh',system:'RWS · 22 Ẩn chính / 56 Ẩn phụ',artStatus:'Có minh họa 78 lá RWS từ nguồn ảnh công khai; có thể tải về lưu nội bộ, ảnh không luôn có sẵn khi ngoại tuyến.',status:'reading-engine-existing'},
 {id:'marseille-pattern',name:'Tarot de Marseille',period:'Thế kỷ XVII–XVIII, nhiều truyền bản',origin:'Pháp và Bắc Ý',system:'Pip cards · Strength XI, Justice VIII',artStatus:'Không mặc định ảnh từ bất kỳ bản in nào; từng ấn bản cần xác minh quyền sử dụng.',status:'comparative-atlas-only'},
 {id:'thoth-1943',name:'Thoth (Crowley–Harris)',period:'Hoàn thành tranh 1943; ấn hành về sau',origin:'Anh',system:'Thelema · Lust XI, Adjustment VIII; court và suits riêng',artStatus:'Không phân phối hình tranh Thoth có bản quyền.',status:'comparative-atlas-only'}
].map(x=>Object.freeze(x)));
const MARSEILLE_MAJOR={8:'Justice',11:'La Force (Strength)',13:'L’Arcane sans nom (XIII)'};
const THOTH_MAJOR={1:'The Magus',2:'The Priestess',8:'Adjustment',10:'Fortune',11:'Lust',14:'Art',20:'The Aeon',21:'The Universe'};
const SUITS={wands:['Bâtons','Wands'],cups:['Coupes','Cups'],swords:['Épées','Swords'],pentacles:['Deniers','Disks']};
const RWS_COURT={11:'Page',12:'Knight',13:'Queen',14:'King'};
const MARSEILLE_COURT={11:'Valet',12:'Cavalier',13:'Reine',14:'Roi'};
const THOTH_COURT={11:'Princess',12:'Prince',13:'Queen',14:'Knight'};
function getDeck(id){const d=DECKS.find(x=>x.id===id);if(!d)throw Error('Chưa hỗ trợ hệ Tarot này.');return d;}
function compareCard(cardId){
 if(typeof cardId!=='string'||cardId.length>30)throw Error('Mã lá Tarot không hợp lệ.');
 const c=CARDS.find(x=>x.id===cardId);if(!c)throw Error('Không có lá Tarot tương ứng.');
 const major=c.arcana==='major';
 return {id:c.id,rws:{name:c.name,number:c.number},marseille:{number:c.number,name:major?(MARSEILLE_MAJOR[c.number]||c.name):c.number>=11?`${MARSEILLE_COURT[c.number]} de ${SUITS[c.suit][0]}`:`${c.number} de ${SUITS[c.suit][0]}`},
 thoth:{number:c.number,name:major?(THOTH_MAJOR[c.number]||c.name):c.number>=11?`${THOTH_COURT[c.number]} of ${SUITS[c.suit][1]}`:`${c.number} of ${SUITS[c.suit][1]}`},
 comparisonOnly:!major&&c.number>=11,
 caveat:major?'Tên và số thứ tự có thể khác nhau; không đồng nhất toàn bộ biểu tượng.':c.number>=11?'Court cards không được mặc định là cùng phẩm vị/chức năng giữa các truyền thống.':'Trùng số lượng không đồng nghĩa trùng minh họa hay ý nghĩa.'};
}
function getCorrespondence(cardId,system='golden-dawn'){
 if(!['golden-dawn','crowley-thoth','jewish-source-only'].includes(system))throw Error('Hệ đối chiếu không hợp lệ.');
 if(typeof cardId!=='string'||!/^major-(0\d|1\d|2[01])$/.test(cardId))throw Error('Chỉ nhận mã 22 Ẩn chính.');
 if(system==='jewish-source-only')return {system,cardId,connected:false,reason:'Kabbalah Do Thái truyền thống không gán Tarot vào hệ Sephirot theo bảng Golden Dawn.'};
 const ix=Number(cardId.slice(6));const pathIndex=system==='crowley-thoth'?(ix===4?17:ix===17?4:ix):ix;
 return {system,cardId,path:PATHS[pathIndex],connected:true,
  warning:system==='crowley-thoth'?'Biến thể Heh/Tzaddi theo Crowley: nghiên cứu riêng, không mặc định đường nối và hệ quy chiếu giống Golden Dawn.':'Tương ứng Golden Dawn cuối thế kỷ XIX; không phải cách diễn giải bắt buộc của Kabbalah Do Thái.'};
}
const SYMBOL_LAYERS=Object.freeze([
 {id:'hebrew',label:'Chữ Hebrew',tradition:'Jewish-language',examples:['Aleph א','Bet ב','Shin ש'],boundary:'Bảng chữ và giá trị số; việc gán Tarot là lớp Hermetic về sau.'},
 {id:'tree',label:'Cây Sự Sống',tradition:'Jewish-kabbalistic-and-later-hermetic-diagrams',examples:['10 Sephirot','các sơ đồ đường nối khác nhau'],boundary:'Không có một cách đánh số 22 đường duy nhất xuyên mọi truyền thống.'},
 {id:'tarot-rws',label:'Tarot RWS',tradition:'rws-1909',examples:['Strength VIII','Justice XI'],boundary:'RWS có hệ tranh Ẩn phụ riêng, khác Marseille.'},
 {id:'tarot-marseille',label:'Tarot Marseille',tradition:'marseille-pattern',examples:['Justice VIII','La Force XI','Pip minors'],boundary:'Có nhiều họ bản in; không gán cùng bộ nghĩa RWS.'},
 {id:'tarot-thoth',label:'Tarot Thoth',tradition:'thelemic-thoth',examples:['Adjustment VIII','Lust XI','Disks'],boundary:'Không sao chép tranh hiện đại hoặc mặc định tương đương bài Court.'},
 {id:'astrological',label:'Biểu tượng thiên văn/chiêm tinh',tradition:'western-astrology',examples:['Mặt Trời ☉','Mặt Trăng ☽','Sao Kim ♀'],boundary:'Đặt tầng biểu tượng cạnh phép đo thiên văn; không đồng nhất với dữ kiện khoa học.'},
 {id:'alchemy',label:'Biểu tượng giả kim',tradition:'historical-alchemy',examples:['Sulfur','Mercury','Salt'],boundary:'Không xây dựng phép tiên đoán hay hiệu quả hóa học từ nhãn biểu tượng.'},
 ].map(x=>Object.freeze(x)));
module.exports={SEFIROT,PATHS,DECKS,SYMBOL_LAYERS,getDeck,compareCard,getCorrespondence};
