const $=s=>document.querySelector(s);let ctx;const audio=()=>ctx||(ctx=looperAudio.createContext());let importTarget,selected=0,playing=false,current=-1,timer,nextTime=0,nextStep=0,click=false;let sources=[];const samples=Array(128).fill(null);let activeBank=0,sessionName='Untitled session';
let sessionLofi={amount:0,low:200,high:5000},sessionLofiBus;
let sessionReverb={amount:0,decay:1.5},sessionReverbBus;
// Sixteenth-note resolution; up to eight bars of 12/2 (768 stored steps).
let meter={beats:4,unit:4},scheduledMeter=meter,queuedMeter=null,editingMeter=false;
let sequenceBars=1,scheduledBars=1,queuedBars=null,editingSequenceLength=false;
const stepsPerBar=(signature=meter)=>looperCore.stepsPerBar(signature);
const stepCount=(signature=meter,bars=sequenceBars)=>looperCore.stepCount(signature,bars);
const validMeter=looperCore.validMeter;
function stepDuration(step,count,bpm=+$('#bpm').value||90,swing=+$('#swing').value/100,barSteps=stepsPerBar()) {
  return looperCore.stepDuration(step,bpm,swing,barSteps);
}
const padId=index=>String.fromCharCode(65+Math.floor(index/16))+String(index%16+1).padStart(2,'0');
const patternBanks=looperCore.createPatterns();let activePattern=0,patterns=patternBanks[0],playbackGeneration=0,queuedPattern=null,scheduledPattern=0;const padKeyCodes=looperCore.padKeyCodes;
const patternKeyCodes=looperCore.patternKeyCodes;
const patternKeyLabels=['A','S','D','F','G','H','J','K'];
const padKeyLabels=['1','2','3','4','5','6','7','8','Q','W','E','R','T','Y','U','I'];
let patternCopy = null;
let bankEditMode=false,bankEditAction='swap',swapFrom=null,lastBankEdit=null;
const names=['Dusty kick','Rim shot','Closed hat','Open hat','Warm snare','Vinyl clap','Sub bass','Soft keys'];const pads=$('#pads'),seq=$('#sequencer');
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),2600)}
function demoBuffer(i){const a=audio(),length=[.5,.2,.12,.45,.28,.3,.65,1.2][i],b=a.createBuffer(1,Math.floor(a.sampleRate*length),a.sampleRate),d=b.getChannelData(0);let prev=0;for(let n=0;n<d.length;n++){let t=n/a.sampleRate,noise=Math.random()*2-1;prev=.65*prev+.35*noise;let v=0;if(i===0)v=Math.sin(2*Math.PI*(48*t+42*.025*(1-Math.exp(-t/.025))))*Math.exp(-t*12)+noise*.08*Math.exp(-t*100);if(i===1)v=(noise*.7+Math.sin(t*2*Math.PI*550)*.3)*Math.exp(-t*38);if(i===2||i===3)v=(noise-prev)*Math.exp(-t*(i===2?55:12))*.5;if(i===4)v=(noise*.55+Math.sin(t*2*Math.PI*180)*.4)*Math.exp(-t*19);if(i===5)v=noise*.65*Math.exp(-t*18)*(1+.4*Math.sin(t*2*Math.PI*90));if(i===6)v=Math.sin(t*2*Math.PI*55)*Math.exp(-t*6)*.8;if(i===7)v=[220,261.63,329.63].reduce((s,f)=>s+Math.sin(t*2*Math.PI*f),0)/4*Math.exp(-t*4)*Math.min(1,t*100);d[n]=v;}return b}
function loadDemo(){patternCopy=null;swapFrom=null;lastBankEdit=null;patternBanks.forEach(bank=>bank.forEach(row=>row.fill(false)));activePattern=0;scheduledPattern=0;queuedPattern=null;patterns=patternBanks[0];activeBank=0;for(let i=0;i<128;i++){samples[i]=i<8?{name:names[i],buffer:demoBuffer(i),start:0,end:[.5,.2,.12,.45,.28,.3,.65,1.2][i],level:1,reverse:false,muted:false}:null;patterns[i].fill(false)}[[0,0],[0,6],[0,8],[0,14],[1,4],[1,12],[2,0],[2,2],[2,4],[2,6],[2,8],[2,10],[2,12],[2,14],[3,7],[3,15],[4,4],[4,12],[6,0],[6,8],[7,0]].forEach(([r,c])=>patterns[r][c]=true);selected=0;render();}
function render() {
  renderBankEdit(); renderSampleBanks();
  pads.innerHTML = '';
  const start = activeBank * 16;
  samples.slice(start, start + 16).forEach((sample, localIndex) => {
    const index = start + localIndex, button = document.createElement('button');
    button.className = 'pad ' + (!sample ? 'empty ' : '') + (selected === index ? 'selected ' : '') + (bankEditMode && swapFrom === index ? 'swap-source' : '');
    button.dataset.pad = index;
    button.innerHTML = `<span class="pad-top"><span>${padId(index)}</span>${sample ? '<span class="pad-led"></span>' : ''}</span><span class="pad-name"></span><kbd class="pad-shortcut"></kbd>`;
    button.querySelector('.pad-shortcut').textContent = padKeyLabels[localIndex];
    button.setAttribute('aria-keyshortcuts', padKeyLabels[localIndex]);
    button.title = padId(index) + ' · ' + padKeyLabels[localIndex];
    button.querySelector('.pad-name').textContent = sample ? sample.name : '+';
    button.onclick = () => {
      if (bankEditMode) { editPad(index); return; }
      selected = index; render();
      if (sample) trigger(index);
      else { importTarget = index; $('#files').click(); }
    };
    button.ondblclick = () => { if (bankEditMode) return; selected = index; importTarget = index; $('#files').click(); };
    button.ondragover = event => event.preventDefault();
    button.ondrop = event => { event.preventDefault(); event.stopPropagation(); if (!bankEditMode) importFiles(event.dataTransfer.files, index); };
    pads.append(button);
  });
  renderSequence(); editor();
  $('#sample-count').textContent = samples.slice(start, start + 16).filter(Boolean).length;
}
function renderSampleBanks() {
  const container = $('#sample-banks');
  if (!container.childElementCount) {
    for (let bank = 0; bank < 8; bank++) {
      const button = document.createElement('button');
      button.textContent = String.fromCharCode(65 + bank);
      button.dataset.bank = bank;
      button.setAttribute('aria-label', 'Sample bank ' + button.textContent);
      button.onclick = () => {
        activeBank = bank;
        selected = bank * 16 + selected % 16;
        render();
      };
      container.append(button);
    }
  }
  [...container.children].forEach((button, bank) => {
    button.setAttribute('aria-pressed', String(bank === activeBank));
    const count = samples.slice(bank * 16, bank * 16 + 16).filter(Boolean).length;
    button.title = 'Bank ' + button.textContent + ' · ' + count + '/16 pads';
    button.classList.toggle('has-samples', count > 0);
  });
}
function renderSequence(){renderPatternButtons();renderMeter();renderSequenceLength();const count=stepCount(),beatSteps=16/meter.unit;seq.style.setProperty('--step-count',count);$('#sequence-step-count').textContent=count+' STEPS /';seq.innerHTML='';let ruler=document.createElement('div');ruler.className='seq-ruler';ruler.innerHTML='<span></span>'+Array.from({length:count},(_,i)=>`<span class="${i%beatSteps===0?'beat-label':''}">${String(i+1).padStart(2,'0')}</span>`).join('');seq.append(ruler);samples.forEach((s,i)=>{if(!s)return;let row=document.createElement('div');row.className='seq-row';let name=document.createElement('div');name.className='seq-name';name.innerHTML=`<small>${padId(i)}</small><span></span><button class="mute ${s.muted?'active':''}" title="Mute track">M</button>`;name.querySelector('span').textContent=s.name;name.onclick=()=>{selected=i;activeBank=Math.floor(i/16);render()};name.querySelector('button').onclick=e=>{e.stopPropagation();s.muted=!s.muted;renderSequence()};row.append(name);for(let j=0;j<count;j++){let b=document.createElement('button');b.className='step '+(j%beatSteps===0?'beat ':'')+(patterns[i][j]?'on ':'')+(j===current?'current':'');b.setAttribute('aria-label',`${s.name}, step ${j+1}`);b.setAttribute('aria-pressed',patterns[i][j]);b.dataset.step=j;b.onclick=()=>{patterns[i][j]=!patterns[i][j];renderSequence()};row.append(b)}seq.append(row)});const visibleHits=patterns.reduce((sum,row)=>sum+row.slice(0,count).filter(Boolean).length,0),hiddenHits=patterns.reduce((sum,row)=>sum+row.slice(count).filter(Boolean).length,0);$('#hit-count').textContent=visibleHits;$('#hidden-hit-count').textContent=hiddenHits?' · '+hiddenHits+' hidden hits preserved':'';}
function editor(){let s=samples[selected];$('#sample-pad').textContent=padId(selected);$('#sample-name').textContent=s?s.name:'Empty pad';$('#sample-format').textContent=s?`${s.buffer.numberOfChannels===1?'MONO':'STEREO'} · ${(s.buffer.sampleRate/1000).toFixed(1)} kHz`:'DROP A SOUND TO BEGIN';$('#trim-start').value=s?s.start.toFixed(3):0;$('#trim-end').value=s?s.end.toFixed(3):0;$('#level').value=s?s.level:1;$('#level-value').textContent=s?Math.round(s.level*100)+'%':'100%';$('#reverse').classList.toggle('active',!!s?.reverse);drawWave();}
function drawWave(){let s=samples[selected],c=$('#waveform'),r=c.getBoundingClientRect(),dpr=devicePixelRatio||1;c.width=r.width*dpr;c.height=r.height*dpr;let g=c.getContext('2d');g.scale(dpr,dpr);let w=r.width,h=r.height;g.strokeStyle='#dce2ce';g.beginPath();g.moveTo(0,h/2);g.lineTo(w,h/2);g.stroke();if(!s){$('#trim-region').style.display='none';return}$('#trim-region').style.display='block';let data=s.buffer.getChannelData(0);g.strokeStyle='#829468';g.lineWidth=1.6;for(let x=0;x<w;x+=3){let from=Math.floor(x/w*data.length),to=Math.max(from+1,Math.floor((x+3)/w*data.length)),peak=0;for(let k=from;k<to;k++)peak=Math.max(peak,Math.abs(data[s.reverse?data.length-1-k:k]));let amp=Math.max(1,peak*h*.44);g.beginPath();g.moveTo(x,h/2-amp);g.lineTo(x,h/2+amp);g.stroke()}$('#trim-region').style.left=s.start/s.buffer.duration*100+'%';$('#trim-region').style.right=(1-s.end/s.buffer.duration)*100+'%';$('#ruler-mid').textContent=(s.buffer.duration/2).toFixed(2);$('#ruler-end').textContent=s.buffer.duration.toFixed(2)+' s';$('#duration').textContent=(s.end-s.start).toFixed(2)+' SEC';}
function makeSource(ac,s,when,destination){let source=ac.createBufferSource();if(s.reverse){if(!s.reversed){s.reversed=ac.createBuffer(s.buffer.numberOfChannels,s.buffer.length,s.buffer.sampleRate);for(let i=0;i<s.buffer.numberOfChannels;i++)s.reversed.copyToChannel(s.buffer.getChannelData(i).slice().reverse(),i)}source.buffer=s.reversed}else source.buffer=s.buffer;let gain=ac.createGain();gain.gain.value=s.level*.7;source.connect(gain).connect(destination);source.start(when,s.start,Math.max(.001,s.end-s.start));return source}
function trigger(i,when){let s=samples[i];if(!s)return;let a=audio();a.resume();let source=makeSource(a,s,when??a.currentTime,sessionAudioInput());sources.push(source);source.onended=()=>sources=sources.filter(x=>x!==source);let delay=Math.max(0,((when??a.currentTime)-a.currentTime)*1000);setTimeout(()=>{let p=activeBank===Math.floor(i/16)?pads.children[i%16]:null;p?.classList.add('flash');setTimeout(()=>p?.classList.remove('flash'),110)},delay)}
function schedule() {
  const a = audio();
  while (nextTime < a.currentTime + .12) {
    const step = nextStep, time = nextTime, generation = playbackGeneration;
    // Choose the next bank at the bar boundary without stopping any voices.
    // Audio is scheduled ahead; the visible pattern changes when that beat sounds.
    if (step === 0 && queuedPattern !== null) {
      scheduledPattern = queuedPattern;
      queuedPattern = null;
      renderPatternButtons();
    }
    if (step === 0 && queuedMeter !== null) {
      scheduledMeter = queuedMeter;
      queuedMeter = null;
      renderMeter();
    }
    if (step === 0 && queuedBars !== null) {
      scheduledBars = queuedBars;
      queuedBars = null;
      renderSequenceLength();
    }
    const barMeter = scheduledMeter, bars = scheduledBars, count = stepCount(barMeter, bars);
    const bankIndex = scheduledPattern;
    const bank = patternBanks[bankIndex];
    samples.forEach((sample, i) => {
      if (sample && !sample.muted && bank[i][step]) trigger(i, time);
    });
    if (click && step % (16 / barMeter.unit) === 0) {
      const oscillator = a.createOscillator(), gain = a.createGain();
      oscillator.frequency.value = step % stepsPerBar(barMeter) === 0 ? 1300 : 900;
      gain.gain.setValueAtTime(.08, time);
      gain.gain.exponentialRampToValueAtTime(.001, time + .03);
      oscillator.connect(gain).connect(a.destination);
      oscillator.start(time); oscillator.stop(time + .04);
    }
    setTimeout(() => {
      if (!playing || generation !== playbackGeneration) return;
      current = step;
      if (activePattern !== bankIndex || meter !== barMeter || sequenceBars !== bars) {
        meter = barMeter;
        sequenceBars = bars;
        activePattern = bankIndex;
        patterns = patternBanks[bankIndex];
        renderSequence();
      }
      document.querySelectorAll('.step').forEach(element => element.classList.toggle('current', +element.dataset.step === step));
      $('#position-counter').textContent = `BAR ${String(Math.floor(step/stepsPerBar(barMeter))+1).padStart(2,'0')} · STEP ${String(step%stepsPerBar(barMeter)+1).padStart(2,'0')}`;
    }, Math.max(0, (time - a.currentTime) * 1000));
    nextTime += stepDuration(step, count, undefined, undefined, stepsPerBar(barMeter));
    nextStep = (step + 1) % count;
  }
}
async function togglePlay() {
  if (playing) { stop(false); return; }
  const a = audio(), generation = playbackGeneration;
  playing = true;
  $('#play').dataset.playing = 'true';
  $('#play').setAttribute('aria-label', 'Pause sequence');
  $('#status').textContent = 'Starting audio…';
  try {
    // Call resume in the tap handler, then wait before advancing the sequencer.
    await a.resume();
    if (!playing || generation !== playbackGeneration) return;
    if (a.state !== 'running') throw new Error('Audio is not running');
    nextStep %= stepCount();
    nextTime = a.currentTime + .04;
    $('#status').textContent = 'In the groove';
    schedule(); timer = setInterval(schedule, 25);
  } catch {
    if (!playing || generation !== playbackGeneration) return;
    stop(false);
    toast('Audio could not start. Tap Play again and check your device volume and Silent Mode.');
  }
}
function stop(reset=true){playbackGeneration++;playing=false;clearInterval(timer);if(queuedMeter||scheduledMeter!==meter||queuedBars!==null||scheduledBars!==sequenceBars){meter=queuedMeter||scheduledMeter;queuedMeter=null;scheduledMeter=meter;sequenceBars=queuedBars??scheduledBars;queuedBars=null;scheduledBars=sequenceBars;nextStep%=stepCount();renderSequence()}queuedPattern=null;scheduledPattern=activePattern;renderPatternButtons();sources.forEach(s=>{try{s.stop()}catch{}});sources=[];$('#play').dataset.playing='false';$('#play').setAttribute('aria-label','Play sequence');$('#status').textContent='Ready when you are';current=-1;if(reset){nextStep=0;$('#position-counter').textContent='BAR 01 · STEP 01'}document.querySelectorAll('.current').forEach(e=>e.classList.remove('current'))}
async function importFiles(files, start) {
  if (bankEditMode) { toast('Finish editing the bank before importing sounds.'); return; }
  const bank = start === undefined ? activeBank : Math.floor(start / 16), bankStart = bank * 16, bankEnd = bankStart + 16;
  let index = start ?? samples.findIndex((sample, i) => i >= bankStart && i < bankEnd && !sample);
  if (index < 0) { toast('This bank is full. Switch banks or drop onto a pad to replace it.'); return; }
  for (const file of files) {
    if (index >= bankEnd) { toast('This bank is full. Switch banks to import more sounds.'); break; }
    try {
      const buffer = await audio().decodeAudioData(await file.arrayBuffer());
      samples[index] = { name: file.name.replace(/\.[^.]+$/, ''), buffer, start: 0, end: buffer.duration, level: 1, reverse: false, muted: false };
      selected = index; activeBank = bank; index++;
      if (start === undefined) while (index < bankEnd && samples[index]) index++;
    } catch { toast(`Could not read ${file.name}. Try WAV or MP3.`); }
  }
  render();
}
$('#files').onchange=e=>{importFiles(e.target.files,importTarget);importTarget=undefined;e.target.value=''};let drop=$('#dropzone');drop.onclick=e=>{if(e.target.id!=='files')importTarget=undefined};drop.ondragover=e=>{e.preventDefault();drop.classList.add('dragover')};drop.ondragleave=()=>drop.classList.remove('dragover');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('dragover');importFiles(e.dataTransfer.files)};window.addEventListener('dragover',e=>e.preventDefault());window.addEventListener('drop',e=>e.preventDefault());$('#play').onclick=togglePlay;$('#stop').onclick=()=>stop();$('#preview').onclick=()=>trigger(selected);$('#load-demo').onclick=()=>{stop();loadDemo();toast('Demo kit and pattern loaded')};$('#clear').onclick=()=>{patterns.forEach(p=>p.fill(false));renderSequence();toast('Pattern cleared')};$('#metronome').onclick=()=>{click=!click;$('#metronome').classList.toggle('active',click)};$('#swing').oninput=e=>$('#swing-value').textContent=e.target.value+'%';$('#bpm').onchange=e=>e.target.value=Math.min(240,Math.max(40,+e.target.value||90));$('#level').oninput=e=>{let s=samples[selected];if(s)s.level=+e.target.value;$('#level-value').textContent=Math.round(e.target.value*100)+'%'};$('#reverse').onclick=()=>{if(samples[selected]){samples[selected].reverse=!samples[selected].reverse;editor()}};function trim(which,value){let s=samples[selected];if(!s)return;if(which==='start')s.start=Math.max(0,Math.min(value,s.end-.001));else s.end=Math.min(s.buffer.duration,Math.max(value,s.start+.001));editor()}$('#trim-start').onchange=e=>trim('start',+e.target.value);$('#trim-end').onchange=e=>trim('end',+e.target.value);$('#reset-trim').onclick=()=>{let s=samples[selected];if(s){s.start=0;s.end=s.buffer.duration;editor()}};document.querySelectorAll('.trim-handle').forEach(h=>h.onpointerdown=e=>{e.preventDefault();h.setPointerCapture(e.pointerId);let which=h.dataset.handle;h.onpointermove=ev=>{let s=samples[selected];if(!s)return;let r=$('#wave').getBoundingClientRect();trim(which,(ev.clientX-r.left)/r.width*s.buffer.duration)};h.onpointerup=()=>h.onpointermove=null});window.onresize=drawWave;document.addEventListener('keydown', event => {
  if ($('#clear-pad-dialog').open) return;
  const target = event.target;
  if (event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.altKey ||
      target.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
  if (event.code === 'Space') {
    event.preventDefault();
    togglePlay();
    return;
  }
  // Physical positions keep the number row and Q–I row playable on QWERTZ/AZERTY too.
  const patternIndex = patternKeyCodes.indexOf(event.code);
  if (patternIndex !== -1) {
    event.preventDefault();
    if (event.key && event.key.length === 1 && !event.shiftKey) patternKeyLabels[patternIndex] = event.key.toUpperCase();
    selectPattern(patternIndex);
    renderPatternButtons();
    return;
  }
  const index = padKeyCodes.indexOf(event.code);
  if (index === -1) return;
  event.preventDefault();
  if (bankEditMode) return;
  if (event.key && event.key.length === 1 && !event.shiftKey) padKeyLabels[index] = event.key.toUpperCase();
  selected = activeBank * 16 + index;
  render();
  trigger(selected);
});
async function refreshKeyboardLabels() {
  try {
    const layout = await navigator.keyboard?.getLayoutMap?.();
    if (!layout) return;
    [[padKeyCodes, padKeyLabels], [patternKeyCodes, patternKeyLabels]].forEach(([codes, labels]) => {
      codes.forEach((code, index) => {
        const label = layout.get(code);
        if (label) labels[index] = label.toUpperCase();
      });
    });
    render();
  } catch { /* Restricted browsers learn labels from key events instead. */ }
}
refreshKeyboardLabels();
navigator.keyboard?.addEventListener?.('layoutchange', refreshKeyboardLabels);

loadDemo();

function captureSession() {
  return {
    name: sessionName,
    lofi: { ...sessionLofi },
    reverb: { ...sessionReverb },
    timeSignature: { ...(queuedMeter || scheduledMeter) },
    sequenceBars: queuedBars ?? scheduledBars,
    samples: samples.map(s => s ? { name: s.name, start: s.start, end: s.end, level: s.level, reverse: s.reverse, muted: s.muted, audio: loopStore.pack(s.buffer) } : null),
    patternBanks: patternBanks.map(bank => bank.map(row => row.slice())),
    activePattern, activeBank, selected, bpm: +$('#bpm').value || 90, swing: +$('#swing').value, metronome: click
  };
}
async function saveSession() {
  await loopStore.put('session', captureSession());
}
function restoreSession(saved, preparedSamples) {
  patternCopy = null;
  if (sessionLofiBus) { sessionLofiBus.destroy(); sessionLofiBus = null; }
  sessionLofi = looperLofi.valid(saved.lofi) ? { ...saved.lofi } : { amount: 0, low: 200, high: 5000 };
  renderSessionLofi();
  if (sessionReverbBus) { sessionReverbBus.destroy(); sessionReverbBus = null; }
  sessionReverb = looperReverb.valid(saved.reverb) ? { ...saved.reverb } : { amount: 0, decay: 1.5 };
  renderSessionReverb();
  sessionName = typeof saved.name === 'string' && saved.name.trim() ? saved.name.trim().slice(0, 60) : 'Untitled session';
  $('#session-name').value = sessionName;
  meter = validMeter(saved.timeSignature) ? saved.timeSignature : {beats:4,unit:4};
  scheduledMeter = meter; queuedMeter = null;
  sequenceBars = Number.isInteger(saved.sequenceBars) && saved.sequenceBars >= 1 && saved.sequenceBars <= 8 ? saved.sequenceBars : 1;
  scheduledBars = sequenceBars; queuedBars = null;
  samples.fill(null);
  saved.samples.slice(0, 128).forEach((s, i) => samples[i] = s ? preparedSamples?.[i] || { ...s, buffer: loopStore.unpack(s.audio, audio()) } : null);
  patternBanks.forEach(bank => bank.forEach(row => row.fill(false)));
  // Support older sessions that stored only one pattern and 16/64 pads.
  const banks = saved.patternBanks || [saved.patterns];
  banks.slice(0, 8).forEach((bank, b) => {
    if (!Array.isArray(bank)) return;
    bank.slice(0, 128).forEach((row, r) => {
      if (Array.isArray(row)) patternBanks[b][r] = Array.from({length:768}, (_, step) => !!row[step]);
    });
  });
  activePattern = Number.isInteger(saved.activePattern) && saved.activePattern >= 0 && saved.activePattern < 8 ? saved.activePattern : 0;
  patterns = patternBanks[activePattern]; scheduledPattern = activePattern; queuedPattern = null;
  selected = Number.isInteger(saved.selected) && saved.selected >= 0 && saved.selected < 128 ? saved.selected : 0;
  activeBank = Number.isInteger(saved.activeBank) && saved.activeBank >= 0 && saved.activeBank < 8 ? saved.activeBank : Math.floor(selected / 16);
  $('#bpm').value = saved.bpm;
  $('#swing').value = saved.swing;
  $('#swing-value').textContent = saved.swing + '%';
  click = !!saved.metronome;
  $('#metronome').classList.toggle('active', click);
}
const sessionReady = (async () => {
  try {
    const saved = await loopStore.get('session');
    if (saved) restoreSession(saved);
    const pending = await loopStore.get('synth-sample');
    if (pending) {
      let index = samples.findIndex((s, i) => !s && Math.floor(i / 16) === activeBank);
      if (index < 0) index = samples.findIndex(s => !s);
      if (index < 0) toast('All eight banks are full. Free a pad before importing your synth sample.');
      else {
        const buffer = loopStore.unpack(pending.audio, audio());
        samples[index] = { name: pending.name, buffer, start: 0, end: buffer.duration, level: 1, reverse: false, muted: false };
        selected = index;
        activeBank = Math.floor(index / 16);
        await saveSession();
        await loopStore.remove('synth-sample');
        toast('Your synth sample is ready on ' + padId(index));
      }
    }
    render();
  } catch (error) { toast('Local storage is unavailable. You can still play and import audio files.'); }
})();
$('#open-synth').onclick = async event => {
  event.preventDefault();
  stop(false);
  try {
    await sessionReady;
    await saveSession();
    location.href = 'synth.html';
  } catch (error) { toast('Could not save your session. Check browser storage before switching pages.'); }
};


function renderPatternButtons() {
  $('#position-pattern').textContent = 'PATTERN ' + String.fromCharCode(65 + activePattern);
  renderPatternCopy();
  const container = $('#pattern-buttons');
  if (container.childElementCount === 0) {
    patternBanks.forEach((bank, index) => {
      const button = document.createElement('button');
      button.className = 'pattern';
      const label = document.createElement('span');
      label.textContent = 'PATTERN ' + String.fromCharCode(65 + index);
      const shortcut = document.createElement('kbd');
      shortcut.className = 'pattern-shortcut';
      button.append(label, shortcut);
      button.dataset.pattern = index;
      button.onclick = () => selectPattern(index);
      container.append(button);
    });
  }
  [...container.children].forEach((button, index) => {
    button.querySelector('.pattern-shortcut').textContent = patternKeyLabels[index];
    button.setAttribute('aria-keyshortcuts', patternKeyLabels[index]);
    button.classList.toggle('copy-destination', index === patternCopy?.target);
    button.classList.toggle('active', index === activePattern);
    const committed = scheduledPattern !== activePattern && index === scheduledPattern;
    const queued = index === queuedPattern || committed;
    button.classList.toggle('queued', queued);
    button.setAttribute('aria-label', 'Pattern ' + String.fromCharCode(65 + index) + (queued ? ', queued' : index === activePattern ? ', selected' : ''));
    button.title = queued ? (committed || scheduledPattern === activePattern ? 'Starts at the next loop' : 'Starts at the following loop') : index === activePattern ? 'Current pattern' : 'Select pattern';
    button.setAttribute('aria-pressed', String(index === activePattern));
    button.classList.toggle('has-hits', patternBanks[index].some(row => row.some(Boolean)));
  });
  const next = scheduledPattern !== activePattern ? scheduledPattern : queuedPattern;
  $('#pattern-status').textContent = next === null ? '' : 'PATTERN ' + String.fromCharCode(65 + next) + (sequenceBars > 1 ? ' · NEXT LOOP' : ' · NEXT BAR');
  $('#clear').setAttribute('aria-label', 'Clear pattern ' + String.fromCharCode(65 + activePattern));
}
function selectPattern(index) {
  if (patternCopy) {
    if (index === patternCopy.source) { toast('Choose a different destination pattern.'); return; }
    patternCopy.target = index;
    renderPatternButtons();
    return;
  }
  if (playing) {
    // The latest choice replaces the queue. Clicking the playing pattern cancels
    // it unless the next bar has already entered the audio scheduling window.
    queuedPattern = index === scheduledPattern ? null : index;
    renderPatternButtons();
    return;
  }
  if (index === activePattern) return;
  activePattern = index;
  scheduledPattern = index;
  patterns = patternBanks[index];
  nextStep = 0;
  current = -1;
  $('#position-counter').textContent = 'BAR 01 · STEP 01';
  renderSequence();
}


function renderBankEdit() {
  $('#edit-bank').textContent = bankEditMode ? '✓ Done' : '✎ Edit';
  $('#edit-bank').setAttribute('aria-pressed', String(bankEditMode));
  $('#bank-edit-tools').hidden = !bankEditMode;
  $('.pads-panel').classList.toggle('editing-bank', bankEditMode);
  $('#edit-swap').setAttribute('aria-pressed', String(bankEditAction === 'swap'));
  $('#edit-clear').setAttribute('aria-pressed', String(bankEditAction === 'clear'));
  $('#edit-undo').disabled = !lastBankEdit;
  $('#load-demo').disabled = bankEditMode;
  $('#files').disabled = bankEditMode;
  $('#bank-hint').textContent = bankEditMode ? 'Editing pads · Done to return to playing' : 'Click to play · Double-click to replace';
  $('#bank-edit-help').textContent = bankEditAction === 'clear'
    ? 'Click a loaded pad to clear its sound, then choose whether to keep its sequencer hits.'
    : swapFrom === null ? 'Select the first pad, then the pad to swap with.'
    : padId(swapFrom) + ' selected. Choose another pad, or click it again to cancel.';
}
function rememberBankEdit(indices) {
  lastBankEdit = {
    selected,
    pads: indices.map(index => ({ index, sample: samples[index], rows: patternBanks.map(bank => bank[index].slice()) }))
  };
}
function editPad(index) {
  if (bankEditAction === 'clear') {
    if (!samples[index]) { toast('This pad is already empty.'); return; }
    const dialog = $('#clear-pad-dialog'), sample = samples[index];
    dialog.returnValue = 'cancel';
    $('#clear-pad-title').textContent = 'Clear ' + padId(index) + ' sound?';
    dialog.onclose = async () => {
      const choice = dialog.returnValue;
      if (!['keep', 'clear'].includes(choice) || samples[index] !== sample) return;
      rememberBankEdit([index]);
      looperCore.clearPad(samples, patternBanks, index, choice === 'keep');
      selected = index;
      render();
      toast(choice === 'keep' ? 'Sound cleared. Hits kept for the replacement sound.' : 'Sound and hits cleared. Use Undo to restore them.');
      try { await sessionReady; await saveSession(); }
      catch { toast('Pad cleared, but could not save locally.'); }
    };
    dialog.showModal();
    return;
  } else if (swapFrom === null) {
    swapFrom = index;
    selected = index;
  } else if (swapFrom === index) {
    swapFrom = null;
  } else {
    const from = swapFrom;
    rememberBankEdit([from, index]);
    [samples[from], samples[index]] = [samples[index], samples[from]];
    patternBanks.forEach(bank => [bank[from], bank[index]] = [bank[index], bank[from]]);
    selected = index;
    swapFrom = null;
    toast('Pads swapped, including their steps in all patterns.');
  }
  render();
}
$('#edit-bank').onclick = () => {
  bankEditMode = !bankEditMode;
  swapFrom = null;
  render();
};
$('#edit-swap').onclick = () => { bankEditAction = 'swap'; swapFrom = null; render(); };
$('#edit-clear').onclick = () => { bankEditAction = 'clear'; swapFrom = null; render(); };
$('#edit-undo').onclick = () => {
  if (!lastBankEdit) return;
  lastBankEdit.pads.forEach(({ index, sample, rows }) => {
    samples[index] = sample;
    patternBanks.forEach((bank, b) => bank[index] = rows[b]);
  });
  selected = lastBankEdit.selected;
  activeBank = Math.floor(selected / 16);
  lastBankEdit = null;
  swapFrom = null;
  render();
  toast('Last bank edit undone.');
};


let editingSessionName = false;
function setSessionNameEditing(editing) {
  editingSessionName = editing;
  const input = $('#session-name'), button = $('#edit-session-name');
  input.readOnly = !editing;
  button.textContent = editing ? '✓' : '✎';
  button.setAttribute('aria-pressed', String(editing));
  button.setAttribute('aria-label', editing ? 'Save and lock session name' : 'Unlock session name');
  button.title = editing ? 'Save and lock session name' : 'Unlock session name';
  if (editing) { input.focus(); input.select(); }
}
async function saveAndLockSessionName() {
  if (!editingSessionName) return;
  sessionName = $('#session-name').value.trim() || 'Untitled session';
  $('#session-name').value = sessionName;
  setSessionNameEditing(false);
  $('#edit-session-name').disabled = true;
  try {
    await saveSession();
    toast('Session name saved.');
  } catch { toast('Could not save the session name. Check browser storage.'); }
  finally { $('#edit-session-name').disabled = false; }
}
sessionReady.finally(() => {
  $('#session-name').disabled = false;
  $('#edit-session-name').disabled = false;
});
$('#edit-session-name').onclick = () => {
  if (editingSessionName) saveAndLockSessionName();
  else setSessionNameEditing(true);
};
$('#session-name').onkeydown = event => {
  if (event.key === 'Enter' && editingSessionName) {
    event.preventDefault();
    saveAndLockSessionName();
    $('#edit-session-name').focus();
  }
  if (event.key === 'Escape' && editingSessionName) {
    event.preventDefault();
    event.target.value = sessionName;
    setSessionNameEditing(false);
    $('#edit-session-name').focus();
  }
};


function renderMeter() {
  const desired = queuedMeter || scheduledMeter;
  if (!editingMeter) {
    $('#meter-beats').value = desired.beats;
    $('#meter-unit').value = desired.unit;
  }
  $('#meter-beats').disabled = !editingMeter;
  $('#meter-unit').disabled = !editingMeter;
  const button = $('#edit-meter');
  button.textContent = editingMeter ? '✓' : '✎';
  button.setAttribute('aria-pressed', String(editingMeter));
  button.setAttribute('aria-label', editingMeter ? 'Save and lock time signature' : 'Unlock time signature');
  button.title = editingMeter ? 'Save and lock time signature' : 'Unlock time signature';
  $('#meter-status').textContent = queuedMeter || scheduledMeter !== meter ? (sequenceBars > 1 ? 'NEXT LOOP' : 'NEXT BAR') : '';
}
async function saveAndLockMeter() {
  if (!editingMeter) return;
  const signature = {beats:+$('#meter-beats').value,unit:+$('#meter-unit').value};
  editingMeter = false;
  if (playing) {
    queuedMeter = signature.beats === scheduledMeter.beats && signature.unit === scheduledMeter.unit ? null : signature;
    renderMeter();
  } else {
    meter = signature; scheduledMeter = meter; queuedMeter = null;
    nextStep = 0; current = -1;
    $('#position-counter').textContent = 'BAR 01 · STEP 01';
    renderSequence();
  }
  try { await saveSession(); }
  catch { toast('Time signature changed, but could not save locally.'); }
}
sessionReady.finally(() => { $('#edit-meter').disabled = false; });
$('#edit-meter').onclick = () => {
  if (editingMeter) saveAndLockMeter();
  else { editingMeter = true; renderMeter(); $('#meter-beats').focus(); }
};
[$('#meter-beats'), $('#meter-unit')].forEach(select => select.onkeydown = event => {
  if (event.key === 'Enter') { event.preventDefault(); saveAndLockMeter(); $('#edit-meter').focus(); }
  if (event.key === 'Escape') { event.preventDefault(); editingMeter = false; renderMeter(); $('#edit-meter').focus(); }
});


function renderSequenceLength() {
  const desired = queuedBars ?? scheduledBars;
  if (!editingSequenceLength) $('#sequence-bars').value = desired;
  $('#sequence-bars').disabled = !editingSequenceLength;
  const button = $('#edit-sequence-length');
  button.textContent = editingSequenceLength ? '✓' : '✎';
  button.setAttribute('aria-pressed', String(editingSequenceLength));
  button.setAttribute('aria-label', editingSequenceLength ? 'Save and lock sequence length' : 'Unlock sequence length');
  button.title = editingSequenceLength ? 'Save and lock sequence length' : 'Unlock sequence length';
  $('#sequence-length-status').textContent = queuedBars !== null || scheduledBars !== sequenceBars ? 'NEXT LOOP' : '';
}
async function saveAndLockSequenceLength() {
  if (!editingSequenceLength) return;
  const bars = +$('#sequence-bars').value;
  editingSequenceLength = false;
  if (playing) {
    queuedBars = bars === scheduledBars ? null : bars;
    renderSequenceLength();
  } else {
    sequenceBars = bars; scheduledBars = bars; queuedBars = null;
    nextStep = 0; current = -1;
    $('#position-counter').textContent = 'BAR 01 · STEP 01';
    renderSequence();
  }
  try { await saveSession(); }
  catch { toast('Sequence length changed, but could not save locally.'); }
}
sessionReady.finally(() => { $('#edit-sequence-length').disabled = false; });
$('#edit-sequence-length').onclick = () => {
  if (editingSequenceLength) saveAndLockSequenceLength();
  else { editingSequenceLength = true; renderSequenceLength(); $('#sequence-bars').focus(); }
};
$('#sequence-bars').onkeydown = event => {
  if (event.key === 'Enter') { event.preventDefault(); saveAndLockSequenceLength(); $('#edit-sequence-length').focus(); }
  if (event.key === 'Escape') { event.preventDefault(); editingSequenceLength = false; renderSequenceLength(); $('#edit-sequence-length').focus(); }
};


let archiveBusy = false, archiveDragDepth = 0;
function setArchiveBusy(busy) {
  archiveBusy = busy;
  if (busy) { archiveDragDepth = 0; $('#import-session').classList.remove('dragover'); }
  $('#export-session').disabled = busy;
  $('#import-session').disabled = busy;
}
$('#export-session').onclick = async () => {
  if (archiveBusy) return;
  setArchiveBusy(true);
  try {
    await sessionReady;
    const snapshot = captureSession();
    const library = await loopStore.get('synth-library') || [];
    const blob = sessionArchive.create(snapshot, library);
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url;
    link.download = (snapshot.name.replace(/[^a-z0-9 _-]/gi, '').trim() || 'looper-session') + '.zip';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    toast('Session exported with all samples and patterns.');
  } catch (error) { toast('Could not export session: ' + error.message); }
  finally { setArchiveBusy(false); }
};
$('#import-session').onclick = () => { if (!archiveBusy) $('#session-file').click(); };
$('#session-file').onchange = event => {
  const file = event.target.files[0];
  event.target.value = '';
  importSessionFile(file);
};
async function importSessionFile(file) {
  if (!file || archiveBusy) return;
  setArchiveBusy(true);
  try {
    await sessionReady;
    const archive = await sessionArchive.read(file);
    // Allocate every audio buffer before confirmation or any persistent mutation.
    const restored = archive.session.samples.map(s => s ? { ...s, buffer: loopStore.unpack(s.audio, audio()) } : null);
    const count = restored.filter(Boolean).length;
    if (!window.confirm('Import “' + archive.session.name + '” (' + count + ' samples)?\n\nThis will replace your current session and saved synth sounds. Export your current session first if you want to keep it.')) return;
    document.body.inert = true;
    // Commit the session and synth library together; an error leaves both untouched.
    const db = await loopStore.db();
    try {
      await new Promise((resolve, reject) => {
        const transaction = db.transaction('data', 'readwrite'), store = transaction.objectStore('data');
        store.put(archive.session, 'session');
        store.put(archive.library, 'synth-library');
        store.delete('synth-sample');
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error || new Error('Session was not saved'));
      });
    } finally { db.close(); }
    stop();
    bankEditMode = false; swapFrom = null; lastBankEdit = null;
    editingMeter = false; editingSequenceLength = false;
    setSessionNameEditing(false);
    restoreSession(archive.session, restored);
    render();
    toast('Session imported. Ready to play.');
  } catch (error) { toast('Could not import session: ' + error.message); }
  finally { document.body.inert = false; setArchiveBusy(false); }
}

