const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname, '..');
const checker = import(pathToFileURL(path.join(root, 'infrastructure/scripts/check-customization.mjs')).href);
test('beginner content configuration is complete and contains no unused typo keys', async () => {
  const {checkCustomization} = await checker;
  assert.deepEqual(checkCustomization(root), []);
});
test('beginner validator reports missing/blank copy and misspelled fields', async () => {
  const {validateCustomization} = await checker;
  const palettes = Array.from({length:6},()=>['#173f36','#c5a16a']);
  const errors = validateCustomization({headline:' ',headlin:'Oops'},palettes,['headline','note']);
  assert.equal(errors.length,3);
  assert.ok(errors.some(x=>x.includes('note')));
  assert.ok(errors.some(x=>x.includes('headlin.')));
});
test('medal palette validation rejects wrong count, CSS injection and malformed pairs', async () => {
  const {validateCustomization} = await checker;
  assert.equal(validateCustomization({title:'OK'},[],['title']).length,1);
  const palettes=Array.from({length:6},()=>['#173f36','#c5a16a']);
  palettes[2]=['red; color:black','#abcdef']; palettes[5]=['#123456'];
  assert.equal(validateCustomization({title:'OK'},palettes,['title']).length,2);
  assert.deepEqual(validateCustomization({title:'OK'},Array.from({length:6},()=>['#173F36','#abcdef']),['title']),[]);
});
