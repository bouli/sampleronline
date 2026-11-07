// Page-specific help shared by the sampler and synth.
(() => {
  const badge = document.querySelector('.version');
  if (!badge) return;
  const synth = !!document.querySelector('#preset');
  badge.setAttribute('role', 'button');
  badge.tabIndex = 0;
  badge.title = 'How to · Keyboard shortcuts';
  badge.setAttribute('aria-label', 'Open how to and keyboard shortcuts');
  badge.setAttribute('aria-haspopup', 'dialog');
  badge.setAttribute('aria-controls', 'how-to-dialog');
  const dialog = document.createElement('dialog');
  dialog.id = 'how-to-dialog';
  dialog.setAttribute('aria-labelledby', 'how-to-title');
  const samplerGuide = `<ol><li><strong>Load a sound.</strong> Drop audio onto a pad, or use the file browser. Double-click a pad to replace its sound while keeping its hits. No sounds yet? Open the <a href="synth.html" id="help-open-synth">Synthesizer</a> to design your own and send them to the sampler.</li><li><strong>Shape it.</strong> Select a pad, drag the waveform handles to trim, then adjust level or reverse. Use Fade In and Fade Out (0–500 ms) to smooth cut edges and reduce pops. Fade Out increases toward the left. The waveform shows a rising line for Fade In and a falling line for Fade Out, updated as you adjust the sliders or trim. New sounds start with 5 ms fades; older sessions load with fades off. Fades apply to pad previews and sequencer playback, and are saved with the session.</li><li><strong>Build a loop.</strong> Click sequencer steps, then press Play. Use patterns A–H for variations; changes during playback start at the next full loop.</li><li><strong>Organize.</strong> Edit mode swaps or clears pads. When clearing, choose whether to keep hits. The copy and swap icons above the sequencer organize patterns.</li><li><strong>Keep your work.</strong> The small import/export buttons below the session name load and save your work. Hover to see their labels. Export Session downloads sounds and settings together. Import Session restores a ZIP. Export regularly so you can restore your work later with Import Session.</li></ol><p>Use the pencil buttons to edit the session name, time signature, or loop length. Shorter loops preserve hidden steps. Lo-fi and reverb affect the session without changing original samples.</p><hr /><p><strong>Your session stays with you.</strong> We do not save your sounds or sessions on a server. Everything is stored locally in your browser and can be lost if browser data is cleared. To keep a session for the future or use it on another device, download it with Export Session, keep the ZIP safe, and restore it with Import Session.</p>`;
  const synthGuide = `<ol><li><strong>Start a sound.</strong> Choose a preset in Start with, or recall a sound from My sounds.</li><li><strong>Shape it.</strong> Adjust the oscillator, noise, envelope, and filter. Lo-fi comes before reverb in the sound chain.</li><li><strong>Play it.</strong> Tap a piano key or use the keymap below. Change octave with the − / + buttons.</li><li><strong>Capture it.</strong> Set the sample name and note length, then Preview, Save WAV, or Send to sampler. Effects and the reverb tail are included.</li></ol><p>Saving a WAV or sending to the sampler also saves the patch in My sounds. Choose it later to create another version.</p>`;
  dialog.innerHTML = `<div class="help-heading"><h2 id="how-to-title">How to · ${synth ? 'Synth' : 'Sampler'}</h2><form method="dialog"><button aria-label="Close how to">Close</button></form></div>${synth ? synthGuide : samplerGuide}<h3>Keyboard shortcuts</h3><div id="help-keymap"></div><p class="help-note">Shortcuts pause while you type or edit a control. Sliders release focus after mouse/touch use.${synth ? ' Starting-sound selectors release focus after a selection.' : ''} On phones, use the on-screen controls.</p><p class="help-note">Developer and optional support links are in the page footer.</p>`;
  document.body.append(dialog);
  dialog.querySelector('#help-open-synth')?.addEventListener('click', event => {
    event.preventDefault();
    dialog.close();
    document.querySelector('#open-synth').click();
  });
  function keyRow(keys, description) {
    const row = document.createElement('div');
    row.className = 'help-key-row';
    const group = document.createElement('span');
    group.className = 'help-keys';
    for (const key of keys) { const kbd = document.createElement('kbd'); kbd.textContent = key; group.append(kbd); }
    const label = document.createElement('span'); label.textContent = description;
    row.append(group, label);
    return row;
  }
  function open() {
    const map = dialog.querySelector('#help-keymap');
    map.replaceChildren(keyRow(['Space'], synth ? 'Preview selected sound' : 'Play / pause sequence'));
    if (synth) {
      map.append(keyRow(['A', 'W', 'S', 'E', 'D', 'F', 'T', 'G', 'Y', 'H', 'U', 'J', 'K'], 'Notes: C, C♯, D, D♯, E, F, F♯, G, G♯, A, A♯, B, C (current octave)'));
    } else {
      const pads = typeof padKeyLabels === 'undefined' ? ['1','2','3','4','5','6','7','8','Q','W','E','R','T','Y','U','I'] : padKeyLabels;
      const patterns = typeof patternKeyLabels === 'undefined' ? ['A','S','D','F','G','H','J','K'] : patternKeyLabels;
      map.append(keyRow(pads.slice(0, 8), 'Pads 01–08 in the selected bank'), keyRow(pads.slice(8), 'Pads 09–16 in the selected bank'), keyRow(patterns, 'Patterns A–H, in order'));
    }
    const note = document.createElement('p');
    note.className = 'help-note';
    note.textContent = synth ? 'Synth shortcuts follow the letter characters shown, so their positions vary with keyboard layout.' : 'Sampler shortcuts follow physical key positions, including QWERTZ and AZERTY. Labels adapt when your browser provides layout information, or as you press keys.';
    map.append(note);
    dialog.showModal();
  }
  badge.addEventListener('click', event => { event.preventDefault(); open(); });
  badge.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); open(); }
  });
  // Keep reading/closing help from triggering musical shortcuts behind the dialog.
  document.addEventListener('keydown', event => { if (dialog.open) event.stopPropagation(); }, true);
})();
