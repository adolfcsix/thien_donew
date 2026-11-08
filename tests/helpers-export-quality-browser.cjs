const assert=require('node:assert/strict');
module.exports=async({member,origin,record})=>{
 const page=await member.context.newPage();
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:950});await page.goto(origin+'/western-astrology');
  await page.getByRole('checkbox').first().check();await page.getByRole('button',{name:'Lập Natal Chart',exact:true}).click();await page.getByRole('heading',{name:'Kết quả Natal',exact:true}).waitFor();
  async function bytes(name){const event=page.waitForEvent('download');await page.getByRole('button',{name,exact:true}).click();const parts=[];for await(const p of await(await event).createReadStream())parts.push(p);return Buffer.concat(parts);}
  const svg=(await bytes('Xuất SVG đang xem')).toString();assert.match(svg,/width="1200"/);assert.match(svg,/height="1360"/);assert.ok(svg.includes('BẢN ĐỒ SAO NATAL'));assert.doesNotMatch(svg,/var\(--/);
  const png=await bytes('Xuất PNG bản đồ');assert.equal(png.readUInt32BE(16),2400);assert.equal(png.readUInt32BE(20),2720);
  const fs=require('node:fs');fs.writeFileSync('/tmp/thien-do-western-export.png',png);
  await page.goto(origin+'/tarot');await page.getByRole('button',{name:'✧ Xáo và rút bài',exact:true}).click();await page.getByRole('button',{name:'In / PDF trải bài',exact:true}).waitFor();
  const event=page.waitForEvent('popup');await page.getByRole('button',{name:'In / PDF trải bài',exact:true}).click();const print=await event;await print.waitForLoadState();
  assert.equal(await print.locator('article.card').count(),3);assert.equal(await print.locator('img').count(),3);
  await print.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
  assert.equal(await print.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  await print.emulateMedia({media:'print'});await print.pdf({path:`/tmp/thien-do-tarot-${width}.pdf`,format:'A4',printBackground:true});await print.screenshot({path:`/tmp/thien-do-tarot-print-${width}.png`,fullPage:true});await print.close();
  record({case:`designed Western SVG/PNG and Tarot print with decoded artwork ${width}px`,verdict:'PASS'});
 }
 await page.close();
};
