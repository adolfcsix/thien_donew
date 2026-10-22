'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const cards=require('../packages/knowledge/src/tarot-rws-78.json').cards;
const config=require('../apps/web/src/features/tarot/tarot-artwork-local.json');
const script=fs.readFileSync(path.join(root,'infrastructure/scripts/install-tarot-rws-images.mjs'),'utf8');
const helper=fs.readFileSync(path.join(root,'apps/web/src/features/tarot/tarot-artwork.ts'),'utf8');
const tarot=fs.readFileSync(path.join(root,'apps/web/src/app/tarot/page.tsx'),'utf8');
const spread=fs.readFileSync(path.join(root,'apps/web/src/features/tarot/spread-layout.tsx'),'utf8');
test('original RWS 1909: all 78 unique filenames and correct source deck mapping',()=>{
 assert.equal(cards.length,78);const seen=new Set();
 const prefix={major:'ar',wands:'wa',cups:'cu',swords:'sw',pentacles:'pe'};
 for(const card of cards){const parts=card.id.match(/^(major|wands|cups|swords|pentacles)-(\d{2})$/);assert.ok(parts,card.id);const code=`${prefix[parts[1]]}${parts[2]}.jpg`;assert.ok(!seen.has(code),code);seen.add(code);assert.equal(card.number,+parts[2]);}
 assert.equal(seen.size,78);assert.ok(seen.has('ar00.jpg'));assert.ok(seen.has('ar21.jpg'));assert.ok(seen.has('wa14.jpg'));assert.ok(seen.has('cu14.jpg'));assert.ok(seen.has('sw14.jpg'));assert.ok(seen.has('pe14.jpg'));
});
test('Tarot artwork appears in reading, catalogue and spread map, with true reverse rotation',()=>{
 assert.match(tarot,/src=\{tarotArtworkSrc\(card.id,deck\)\}/);
 assert.match(tarot,/className=\{styles.catalogThumb\}/);
 assert.match(spread,/src=\{tarotArtworkSrc\(result.positions\[i\].card.id,deck\)\}/);
 const cardCss=fs.readFileSync(path.join(root,'apps/web/src/app/tarot/tarot.module.css'),'utf8');
 assert.match(cardCss,/\.cardFace\.reversed\{transform:rotate\(180deg\)\}/);
 assert.match(cardCss,/object-fit:contain/);
 assert.match(helper,/raw\.githubusercontent\.com\/sixseeds\/tarot-api\/master\/cards\//);
});

test('Tarot card frames use one consistent centred artwork box across reading, catalogue and spread map',()=>{
 const cardCss=fs.readFileSync(path.join(root,'apps/web/src/app/tarot/tarot.module.css'),'utf8');
 const spreadCss=fs.readFileSync(path.join(root,'apps/web/src/features/tarot/spread-layout.module.css'),'utf8');
 assert.match(cardCss,/\.artFigure \.cardFace\{[^}]*aspect-ratio:3\/5/);
 assert.match(cardCss,/\.cardArtwork\{[^}]*object-fit:contain/);
 assert.match(cardCss,/\.cardArtwork\{[^}]*object-position:center center/);
 assert.match(cardCss,/\.catalogCard \.catalogThumb\{[^}]*width:66px/);
 assert.match(spreadCss,/\.card \.mapArtwork\{[^}]*width:78px/);
 assert.match(spreadCss,/\.card \.mapArtwork\{[^}]*height:130px/);
});

test('offline image mode is enabled only after all 78 valid JPEG files downloaded',()=>{
 assert.equal(config.images,78);assert.equal(typeof config.ready,'boolean');
 assert.match(script,/names\.length!==78\|\|new Set\(names\)\.size!==78/);
 assert.match(script,/raw\[0\]!==255\|\|raw\[1\]!==216/);
 assert.match(script,/ready:false/);assert.match(script,/ready:true/);
 if(config.ready){const dir=path.join(root,'apps/web/public/tarot/rws-1909');assert.equal(fs.readdirSync(dir).filter(f=>f.endsWith('.jpg')).length,78);}
});
