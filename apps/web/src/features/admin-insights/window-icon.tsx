/** Code-native icons avoid platform font gaps in window controls. */
export function WindowIcon({name}:{name:'reset'|'expand'|'collapse'|'minimize'|'close'}) {
  const paths = {
    reset: 'M12 3v4m0 10v4M3 12h4m10 0h4M7 7l10 10M7 17 17 7',
    expand: 'M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5',
    collapse: 'M4 9h5V4m6 0v5h5M9 20v-5H4m16 0h-5v5',
    minimize: 'M5 12h14',
    close: 'M6 6l12 12M6 18 18 6',
  };
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name]}/></svg>;
}
