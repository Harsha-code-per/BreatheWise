// Applies the saved light/dark choice before first paint, so the page never flashes.
try {
  var saved = localStorage.getItem('bw-theme');
  if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;
} catch {
  // Storage can be blocked; the system theme still applies.
}
