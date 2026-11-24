import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const React = require('react');
const ts = require('typescript');
const {JSDOM} = require(process.env.THIENDO_DOM_TEST_MODULE);
const {act, createElement: h} = React;

function compile(file, imports = {}) {
  const module = {exports: {}};
  const {outputText} = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    fileName: file,
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX},
  });
  new Function('module', 'exports', 'require', outputText)(
    module, module.exports, id => Object.hasOwn(imports, id) ? imports[id] : require(id),
  );
  return module.exports;
}

test('Tử Vi follows profile links within one page and discards retired requests and errors', async () => {
  const dom = new JSDOM('<div id="root"></div>', {url: 'http://localhost/chart?profile=a'});
  const globals = {window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true};
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, {value, configurable: true});
  }
  const root = require('react-dom/client').createRoot(document.getElementById('root'));
  const requests = new Map();
  const Empty = () => null;
  let editField;
  const {default: Page} = compile('../apps/web/src/app/chart/page.tsx', {
    'next/navigation': { useSearchParams: () => new URLSearchParams(window.location.search) },
    '@/components/auth-provider': { useAuth: () => ({user: {id: 'member'}, open: Empty}) },
    '@/features/discipline-canvas/eastern-scene': {EasternScene: Empty},
    '@/features/discipline-canvas/discipline-canvas': {TuViCanvas: Empty},
    '@/features/chart/components/chart-form': {ChartForm: ({input, profileLoading, onChange}) => {
      editField = onChange;
      return h('button', {disabled: profileLoading, id: 'calculate'}, input.label);
    }},
    '@/features/chart/components/chart-result': {ChartResult: ({message}) => h('p', {id: 'message'}, message)},
    '@/lib/use-pending-operation': compile('../apps/web/src/lib/use-pending-operation.ts'),
    '@/lib/engine': {},
    '@/lib/api': {birthProfileApi: {get: (id, signal) => new Promise((resolve, reject) => {
      requests.set(id, {signal, resolve, reject});
    })}},
  });
  const form = () => document.getElementById('calculate');
  const render = async path => {
    window.history.pushState(null, '', path);
    await act(async () => root.render(h(Page)));
  };
  try {
    await render('/chart?profile=a');
    assert.ok(requests.has('a'));
    assert.equal(form().disabled, true);
    await render('/chart?profile=b');
    assert.equal(requests.get('a').signal.aborted, true);
    assert.ok(requests.has('b'));
    await act(async () => {
      requests.get('a').reject(Error('Previous profile failure'));
      requests.get('b').resolve({profile: {
        id: 'b', name: 'Hồ sơ B', date: '2017-08-21', hour: 0, minute: 0,
        gender: 'Nữ', timeZone: 'Asia/Ho_Chi_Minh', calendar: 'solar', leap: false,
      }});
    });
    assert.equal(form().textContent, 'Hồ sơ B');
    assert.equal(form().disabled, false);
    await render('/chart?profile=c');
    await act(async () => editField('label', 'Nhập tay'));
    await act(async () => requests.get('c').reject(Error('Retired load failure')));
    assert.equal(form().textContent, 'Nhập tay');
    assert.equal(form().disabled, false);
    assert.equal(document.getElementById('message').textContent, '');
    await render('/chart');
    assert.equal(form().textContent, '');
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
