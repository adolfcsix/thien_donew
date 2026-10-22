'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {resolve} = require('node:path');
const {createRequire} = require('node:module');
const root = resolve(__dirname,'..');
const read = path => readFileSync(resolve(root,path),'utf8');
const moduleFile = read('apps/web/src/components/view-mode.tsx');
const shell = read('apps/web/src/components/shell.tsx');
const palace = read('apps/web/src/features/chart/components/palace-reading.tsx');
const css = read('apps/web/src/components/view-mode.module.css');
const pages = ['chart','bazi','iching','mai-hoa','luc-hao','ky-mon','phong-thuy','ngu-hanh','calendar','good-days'];
const ids = ['tu-vi','bat-tu','kinh-dich','mai-hoa','luc-hao','ky-mon','phong-thuy','ngu-hanh','lich-phap','chon-ngay'];

test('V11.84: a single typed view-mode provider restores the prior preference after hydration', () => {
  assert.match(moduleFile,/type ViewMode = 'basic' \| 'expert'/);
  assert.match(moduleFile,/VIEW_MODE_STORAGE_KEY = 'thiendo-view-mode'/);
  assert.match(moduleFile,/return value === 'expert' \? 'expert' : 'basic'/);
  assert.match(moduleFile,/useState<ViewMode>\('basic'\)/);
  assert.match(moduleFile,/useEffect\(\(\) => \{/);
  assert.match(moduleFile,/setRestored\(true\)/);
  assert.match(moduleFile,/if \(!restored\) return/);
  assert.match(moduleFile,/window\.localStorage\.setItem\(VIEW_MODE_STORAGE_KEY, mode\)/);
  assert.match(moduleFile,/catch \{/);
});
test('V11.84: shell and Tử Vi palace interpretation share the same state', () => {
  assert.match(shell,/<ViewModeProvider><Layout>/);
  assert.match(shell,/const \{mode: viewMode, setMode: setViewMode\} = useViewMode\(\)/);
  assert.match(shell,/data-mode=\{expert \? 'expert' : 'basic'\}/);
  assert.match(shell,/setViewMode\('basic'\)/);
  assert.match(shell,/setViewMode\('expert'\)/);
  assert.doesNotMatch(shell,/\bsetExpert\(/);
  assert.match(palace,/const \{mode, setMode\} = useViewMode\(\)/);
  assert.match(palace,/level = mode === 'expert' \? 'deep' : 'basic'/);
  assert.doesNotMatch(palace,/useState<'basic'\|'deep'>/);
});
test('V11.84: all ten real tools have a reading guide and a live subject-specific summary', () => {
  for (let i=0;i<pages.length;i++) {
    const source=read(`apps/web/src/app/${pages[i]}/page.tsx`);
    if (pages[i] === 'chart') {
      // V11.103 keeps the mode switch in Shell and moves chart methodology to an opt-in panel.
      assert.doesNotMatch(source,/ModeIntroduction discipline="tu-vi"/);
      assert.match(read('apps/web/src/features/chart/components/chart-result.tsx'),/chart-method-details/);
    } else {
      assert.match(source,new RegExp(`ModeIntroduction discipline="${ids[i]}"`),pages[i]);
      assert.match(source,/summary=\{/,`No data-bound context summary: ${pages[i]}`);
    }
  }
  for(const id of ids) assert.ok(moduleFile.includes(`'${id}': {title:`),id);
});
test('V11.84: expert evidence is available via keyboard button rather than silently disappearing', () => {
  assert.match(moduleFile,/aria-label=\{`Mở Chuyên sâu: \$\{title\}`\}/);
  assert.match(moduleFile,/type="button" onClick=\{\(\) => setMode\('expert'\)\}/);
  assert.match(moduleFile,/className=\{styles\.expertRegion\} hidden=\{mode !== 'expert'\}/);
  assert.match(css,/\.expertRegion\[hidden\]\{display:none!important\}/);
  assert.match(css,/\.expertRegion:not\(\[hidden\]\)\{display:contents\}/);
  assert.match(css,/focus-visible/);
});
test('V11.84: stateful Feng Shui floorplan remains mounted during mode changes', () => {
  assert.match(moduleFile,/Keep mounted stateful tools/);
  assert.doesNotMatch(moduleFile,/if \(mode === 'expert'\) return/);
  const source=read('apps/web/src/app/phong-thuy/page.tsx');
  assert.match(source,/<ExpertOnly title="Bát Trạch, Phi Tinh và phân khu chín cung"><FengShuiStudy orientationResult=\{result\}\/><\/ExpertOnly>/);
  assert.match(source,/orientation\(degrees\)/);
});
test('V11.84: Mai Hoa and Lục Hào keep the main quẻ/line input accessible in both modes', () => {
  const mai=read('apps/web/src/app/mai-hoa/page.tsx');
  const luc=read('apps/web/src/app/luc-hao/page.tsx');
  assert.ok(mai.indexOf('01 / ĐẦU VÀO')<mai.indexOf('<ExpertOnly title="Bảng Thể–Dụng'));
  assert.ok(luc.indexOf('01 / KHỞI HÀO')<luc.indexOf('<ExpertOnly title="Bát Cung'));
  assert.match(mai,/outcome\?makeDeepReading/);
  assert.match(luc,/makeNaJiaChart\(reading\.original/);
  assert.match(mai,/05 \/ SUY NGẪM/);
  assert.match(luc,/06 \/ GIỚI HẠN/);
});
test('V11.84: Kỳ Môn defaults to earth plate but unlocks hourly rotating evidence', () => {
  const source=read('apps/web/src/app/ky-mon/page.tsx');
  assert.match(source,/const isExpert = viewMode === 'expert'/);
  assert.match(source,/isExpert&&showHourPlate&&hourPlate/);
  assert.match(source,/<ExpertOnly title="Chi tiết từng cung và Chuyển Bàn thời gian">/);
  assert.match(source,/<ExpertOnly title="Bảng kiểm chứng thành phần Kỳ Môn">/);
  assert.match(source,/buildRotatingHourPlate\(formation\)/);
});
test('V11.84: Bát Tự and Ngũ hành expose a simple core plus advanced research', () => {
  const bazi=read('apps/web/src/app/bazi/page.tsx');
  const wuxing=read('apps/web/src/app/ngu-hanh/page.tsx');
  assert.match(bazi,/<ExpertOnly title="Tàng Can, quan hệ Can Chi và Đại Vận">/);
  assert.match(bazi,/dayMaster\.stem/);
  assert.match(wuxing,/<ExpertOnly title="Ma trận tương tác Ngũ hành 5×5">/);
  assert.match(wuxing,/compareElements\(first,second\)/);
});
test('V11.84: day comparison and advanced Kinh Dịch assumptions are mode-aware', () => {
  const good=read('apps/web/src/app/good-days/page.tsx');
  const iching=read('apps/web/src/app/iching/page.tsx');
  assert.match(good,/<ExpertOnly title="So sánh tối đa ba ngày và xuất CSV">/);
  assert.match(good,/viewMode === 'expert' && <button type="button" className="gd-compare-add"/);
  assert.match(good,/viewMode === 'expert' && <button type="button" className="gd-download"/);
  assert.match(iching,/viewMode === 'expert' && <details className=\{styles\.methodDetails\}>/);
});
test('V11.84: site theme and original CSS baseline remain separate from mode styling', () => {
  assert.match(shell,/const STORAGE_THEME = 'thiendo-theme'/);
  assert.match(css,/@media\(max-width:650px\)/);
  assert.match(moduleFile,/Engines and persisted chart data are mode-independent/);
  assert.doesNotMatch(moduleFile,/\bcalculateLocal\b|\bEngine\.baziCalculate\b|\bbuildRotatingHourPlate\b/);
});
