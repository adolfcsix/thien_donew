/** Site-wide brightness policy. Western worlds only select artwork/palette. */
export function resolveThemePreference(saved: string | null, systemPrefersLight: boolean): boolean {
  if (saved === 'light') return true;
  if (saved === 'dark') return false;
  return systemPrefersLight;
}
