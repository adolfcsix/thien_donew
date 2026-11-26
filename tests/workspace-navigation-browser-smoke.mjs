import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {localTestOrigin} from '../infrastructure/scripts/e2e-http.mjs';
import {mockMemberAccessForUi} from './helpers-ui-member-access.mjs';

const {chromium} = await import(pathToFileURL(process.env.THIENDO_PLAYWRIGHT_MODULE).href);
const origin = localTestOrigin(process.env.NEXT_BASE_URL || 'http://127.0.0.1:3000');
const browser = await chromium.launch({
  executablePath: process.env.THIENDO_CHROMIUM_PATH,
  args: JSON.parse(process.env.THIENDO_CHROMIUM_ARGS_JSON || '[]'),
});
const routes = ['/chart', '/bazi', '/ky-mon', '/western-astrology', '/tarot'];
const field = route => route === '/tarot' ? 'textarea' : 'input[type="date"]';

try {
  for (const width of [320, 390, 1440]) {
    const mobile = width < 970;
    const context = await browser.newContext({
      viewport: {width, height: 900}, hasTouch: mobile, isMobile: mobile, reducedMotion: 'reduce',
    });
    await mockMemberAccessForUi(context);
    await context.route('**/api/auth/me', route => route.fulfill({
      json: {user: {id: '11111111-1111-4111-8111-111111111111', email: 'navigation@example.invalid'}},
    }));
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const sidebar = page.locator('#thiendo-sidebar');
    const drawer = page.getByRole('dialog', {name: 'Thanh điều hướng'});
    const bottomOpen = page.locator('.bottom-nav').getByRole('button', {name: 'Menu', exact: true});
    const topOpen = page.getByRole('button', {name: 'Mở menu', exact: true});
    const themeToggle = page.locator('.theme-button');

    async function verifyRoute(route, theme) {
      await page.waitForURL(origin + route);
      await page.locator('#main-content').locator(field(route)).first().waitFor();
      await page.waitForFunction(value => document.documentElement.dataset.thiendoTheme === value, theme);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), `${width}/${theme}/${route}`);
      assert.equal(await page.locator('.app-area').evaluate(node => node.inert), false);
      assert.equal(await sidebar.locator(`a[href="${route}"][aria-current="page"]`).count() > 0, true);
    }

    for (const theme of ['light', 'dark']) {
      await page.goto(origin + '/chart');
      await page.locator('#main-content input[type="date"]').first().waitFor();
      if (await page.locator('html').getAttribute('data-thiendo-theme') !== theme) await themeToggle.click();
      await verifyRoute('/chart', theme);
      if (!mobile) {
        const collapse = page.getByRole('button', {name: 'Thu gọn thanh điều hướng', exact: true});
        if (await collapse.isVisible()) await collapse.click();
        await page.waitForFunction(() => document.querySelector('.site').dataset.navigation === 'compact');
      }

      let previous = '/chart';
      for (const route of routes) {
        const input = page.locator('#main-content').locator(field(previous)).first();
        const value = previous === '/tarot' ? 'Kiểm tra điều hướng' : '2001-04-23';
        await input.fill(value);
        if (mobile) {
          // Keyboard activation is deterministic, including on touch-capable pages.
          await bottomOpen.press('Enter');
          await drawer.waitFor();
          await page.keyboard.press('Escape');
          await drawer.waitFor({state: 'hidden'});
          await page.waitForFunction(() => document.activeElement?.matches('.bottom-nav button[aria-controls="thiendo-sidebar"]'));
          assert.equal(await input.inputValue(), value);
          await topOpen.click();
          await drawer.getByRole('button', {name: 'Đóng điều hướng'}).click();
          await drawer.waitFor({state: 'hidden'});
          await page.waitForFunction(() => document.activeElement?.matches('.topbar .mobile-menu'));
          await topOpen.click();
        } else {
          await page.getByRole('button', {name: 'Mở rộng thanh điều hướng', exact: true}).click();
          await page.getByRole('button', {name: 'Thu gọn thanh điều hướng', exact: true}).click();
          assert.equal(await input.inputValue(), value);
        }

        const link = sidebar.locator(`a[href="${route}"]`).first();
        if (!(await link.isVisible())) {
          const group = await link.evaluate(node => node.closest('[id^="nav-group-"]').id);
          await sidebar.locator(`button[aria-controls="${group}"]`).click();
        }
        await link.click();
        await verifyRoute(route, theme);
        await page.reload();
        await verifyRoute(route, theme);
        if (route !== previous) {
          await page.goBack();
          await verifyRoute(previous, theme);
          await page.goto(origin + route);
          await verifyRoute(route, theme);
        }
        previous = route;
      }
      console.log(`PASS five workspaces via menu, reload and back at ${width}px / ${theme}`);
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
} finally {
  await browser.close();
}
