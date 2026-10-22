'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');const {join}=require('node:path');
const root=join(__dirname,'..');
const docker=readFileSync(join(root,'infrastructure/production/Dockerfile'),'utf8');
const next=readFileSync(join(root,'apps/web/next.config.ts'),'utf8');
const compose=readFileSync(join(root,'infrastructure/production/compose.production.yaml'),'utf8');
test('Next standalone runtime image includes server output AND browser JS/CSS static assets',()=>{
 assert.match(docker,/COPY --from=build[^\n]*\/app\/apps\/web\/\.next\/standalone\s+\.\//);
 assert.match(docker,/COPY --from=build[^\n]*\/app\/apps\/web\/\.next\/static\s+\.\/apps\/web\/\.next\/static/);
 assert.match(next,/output:\s*'standalone'/);
});
test('Docker compile-time API rewrite targets Compose service DNS, not web-container localhost',()=>{
 assert.match(docker,/ENV[^\n]*API_INTERNAL_URL=http:\/\/api:8080/);
 assert.match(next,/process\.env\.API_INTERNAL_URL/);
 assert.match(compose,/^  api:/m);
 assert.match(compose,/^  web:/m);
});

test('production CI checks the real final Docker image instead of only local .next artifacts',()=>{
 const flow=readFileSync(join(root,'.github/workflows/production-acceptance.yml'),'utf8');
 assert.match(flow,/immutable-web-image-layout:/);
 assert.match(flow,/docker build --target web/);
 assert.match(flow,/docker run --rm --entrypoint \/bin\/sh thiendo-web-layout-test/);
 assert.match(flow,/test -d \/app\/apps\/web\/\.next\/static/);
});
