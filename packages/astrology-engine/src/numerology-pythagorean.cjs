'use strict';
// Independent symbolic arithmetic: no Can Chi, lunar calendar or Tu Vi logic.
const METHOD='pythagorean-segmented-v1';
const SOURCES=Object.freeze([
 {title:'Hans Decoz — How to Do Your Own Numerology Reading',url:'https://www.worldnumerology.com/do-your-own-reading/'},
 {title:'Numerology.com — Life Path calculation',url:'https://www.numerology.com/articles/your-numerology-chart/life-path-number-meanings/'},
]);
function reduction(n,masters=true){
 if(!Number.isSafeInteger(n)||n<0)throw RangeError('Tổng số không hợp lệ');
 const steps=[n];while(n>9&&!(masters&&[11,22,33].includes(n))){n=[...String(n)].reduce((a,c)=>a+Number(c),0);steps.push(n);}
 return {value:n,steps};
}
function normalizeName(name){
 if(typeof name!=='string'||!name.trim()||name.length>100)throw Error('Họ tên cần 1–100 ký tự.');
 const latin=name.normalize('NFD').replace(/\p{M}/gu,'').replace(/[đĐ]/g,'D').toUpperCase();
 if(!/^[A-Z\s'’\-]+$/.test(latin)||!/[A-Z]/.test(latin))throw Error('Chỉ hỗ trợ tên chữ Latin; hãy nhập cách chuyển tự đã chọn, không tự bỏ ký tự ngoài bảng.');
 return latin.replace(/['’\-\s]+/g,' ').trim();
}
function validateInput(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Đầu vào không hợp lệ.');
 if(raw.method!==METHOD)throw Error('Phương pháp chưa được hỗ trợ.');
 const name=typeof raw.name==='string'?raw.name.trim():raw.name;normalizeName(name);
 if(typeof raw.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(raw.date)||!Number.isFinite(Date.parse(raw.date+'T00:00:00Z'))||new Date(raw.date+'T00:00:00Z').toISOString().slice(0,10)!==raw.date||+raw.date.slice(0,4)<1900||+raw.date.slice(0,4)>2100)throw Error('Ngày sinh dương lịch cần hợp lệ trong 1900–2100.');
 if(!Number.isInteger(raw.year)||raw.year<1900||raw.year>2100||raw.year<+raw.date.slice(0,4))throw Error('Năm xem cần từ năm sinh đến 2100.');
 if(!['vowel','consonant'].includes(raw.yMode)||typeof raw.masters!=='boolean')throw Error('Cần chọn quy ước Y và số chủ.');
 return {method:METHOD,name,date:raw.date,year:raw.year,yMode:raw.yMode,masters:raw.masters};
}
function calculate(raw){
 const input=validateInput(raw),normalizedName=normalizeName(input.name),master=input.masters;
 const [year,month,day]=input.date.split('-').map(Number);
 const dateParts=[month,day,year].map(n=>reduction(n,master));
 const lifePath={...reduction(dateParts.reduce((sum,p)=>sum+p.value,0),master),parts:dateParts};
 const letters=[...normalizedName].filter(c=>/[A-Z]/.test(c)).map(letter=>({letter,value:(letter.charCodeAt(0)-65)%9+1,vowel:'AEIOU'.includes(letter)||(letter==='Y'&&input.yMode==='vowel')}));
 function nameNumber(type){
  const parts=normalizedName.split(' ').map(word=>{const items=[...word].filter(c=>type==='all'||(type==='vowels'?('AEIOU'.includes(c)||c==='Y'&&input.yMode==='vowel'):!('AEIOU'.includes(c)||c==='Y'&&input.yMode==='vowel')));return {word,letters:items.join(''),...reduction(items.reduce((sum,c)=>sum+(c.charCodeAt(0)-65)%9+1,0),master)};});
  if(parts.every(p=>!p.letters))return null;
  return {...reduction(parts.reduce((sum,p)=>sum+p.value,0),master),parts};
 }
 const expression=nameNumber('all'),soulUrge=nameNumber('vowels'),personality=nameNumber('consonants');
 const personalYears=Array.from({length:Math.min(9,2101-input.year)},(_,i)=>({year:input.year+i,...reduction(month+day+input.year+i,false)}));
 const digitCounts=Object.fromEntries(Array.from({length:9},(_,i)=>[String(i+1),0]));
 for(const digit of input.date.replace(/-/g,''))if(digit!=='0')digitCounts[digit]++;
 const m=dateParts[0].value,d=dateParts[1].value,y=dateParts[2].value;
 const first=reduction(m+d,master),second=reduction(d+y,master);
 const boundary=36-reduction(lifePath.value,false).value;
 const pinnacles=[first,second,reduction(first.value+second.value,master),reduction(m+y,master)].map((r,i)=>({...r,fromAge:i===0?0:boundary+(i-1)*9,toAgeExclusive:i===3?null:boundary+i*9}));
 const small=[month,day,year].map(n=>reduction(n,false).value),c1=Math.abs(small[0]-small[1]),c2=Math.abs(small[1]-small[2]);
 return {input,normalizedName,letters,lifePath,expression,soulUrge,personality,birthday:day,personalYears,digitCounts,pinnacles,challenges:[c1,c2,Math.abs(c1-c2),Math.abs(small[0]-small[2])],sources:SOURCES};
}
module.exports={METHOD,SOURCES,reduction,normalizeName,validateInput,calculate};
