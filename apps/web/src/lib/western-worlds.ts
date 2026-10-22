/** Presentation boundaries only. Never used to select calculations or access rights. */
export const westernWorlds = [
  { path: '/western-astrology', id: 'astrology', label: 'Đài thiên văn', name: 'Chiêm tinh', icon: 'orbit' },
  { path: '/tarot', id: 'tarot', label: 'Thư phòng Tarot', name: 'Tarot', icon: 'cards' },
  { path: '/numerology', id: 'numerology', label: 'Hình học số học', name: 'Thần số học', icon: 'number' },
  { path: '/western-symbols', id: 'symbols', label: 'Vườn biểu tượng', name: 'Cây biểu tượng', icon: 'tree' },
  { path: '/research/development', id: 'research', label: 'Thư viện nghiên cứu', name: 'Phạm vi chuyên môn', icon: 'library' },
] as const;

export function getWesternWorld(pathname: string) {
  const path = pathname.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
  return westernWorlds.find(world => path === world.path || path.startsWith(world.path + '/'));
}

export function westernThemeKey(id: string) { return 'thiendo-theme:world:' + id; }
