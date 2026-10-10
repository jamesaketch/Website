/* Progressive enhancements; all core content remains available without these. */
(function () {
  'use strict';
  const root = document.documentElement;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const still = () => motion.matches || root.dataset.motion === 'reduced';
  document.querySelectorAll('.mathline').forEach(line => { if (line.scrollWidth > line.clientWidth + 2) { line.tabIndex = 0; line.setAttribute('aria-label', 'Equation. Scroll horizontally to see the full expression.'); } });
  document.querySelectorAll('[data-copy]').forEach(button => { button.style.minWidth = Math.ceil(button.getBoundingClientRect().width) + 'px'; });
  // Header access to the same command menu already used by keyboard users.
  const toolbar = document.querySelector('.tools');
  if (toolbar) {
    const button = document.createElement('button'); button.className = 'tbtn'; button.type = 'button'; button.setAttribute('aria-label','Search pages and actions');
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>';
    button.addEventListener('click', () => window.__aketch?.palette()); toolbar.prepend(button);
  }
  if (document.body.classList.contains('photo-page')) {
    const light = document.createElement('div'); light.className='safelight'; light.setAttribute('aria-hidden','true'); document.body.prepend(light);
    let queued=false, x=0, y=0;
    document.addEventListener('pointermove', event => {
      if (still() || event.pointerType !== 'mouse') return;
      x=event.clientX; y=event.clientY;
      if (!queued) { queued=true; requestAnimationFrame(() => {light.style.setProperty('--light-x', x+'px');light.style.setProperty('--light-y',y+'px');queued=false;}); }
    },{passive:true});
    function bloom() {
      if (still() || root.dataset.contrast==='high') return;
      const layer=document.createElement('div');layer.className='darkroom-bloom';layer.setAttribute('aria-hidden','true');document.body.append(layer);layer.addEventListener('animationend',()=>layer.remove(),{once:true});
    }
    let wasDark=root.classList.contains('darkroom');
    new MutationObserver(()=>{const dark=root.classList.contains('darkroom');if(dark&&!wasDark)bloom();wasDark=dark;}).observe(root,{attributes:true,attributeFilter:['class']});
  }
  // Optional read-aloud. Never starts until the visitor explicitly presses Listen.
  if ('speechSynthesis' in window) {
    let owner=null, utterance=null, queue=[], generation=0;
    const synth=window.speechSynthesis;
    function stop() {generation++;queue=[];synth.cancel();if(owner){owner.button.textContent='Listen';owner.button.setAttribute('aria-pressed','false');owner.pause.hidden=true;owner.stop.hidden=true;owner.status.textContent='';}owner=null;}
    function next(token) {
      if(token!==generation || !owner)return;
      if(!queue.length){stop();return;}
      utterance=new SpeechSynthesisUtterance(queue.shift());utterance.lang='en-IE';utterance.rate=Number(owner.speed.value);
      const voices=synth.getVoices();const v=voices.find(v=>v.lang==='en-IE')||voices.find(v=>v.lang==='en-GB');if(v)utterance.voice=v;
      utterance.onend=()=>next(token);utterance.onerror=e=>{if(e.error!=='interrupted'&&e.error!=='canceled'&&token===generation){const old=owner;stop();if(old)old.status.textContent='Read-aloud is unavailable on this device.';}};
      synth.speak(utterance);
    }
    const targets=[...document.querySelectorAll('.math-card')].map(el=>({el,anchor:el.querySelector('.msub'),text:()=>[el.querySelector('h4')?.textContent,el.querySelector('.msub')?.textContent,el.querySelector('.math-say .v.on')?.textContent,el.querySelector('.try-note')?.textContent].filter(Boolean).join('. ')}));
    const thesis=document.querySelector('#thesis');if(thesis)targets.unshift({el:thesis,anchor:thesis.querySelector('.actions')||thesis.querySelector('h2'),text:()=>[...thesis.querySelectorAll('h2,p.body')].map(p=>p.textContent).join('. ')});
    targets.forEach(target=>{
      if(!target.anchor)return;
      const bar=document.createElement('div');bar.className='listen-bar';bar.innerHTML='<button class="chip" type="button" aria-pressed="false">Listen</button><button class="chip" type="button" hidden>Pause</button><button class="chip" type="button" hidden>Stop</button><label class="sr-only">Reading speed</label><select aria-label="Reading speed"><option value="0.85">0.85×</option><option value="1" selected>1×</option><option value="1.2">1.2×</option><option value="1.5">1.5×</option></select><span class="listen-status" role="status"></span>';
      target.anchor.after(bar);const buttons=bar.querySelectorAll('button');const control={button:buttons[0],pause:buttons[1],stop:buttons[2],speed:bar.querySelector('select'),status:bar.querySelector('.listen-status')};
      control.button.addEventListener('click',()=>{if(owner===control){stop();return;}stop();owner=control;queue=target.text().replace(/\s+/g,' ').match(/[^.!?]+[.!?]?/g)||[];control.button.textContent='Reading';control.button.setAttribute('aria-pressed','true');control.pause.hidden=control.stop.hidden=false;control.pause.textContent='Pause';control.status.textContent='Reading aloud';next(generation);});
      control.pause.addEventListener('click',()=>{if(synth.paused){synth.resume();control.pause.textContent='Pause';control.status.textContent='Reading aloud';}else{synth.pause();control.pause.textContent='Resume';control.status.textContent='Paused';}});
      control.stop.addEventListener('click',stop);
    });
    window.addEventListener('pagehide',stop);
  }
})();
/* Optional push-to-talk command search. Recognition is never started automatically. */
(function(){
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Recognition)return;
 const observe=new MutationObserver(()=>{const palette=document.querySelector('dialog.palette');if(!palette||palette.querySelector('.voice-search'))return;
  const row=document.createElement('div');row.className='voice-search';row.innerHTML='<button class="chip" type="button">Voice search</button><span class="listen-status" role="status">Uses your microphone; your browser may process speech online.</span>';palette.prepend(row);
  const button=row.querySelector('button'),status=row.querySelector('span');let recognition=null;
  button.addEventListener('click',()=>{if(recognition){recognition.stop();return;}const r=new Recognition();recognition=r;r.lang='en-IE';r.continuous=false;r.interimResults=false;r.onresult=event=>{const text=event.results[0][0].transcript.replace(/^(open|show|go to)\s+/i,'').replace(/[.!?]$/,'');const input=palette.querySelector('input');input.value=text;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();status.textContent='Choose a result to continue.';};r.onerror=()=>{status.textContent='Voice search is unavailable. You can type instead.';};r.onend=()=>{recognition=null;button.textContent='Voice search';if(status.textContent==='Listening…')status.textContent='You can type or try again.';};try{r.start();button.textContent='Stop listening';status.textContent='Listening…';}catch{recognition=null;status.textContent='Voice search is unavailable. You can type instead.';}});
  palette.addEventListener('close',()=>{recognition?.abort();});window.addEventListener('pagehide',()=>recognition?.abort());
 });observe.observe(document.body,{childList:true});
})();
(function(){
 document.querySelectorAll('.math-card').forEach(card=>card.addEventListener('mathtermchange',event=>{
  const key=event.detail.key||'',tryBox=card.querySelector('.try');if(!tryBox)return;tryBox.dataset.activeTerm=key;
  tryBox.querySelectorAll('.rng').forEach(label=>{const input=label.querySelector('input');const relevant=key==='nu'&&tryBox.dataset.viz==='tdist'||key===input?.dataset.s||key==='kappa'&&tryBox.dataset.viz==='trans';label.classList.toggle('is-linked',!!relevant);});
 }));
})();
