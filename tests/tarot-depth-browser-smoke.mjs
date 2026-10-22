/** Built Next, existing snapshot importer and actual learning modules. Auth stub only. */
import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import {mkdirSync} from 'node:fs';import {join} from 'node:path';
import {localTestOrigin} from '../infrastructure/scripts/e2e-http.mjs';
import E from '../packages/astrology-engine/src/tarot-rws.cjs';import D from '../packages/interpretation/src/tarot-depth.cjs';
const origin=localTestOrigin(process.env.NEXT_BASE_URL||'http://127.0.0.1:3000');
const {chromium}=await import(process.env.THIENDO_PLAYWRIGHT_MODULE?pathToFileURL(process.env.THIENDO_PLAYWRIGHT_MODULE).href:'playwright');
const snapshot={version:1,deck:E.METHODS.deck,spread:'three',includeReversed:true,question:'PRIVATE-QUESTION-OMITTED',draw:[{id:'major-00',reversed:false},{id:'major-01',reversed:true},{id:'swords-13',reversed:false}]};
async function download(page,panel){const ev=page.waitForEvent('download');await panel.getByRole('button',{name:'Xuất luận sâu JSON',exact:true}).click();const stream=await(await ev).createReadStream();let raw='';for await(const c of stream)raw+=c.toString();assert.ok(!raw.includes('PRIVATE-QUESTION-OMITTED'));return JSON.parse(raw);}
for(const width of [390,1440]){
 const browser=await chromium.launch({headless:true,...(process.env.THIENDO_CHROMIUM_PATH?{executablePath:process.env.THIENDO_CHROMIUM_PATH}:{}),...(process.env.THIENDO_CHROMIUM_ARGS_JSON?{args:JSON.parse(process.env.THIENDO_CHROMIUM_ARGS_JSON)}:{})});
 try{const context=await browser.newContext({viewport:{width,height:950}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await context.route('**/api/auth/me',r=>r.fulfill({json:{user:{id:'11111111-1111-4111-8111-111111111111',email:'tool-ui@example.invalid'}}}));await page.goto(origin+'/tarot');
 const cat=page.locator('[aria-label="Danh mục Tarot"]'),dossier=page.getByRole('region',{name:'Hồ sơ chuyên sâu lá Tarot',exact:true});await dossier.waitFor();
 for(const card of E.CARDS){await cat.getByRole('button',{name:card.nameVi+' '+card.name,exact:true}).click();await dossier.getByRole('heading',{name:card.nameVi+' · đọc sâu biểu tượng',exact:true}).waitFor();assert.equal(await dossier.getByRole('combobox').count(),1);}
 await page.getByLabel('Tìm lá bài').fill('cuon sach');await page.getByRole('status').filter({hasText:'Đang hiển thị 1 / 78'}).waitFor();await dossier.getByRole('heading',{name:'Nữ Tư Tế · đọc sâu biểu tượng',exact:true}).waitFor();await dossier.getByRole('combobox',{name:'Chiều lá trong hồ sơ Tarot',exact:true}).selectOption('reversed');await dossier.getByRole('heading',{name:'Các khả năng của chiều ngược',exact:true}).waitFor();
 for(const text of ['Nguyên tố và số học','Ba bối cảnh diễn giải','Tình huống thực hành','Lá để đối chiếu cùng','Nguồn và phương pháp'])await dossier.getByText(text,{exact:true}).click();assert.ok((await dossier.innerText()).includes('Moon'));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
 await page.getByLabel('Tìm lá bài').fill('NO-TAROT-CARD-XYZ');await page.getByText('Không tìm thấy lá bài phù hợp. Thử từ khóa khác hoặc chọn “Tất cả”.',{exact:true}).waitFor();assert.equal(await dossier.count(),0);await page.getByLabel('Tìm lá bài').fill('');
 const input=page.getByLabel('Chọn tệp JSON trải bài Tarot');const upload=s=>input.setInputFiles({name:'fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(E.createReadingExport(s)))});await upload(snapshot);
 const panel=page.getByRole('region',{name:'Diễn giải chuyên sâu trải Tarot',exact:true});await panel.getByRole('status').filter({hasText:'3 lá · 3 cặp'}).waitFor();
 for(const c of ['general','work','relationship','resources']){await panel.getByRole('combobox',{name:'Bối cảnh luận Tarot',exact:true}).selectOption(c);assert.deepEqual(await download(page,panel),D.studyTarotSnapshot(snapshot,{context:c}));}
 const box=await panel.boundingBox();assert.ok(box&&box.x>=-1&&box.x+box.width<=width+1,JSON.stringify(box));
 for(const details of await panel.locator('details').all())if(await details.getAttribute('open')===null)await details.locator('summary').first().click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
 if(process.env.THIENDO_UI_DEBUG_DIR){mkdirSync(process.env.THIENDO_UI_DEBUG_DIR,{recursive:true});await panel.screenshot({path:join(process.env.THIENDO_UI_DEBUG_DIR,`tarot-depth-${width}.png`)});}
 await upload({...snapshot,spread:'one',draw:[snapshot.draw[0]]});await panel.getByRole('status').filter({hasText:'1 lá · 0 cặp'}).waitFor();await panel.getByText('Một lá không có tổ hợp nội bộ. Không tự thêm lá hoặc rút lại để tạo cặp.',{exact:true}).waitFor();await page.getByLabel('Chủ đề muốn suy ngẫm').fill('changed');assert.equal(await panel.count(),0);assert.deepEqual(errors,[]);
 console.log(`PASS Tarot depth ${width}px: all 78 dossiers, deep unaccented search, reversal alternatives, 5 evidence sections, 4 contexts, 3 actual pairs, private-question-free export equality, 1-card zero pairs, invalidation and no overflow/errors`);
 }finally{await browser.close();}
}