const importButton = $('#import-session');
importButton.ondragenter = event => {
  event.preventDefault(); event.stopPropagation();
  if (archiveBusy || !Array.from(event.dataTransfer.types).includes('Files')) return;
  archiveDragDepth++;
  importButton.classList.add('dragover');
};
importButton.ondragover = event => {
  event.preventDefault(); event.stopPropagation();
  event.dataTransfer.dropEffect = archiveBusy ? 'none' : 'copy';
};
importButton.ondragleave = event => {
  event.preventDefault(); event.stopPropagation();
  archiveDragDepth = Math.max(0, archiveDragDepth - 1);
  if (!archiveDragDepth) importButton.classList.remove('dragover');
};
importButton.ondrop = event => {
  event.preventDefault(); event.stopPropagation();
  archiveDragDepth = 0;
  importButton.classList.remove('dragover');
  if (archiveBusy) return;
  const files = event.dataTransfer.files;
  if (!files.length) return;
  if (files.length !== 1) { toast('Drop one session ZIP at a time.'); return; }
  importSessionFile(files[0]);
};
window.addEventListener('dragend', () => {
  archiveDragDepth = 0;
  importButton.classList.remove('dragover');
});


function sessionAudioInput() {
  if (!sessionReverbBus) sessionReverbBus = looperReverb.createBus(audio(), audio().destination, sessionReverb);
  if (!sessionLofiBus) sessionLofiBus = looperLofi.createBus(audio(), sessionReverbBus.input, sessionLofi);
  return sessionLofiBus.input;
}
function renderSessionReverb() {
  $('#session-reverb-amount').value = sessionReverb.amount;
  $('#session-reverb-decay').value = sessionReverb.decay;
  $('#session-reverb-amount-value').textContent = sessionReverb.amount ? sessionReverb.amount + '%' : 'Off';
  $('#session-reverb-decay-value').textContent = sessionReverb.decay.toFixed(2) + ' s';
}
for (const [id, key] of [['session-reverb-amount', 'amount'], ['session-reverb-decay', 'decay']]) {
  $('#' + id).oninput = event => {
    sessionReverb[key] = +event.target.value;
    sessionReverbBus?.set(sessionReverb);
    renderSessionReverb();
  };
  $('#' + id).onchange = async () => {
    try { await sessionReady; await saveSession(); }
    catch { toast('Reverb changed, but could not save locally.'); }
  };
}
renderSessionReverb();

