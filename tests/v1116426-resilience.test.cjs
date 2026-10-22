'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
test('CI runtime logs live outside the distributable source and are retained only for failure inspection',()=>{
 const ci=read('infrastructure/scripts/run-ci-http.sh');
 assert.match(ci,/mktemp -d/);
 assert.match(ci,/> "\$log_dir\/api-ci\.log" 2>&1/);
 assert.match(ci,/> "\$log_dir\/web-ci\.log" 2>&1/);
 assert.doesNotMatch(ci,/> api-ci\.log 2>&1|> web-ci\.log 2>&1/);
});
test('Tarot artwork tries trusted sources and ends at stable inline fallback without swapping card identity',()=>{
 const helper=read('apps/web/src/features/tarot/tarot-artwork.ts');
 const page=read('apps/web/src/app/tarot/page.tsx');
 const spread=read('apps/web/src/features/tarot/spread-layout.tsx');
 assert.match(helper,/dataset\.tarotFallback='alternate'/);
 assert.match(helper,/dataset\.tarotFallback='placeholder'/);
 assert.match(helper,/if\(!step\)/);
 assert.match(helper,/data:image\/svg\+xml/);
 assert.doesNotMatch(helper,/tarotArtworkSrc\(id,'rws-1909'\)/);
 assert.match(helper,/tarotArtworkFilename\(id\)/);
 assert.match(page,/<img key=\{`\$\{deck\}:\$\{card.id\}`\} className=\{styles.cardArtwork\}/);
 assert.match(spread,/<img key=\{`\$\{deck\}:\$\{result.positions\[i\]\.card.id\}`\}/);
 assert.equal((page.match(/onError=\{event=>recoverTarotArtwork\(event,card.id,deck\)\}/g)||[]).length,1);
 assert.equal((page.match(/onError=\{event=>recoverTarotThumbnail\(event,card.id,deck\)\}/g)||[]).length,1);
 assert.match(helper,/dataset\.tarotThumbnailRetry='full'/);
 assert.match(helper,/event\.currentTarget\.src=tarotArtworkSrc\(id,deck\)/);
 assert.match(spread,/onError=\{event=>recoverTarotArtwork\(event,result.positions\[i\].card.id,deck\)\}/);
});
