// Return to musical shortcuts after pointer use; Tab/arrow editing keeps focus.
(() => {
  // A changed dropdown returns the keyboard to musical shortcuts on both pages.
  document.addEventListener('change', event => {
    if (event.target.matches('select')) event.target.blur();
  });
  const activeRanges = new Map();
  document.addEventListener('pointerdown', event => {
    if (event.target.matches('input[type="range"]')) activeRanges.set(event.pointerId, event.target);
  });
  function release(event) {
    const range = activeRanges.get(event.pointerId);
    activeRanges.delete(event.pointerId);
    if (range && document.activeElement === range) range.blur();
  }
  document.addEventListener('pointerup', release, true);
  document.addEventListener('pointercancel', release, true);
  window.addEventListener('blur', () => activeRanges.clear());
})();