function renderSessionLofi() {
  for (const key of ['amount', 'low', 'high']) {
    $('#session-lofi-' + key).value = sessionLofi[key];
    const value = sessionLofi[key];
    $('#session-lofi-' + key + '-value').textContent = key === 'amount' ? (value ? value + '%' : 'Off') : value >= 1000 ? (value / 1000).toFixed(1) + ' kHz' : value + ' Hz';
  }
}
for (const key of ['amount', 'low', 'high']) {
  $('#session-lofi-' + key).oninput = event => {
    sessionLofi[key] = +event.target.value;
    sessionLofiBus?.set(sessionLofi);
    renderSessionLofi();
  };
  $('#session-lofi-' + key).onchange = async () => {
    try { await sessionReady; await saveSession(); }
    catch { toast('Filter changed, but could not save locally.'); }
  };
}
renderSessionLofi();

function renderPatternCopy() {
  $('#copy-pattern').setAttribute('aria-pressed', String(patternCopy?.mode === 'copy'));
  $('#swap-pattern').setAttribute('aria-pressed', String(patternCopy?.mode === 'swap'));
  const target = patternCopy?.target;
  $('#copy-pattern-status').textContent = !patternCopy ? '' : target === null ? (patternCopy.mode === 'swap' ? 'Select the pattern to swap' : 'Select the Pattern Destiny') : 'Pattern ' + String.fromCharCode(65 + target) + (patternCopy.mode === 'swap' ? ' · swap with Pattern ' + String.fromCharCode(65 + patternCopy.source) : patternBanks[target].some(row => row.some(Boolean)) ? ' · will be replaced' : '');
  $('#confirm-pattern-copy').hidden = !patternCopy || target === null;
  $('#cancel-pattern-copy').hidden = !patternCopy;
}
$('#copy-pattern').onclick = () => {
  patternCopy = patternCopy?.mode === 'copy' ? null : { mode: 'copy', source: activePattern, target: null, rows: looperCore.clonePattern(patternBanks[activePattern]) };
  renderPatternButtons();
};
$('#swap-pattern').onclick = () => {
  patternCopy = patternCopy?.mode === 'swap' ? null : { mode: 'swap', source: activePattern, target: null };
  renderPatternButtons();
};
$('#cancel-pattern-copy').onclick = () => { patternCopy = null; renderPatternButtons(); };
$('#confirm-pattern-copy').onclick = async () => {
  if (!patternCopy || patternCopy.target === null) return;
  const { source, target, mode } = patternCopy;
  if (mode === 'swap') looperCore.swapPatterns(patternBanks, source, target);
  else looperCore.replacePattern(patternBanks[target], patternCopy.rows);
  patternCopy = null;
  renderSequence();
  try { await sessionReady; await saveSession(); toast('Pattern ' + String.fromCharCode(65 + source) + (mode === 'swap' ? ' swapped with Pattern ' : ' copied to Pattern ') + String.fromCharCode(65 + target)); }
  catch { toast('Patterns updated, but could not save locally.'); }
};
