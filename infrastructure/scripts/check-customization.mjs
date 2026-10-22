/** Kiểm tra phần tùy chỉnh của người mới; không cần database hoặc API key. */
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

export function validateCustomization(copy, palettes, requiredKeys) {
  const errors = [];
  if (!copy || typeof copy !== 'object' || Array.isArray(copy)) errors.push('home.json phải là một object { ... }.');
  else {
    for (const key of requiredKeys) {
      if (typeof copy[key] !== 'string' || !copy[key].trim()) errors.push(`home.json: ${key} phải có nội dung dạng chuỗi.`);
    }
    for (const key of Object.keys(copy)) if (!requiredKeys.includes(key)) errors.push(`home.json: khóa không được trang sử dụng: ${key}.`);
  }
  if (!Array.isArray(palettes) || palettes.length !== 6) errors.push('medal-colors.json cần đúng 6 cặp màu, mỗi cặp cho 3 cấp.');
  else palettes.forEach((pair, index) => {
    if (!Array.isArray(pair) || pair.length !== 2 || pair.some(color => typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color))) {
      errors.push(`medal-colors.json: cặp ${index + 1} cần hai mã màu #RRGGBB, ví dụ ["#8a6c4f", "#d9c1a1"].`);
    }
  });
  return errors;
}
export function checkCustomization(root) {
  const source = readFileSync(resolve(root, 'apps/web/src/app/page.tsx'), 'utf8');
  const keys = [...new Set([...source.matchAll(/\bcopy\.([A-Za-z][A-Za-z0-9]*)/g)].map(match => match[1]))];
  if (!keys.length) throw new Error('Không tìm thấy liên kết dữ liệu trang chủ.');
  const copy = JSON.parse(readFileSync(resolve(root, 'apps/web/src/customize/home.json'), 'utf8'));
  const palettes = JSON.parse(readFileSync(resolve(root, 'apps/web/src/customize/medal-colors.json'), 'utf8'));
  return validateCustomization(copy, palettes, keys);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const errors = checkCustomization(fileURLToPath(new URL('../../', import.meta.url)));
    if (errors.length) { console.error('FAIL\n' + errors.join('\n')); process.exitCode = 1; }
    else console.log('PASS — Nội dung trang chủ và 6 cặp màu huy hiệu hợp lệ. Chạy typecheck/build sau khi sửa CSS/TSX; lệnh này không nghiệm thu toàn hệ thống.');
  } catch (error) { console.error('FAIL — ' + error.message); process.exitCode = 1; }
}
