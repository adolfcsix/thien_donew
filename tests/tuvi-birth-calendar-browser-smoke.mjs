import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {localTestOrigin} from '../infrastructure/scripts/e2e-http.mjs';
import {mockMemberAccessForUi} from './helpers-ui-member-access.mjs';

const {chromium} = await import(pathToFileURL(process.env.THIENDO_PLAYWRIGHT_MODULE).href);
const origin = localTestOrigin(process.env.NEXT_BASE_URL || 'http://127.0.0.1:3000');
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.THIENDO_CHROMIUM_PATH,
  args: JSON.parse(process.env.THIENDO_CHROMIUM_ARGS_JSON || '[]'),
});

try {
  const context = await browser.newContext({hasTouch: true, isMobile: true, viewport: {width: 320, height: 900}});
  await mockMemberAccessForUi(context);
  await context.route('**/api/auth/me', route => route.fulfill({
    json: {user: {id: '11111111-1111-4111-8111-111111111111', email: 'tuvi-mobile@example.invalid'}},
  }));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  for (const width of [320, 390]) {
    await page.setViewportSize({width, height: 900});
    const member = page.waitForResponse(response => response.url().endsWith('/api/auth/me') && response.ok());
    await Promise.all([page.goto(origin + '/chart'), member]);
    const date = page.getByLabel('Ngày sinh', {exact: true});
    const lunar = page.getByRole('button', {name: 'Âm lịch', exact: true});
    const solar = page.getByRole('button', {name: 'Dương lịch', exact: true});
    const submit = page.getByRole('button', {name: /Tính lá số/});
    const choices = page.getByRole('group', {name: 'Chọn tháng âm'});
    const regularOption = choices.locator('label').filter({has: page.getByRole('radio', {name: /^Tháng thường/})});
    const leapOption = choices.locator('label').filter({has: page.getByRole('radio', {name: /^Tháng nhuận/})});
    const regular = regularOption.getByRole('radio');
    const leap = leapOption.getByRole('radio');

    await page.getByLabel('Tên lá số', {exact: true}).fill('Ca kiểm thử tháng nhuận');
    await lunar.tap();
    assert.equal(await date.getAttribute('inputmode'), 'numeric');
    await date.fill('20200401');
    assert.equal(await date.inputValue(), '2020-04-01');
    await choices.getByText('23/04/2020 dương lịch', {exact: true}).waitFor();
    await choices.getByText('23/05/2020 dương lịch', {exact: true}).waitFor();
    await leapOption.tap();
    assert.ok(await leap.isChecked());

    await date.fill('20200430');
    assert.ok(await leap.isDisabled());
    assert.ok(await submit.isDisabled());
    await regularOption.tap();
    assert.ok(await regular.isChecked());
    assert.ok(await submit.isEnabled());

    await date.fill('20170630');
    assert.equal(await date.inputValue(), '2017-06-30');
    assert.ok(await regular.isDisabled());
    assert.ok(await submit.isDisabled());
    assert.ok(await choices.evaluate(node => node.scrollWidth <= node.clientWidth + 1));
    assert.ok(await choices.locator('label').evaluateAll(labels =>
      labels.every(label => label.getBoundingClientRect().height >= 44)));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await leapOption.tap();
    await solar.tap();
    assert.equal(await date.inputValue(), '2017-08-21');
    await lunar.tap();
    assert.equal(await date.inputValue(), '2017-06-30');
    assert.ok(await leap.isChecked());

    await date.fill('20230301');
    assert.ok(await submit.isDisabled());
    await page.getByRole('button', {name: 'Dùng tháng thường', exact: true}).tap();
    assert.ok(await submit.isEnabled());
    await date.fill('20170630');
    await leapOption.tap();
    await submit.tap();
    const ledger = page.locator('.chart-profile-ledger');
    await ledger.getByText(/30\/6\/2017 · Tháng nhuận/).waitFor();
    await ledger.getByText(/Thiên Đồ giữ nguyên số tháng âm/).waitFor();
    assert.equal(await page.locator('.astrology-grid .house').count(), 12);
    console.log(`PASS Tử Vi birth calendar ${width}px: numeric entry, leap-day validation, touch targets, calendar round trip and 12 palaces`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
