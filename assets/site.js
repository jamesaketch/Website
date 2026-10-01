/* aketch.ie shared script. Every feature checks for its own markup first, so one file serves every page. */
(function () {
  'use strict';
  var EMAIL = 'hello@aketch.ie';
  var root = document.documentElement;
  var fine = window.matchMedia('(pointer: fine)').matches;
  function reducedMotion() { return root.getAttribute('data-motion') === 'reduced' || window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  /* ---------------- theme ---------------- */
  function isDark() { var t = root.getAttribute('data-theme'); return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches; }
  function toggleTheme() { var next = isDark() ? 'light' : 'dark'; root.setAttribute('data-theme', next); store('theme', next); }
  var themeBtn = document.querySelector('.tbtn.theme');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  /* ---------------- accessibility ---------------- */
  var FONT_URL = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&display=swap';
  var prefs = {};
  try { prefs = JSON.parse(read('a11y') || '{}'); } catch (e) { prefs = {}; }
  var OPTIONS = [
    { key: 'text', attr: 'data-text', val: 'large', title: 'Larger text', desc: 'Scales the whole page up by about a fifth.' },
    { key: 'contrast', attr: 'data-contrast', val: 'high', title: 'High contrast', desc: 'Stronger text and borders, no background texture, underlined links.' },
    { key: 'font', attr: 'data-font', val: 'readable', title: 'Low-vision font', desc: 'Atkinson Hyperlegible, designed by the Braille Institute for readers with low vision.' },
    { key: 'motion', attr: 'data-motion', val: 'reduced', title: 'Reduce motion', desc: 'Stops the animations and the spinning orbit.' }
  ];
  function current(o) { return root.getAttribute(o.attr) === o.val; }
  function loadFont() {
    if (document.getElementById('a11y-font')) return;
    var l = document.createElement('link'); l.id = 'a11y-font'; l.rel = 'stylesheet'; l.href = FONT_URL; document.head.appendChild(l);
  }
  if (current(OPTIONS[2])) loadFont();
  function setOpt(o, on) {
    if (on) root.setAttribute(o.attr, o.val); else root.removeAttribute(o.attr);
    prefs[o.key] = on; store('a11y', JSON.stringify(prefs));
    if (o.key === 'font' && on) loadFont();
  }

  var panel = null, a11yBtn = document.querySelector('.tbtn.abtn');
  function buildPanel() {
    panel = document.createElement('div');
    panel.className = 'a11y-panel'; panel.id = 'a11y'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Accessibility options');
    var html = '<p class="t">Accessibility</p><p class="d">These settings are remembered on this device.</p>';
    OPTIONS.forEach(function (o, i) {
      html += '<button class="opt" type="button" data-i="' + i + '" aria-pressed="' + current(o) + '"><span><b>' + o.title + '</b><small>' + o.desc + '</small></span><span class="sw" aria-hidden="true"></span></button>';
    });
    html += '<button class="chip reset" type="button">Reset to default</button>';
    panel.innerHTML = html;
    document.body.appendChild(panel);
    panel.querySelectorAll('.opt').forEach(function (b) {
      b.addEventListener('click', function () {
        var o = OPTIONS[+b.getAttribute('data-i')]; var on = !current(o);
        setOpt(o, on); b.setAttribute('aria-pressed', on);
      });
    });
    panel.querySelector('.reset').addEventListener('click', function () {
      OPTIONS.forEach(function (o) { root.removeAttribute(o.attr); });
      prefs = {}; store('a11y', '{}');
      panel.querySelectorAll('.opt').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
    });
    panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(true); });
  }
  function openPanel() {
    if (!panel) buildPanel();
    panel.hidden = false; if (a11yBtn) a11yBtn.setAttribute('aria-expanded', 'true');
    var first = panel.querySelector('.opt'); if (first) first.focus();
  }
  function closePanel(refocus) {
    if (!panel || panel.hidden) return;
    panel.hidden = true; if (a11yBtn) { a11yBtn.setAttribute('aria-expanded', 'false'); if (refocus) a11yBtn.focus(); }
  }
  if (a11yBtn) a11yBtn.addEventListener('click', function (e) { e.stopPropagation(); if (panel && !panel.hidden) closePanel(); else openPanel(); });
  document.addEventListener('click', function (e) { if (panel && !panel.hidden && !panel.contains(e.target)) closePanel(); });

  /* ---------------- credits ---------------- */
  var credits = null;
  function openCredits() {
    if (!credits) {
      credits = document.createElement('dialog');
      credits.className = 'credits'; credits.setAttribute('aria-label', 'Site credits');
      credits.innerHTML = '<h2>Credits</h2><dl>' +
        '<dt>Site</dt><dd>James Rafiki Aketch</dd>' +
        '<dt>Type</dt><dd>Instrument Serif and Hanken Grotesk. Atkinson Hyperlegible by the Braille Institute in accessibility mode.</dd>' +
        '<dt>Hosting</dt><dd>GitHub Pages</dd>' +
        '<dt>Made in</dt><dd>Dublin, Ireland</dd></dl>' +
        '<button class="btn ghost" type="button">Close</button>';
      document.body.appendChild(credits);
      credits.querySelector('button').addEventListener('click', function () { credits.close(); });
      credits.addEventListener('click', function (e) { if (e.target === credits) credits.close(); });
    }
    if (typeof credits.showModal === 'function') credits.showModal(); else credits.setAttribute('open', '');
  }
  document.querySelectorAll('.credits-open').forEach(function (b) { b.addEventListener('click', openCredits); });

  /* ---------------- copy helpers ---------------- */
  function copy(text, done) { if (navigator.clipboard) navigator.clipboard.writeText(text).then(done || function () {}, function () {}); }
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    var label = btn.textContent;
    btn.addEventListener('click', function () {
      copy(btn.getAttribute('data-copy'), function () {
        btn.textContent = 'Copied'; btn.classList.add('done');
        setTimeout(function () { btn.textContent = label; btn.classList.remove('done'); }, 1800);
      });
    });
  });

  /* ---------------- custom right-click menu ---------------- */
  var ICON = {
    mail: '<path d="M3 6h18v12H3z"/><path d="M3 7l9 6 9-6"/>',
    cv: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
    down: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    theme: '<path d="M12 3a9 9 0 1 0 0 18z"/><circle cx="12" cy="12" r="9"/>',
    access: '<circle cx="12" cy="4.5" r="1.6"/><path d="M5 8.5l7 1.5 7-1.5M12 10v4.5M12 14.5l-3 6M12 14.5l3 6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'
  };
  var ITEMS = [
    { icon: 'mail', label: 'Copy email address', run: function (b) { copy(EMAIL, function () { flash(b, 'Email copied'); }); return true; } },
    { icon: 'cv', label: 'View CV', run: function () { location.href = 'cv.html'; } },
    { icon: 'down', label: 'Download CV as PDF', run: function () { location.href = 'cv.html#print'; } },
    { icon: 'search', label: 'Jump anywhere', run: function () { setTimeout(function () { window.__aketch.palette(); }, 0); } },
    null,
    { icon: 'theme', label: 'Switch light or dark', run: toggleTheme },
    { icon: 'access', label: 'Accessibility options', run: function () { setTimeout(openPanel, 0); } },
    { icon: 'info', label: 'Site credits', run: openCredits }
  ];
  var menu = null;
  function flash(b, text) { var span = b.querySelector('span'); span.textContent = text; setTimeout(hideMenu, 700); }
  function buildMenu() {
    menu = document.createElement('div');
    menu.className = 'cmenu'; menu.setAttribute('role', 'menu'); menu.hidden = true;
    ITEMS.forEach(function (it) {
      if (!it) { menu.appendChild(document.createElement('hr')); return; }
      var b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'menuitem');
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[it.icon] + '</svg><span>' + it.label + '</span>';
      b.addEventListener('click', function () { var keep = it.run(b); if (!keep) hideMenu(); });
      menu.appendChild(b);
    });
    var hint = document.createElement('p'); hint.className = 'hint';
    hint.textContent = 'Shift + right-click for your browser menu';
    menu.appendChild(hint);
    document.body.appendChild(menu);
    menu.addEventListener('keydown', function (e) {
      var items = [].slice.call(menu.querySelectorAll('button'));
      var i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      else if (e.key === 'Escape' || e.key === 'Tab') { hideMenu(); }
    });
  }
  function hideMenu() { if (menu) menu.hidden = true; }
  function showMenu(x, y) {
    if (!menu) buildMenu();
    menu.querySelectorAll('button span').forEach(function (s, i) {
      var it = ITEMS.filter(Boolean)[i]; s.textContent = it.label;
    });
    menu.hidden = false;
    var w = menu.offsetWidth, h = menu.offsetHeight;
    menu.style.left = Math.max(8, Math.min(x, innerWidth - w - 8)) + 'px';
    menu.style.top = Math.max(8, Math.min(y, innerHeight - h - 8)) + 'px';
    menu.querySelector('button').focus({ preventScroll: true });
  }
  document.addEventListener('contextmenu', function (e) {
    // keep the browser menu: Shift held, touch screens, links, images, form fields, or when text is selected
    if (e.shiftKey || !fine) return;
    if (e.target.closest && e.target.closest('a, img, input, textarea, select, video, [contenteditable]')) return;
    var sel = window.getSelection && String(window.getSelection());
    if (sel) return;
    e.preventDefault();
    showMenu(e.clientX, e.clientY);
  });
  document.addEventListener('click', function (e) { if (menu && !menu.hidden && !menu.contains(e.target)) hideMenu(); });
  window.addEventListener('scroll', hideMenu, { passive: true });
  window.addEventListener('resize', hideMenu);
  window.addEventListener('blur', hideMenu);

  /* ---------------- files that may or may not exist yet (PDFs) ---------------- */
  document.querySelectorAll('[data-file]').forEach(function (el) {
    var url = el.getAttribute('data-file');
    fetch(url, { method: 'HEAD' }).then(function (r) {
      if (!r.ok) return;
      el.setAttribute('href', url); el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener');
      if (el.classList.contains('status')) el.textContent = 'Read the PDF';
      el.hidden = false;
    }).catch(function () {});
  });

  /* ---------------- reading progress and current section ---------------- */
  var bar = document.querySelector('.bar');
  if (bar) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        var h = document.documentElement.scrollHeight - innerHeight;
        bar.style.setProperty('--p', h > 0 ? Math.min(1, scrollY / h) : 0);
        ticking = false;
      });
    }, { passive: true });
  }
  var links = {};
  document.querySelectorAll('.bar nav a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
  if (Object.keys(links).length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && links[en.target.id]) {
          Object.keys(links).forEach(function (k) { links[k].classList.remove('on'); });
          links[en.target.id].classList.add('on');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(links).forEach(function (id) { var sec = document.getElementById(id); if (sec) io.observe(sec); });
  }

  /* ---------------- Dublin clock (Europe/Dublin, so summer time is handled) ---------------- */
  var timeEls = document.querySelectorAll('.dublin-time');
  var clocks = document.querySelectorAll('svg.clock');
  function dublinNow() {
    var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Dublin', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    var h = 0, m = 0;
    parts.forEach(function (p) { if (p.type === 'hour') h = +p.value; if (p.type === 'minute') m = +p.value; });
    return { h: h, m: m };
  }
  function tick() {
    try {
      var t = dublinNow();
      var label = (t.h < 10 ? '0' : '') + t.h + ':' + (t.m < 10 ? '0' : '') + t.m;
      timeEls.forEach(function (el) { el.textContent = label; });
      clocks.forEach(function (c) {
        var hh = c.querySelector('.hh'), mh = c.querySelector('.mh');
        if (hh) hh.setAttribute('transform', 'rotate(' + ((t.h % 12) * 30 + t.m * 0.5) + ' 12 12)');
        if (mh) mh.setAttribute('transform', 'rotate(' + (t.m * 6) + ' 12 12)');
        c.setAttribute('aria-label', 'Dublin time ' + label);
      });
    } catch (e) {}
  }
  if (timeEls.length || clocks.length) { tick(); setInterval(tick, 20000); }

  /* ---------------- AmC orbit: gentle tilt and ring highlights ---------------- */
  var orbit = document.querySelector('.orbit');
  var amc = document.querySelector('.amc');
  if (orbit && amc) {
    var mobile = window.matchMedia('(max-width: 720px)');
    amc.addEventListener('pointermove', function (e) {
      if (!fine || reducedMotion() || mobile.matches) return;
      var r = orbit.getBoundingClientRect();
      var dx = (e.clientX - (r.left + r.width / 2)) / (amc.offsetWidth / 2);
      var dy = (e.clientY - (r.top + r.height / 2)) / (amc.offsetHeight / 2);
      dx = Math.max(-1, Math.min(1, dx)); dy = Math.max(-1, Math.min(1, dy));
      orbit.style.setProperty('--ry', (dx * 12).toFixed(2) + 'deg');
      orbit.style.setProperty('--rx', (-dy * 12).toFixed(2) + 'deg');
    });
    amc.addEventListener('pointerleave', function () {
      orbit.style.setProperty('--ry', '0deg'); orbit.style.setProperty('--rx', '0deg'); orbit.removeAttribute('data-ring');
    });
    orbit.querySelectorAll('.hit').forEach(function (h) {
      var n = h.getAttribute('data-ring');
      h.addEventListener('pointerenter', function () { orbit.setAttribute('data-ring', n); });
      h.addEventListener('pointerleave', function () { orbit.removeAttribute('data-ring'); });
      h.addEventListener('pointerdown', function () { orbit.setAttribute('data-ring', orbit.getAttribute('data-ring') === n ? '' : n); });
    });
  }

  /* ---------------- photography gallery ----------------
     Discovery never downloads a photo. It reads photos/photos.json if present,
     otherwise asks the server (HEAD, headers only) whether photo-1.jpg, photo-2.jpg ... exist.
     The images themselves load lazily as they scroll into view. */
  var gallery = document.querySelector('.gallery[data-auto]');
  if (gallery) {
    var items = [], current = 0, viewer, vimg, vcount;
    function exists(url) { return fetch(url, { method: 'HEAD', cache: 'no-cache' }).then(function (r) { return r.ok; }).catch(function () { return false; }); }
    async function discover() {
      try {
        var r = await fetch('photos/photos.json', { cache: 'no-cache' });
        if (r.ok) {
          var list = await r.json();
          return list.map(function (p, i) {
            return typeof p === 'string' ? { src: p, alt: 'Photograph by James Aketch, ' + (i + 1) } : { src: p.src, alt: p.alt || 'Photograph by James Aketch', w: p.w, h: p.h };
          });
        }
      } catch (e) {}
      var out = [], n = 1;
      while (n <= 300) {
        var batch = [];
        for (var k = 0; k < 6; k++) batch.push(exists('photos/photo-' + (n + k) + '.jpg'));
        var res = await Promise.all(batch);
        for (var j = 0; j < res.length; j++) {
          if (!res[j]) return out;
          out.push({ src: 'photos/photo-' + (n + j) + '.jpg', alt: 'Photograph by James Aketch, ' + (n + j) });
        }
        n += 6;
      }
      return out;
    }
    function buildViewer() {
      viewer = document.createElement('dialog');
      viewer.id = 'viewer'; viewer.setAttribute('aria-label', 'Photo viewer');
      viewer.innerHTML =
        '<button class="vbtn vclose" type="button" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg></button>' +
        '<button class="vbtn vprev" type="button" aria-label="Previous photo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>' +
        '<img alt="">' +
        '<button class="vbtn vnext" type="button" aria-label="Next photo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></button>' +
        '<p class="vcount" aria-live="polite"></p>';
      document.body.appendChild(viewer);
      vimg = viewer.querySelector('img'); vcount = viewer.querySelector('.vcount');
      viewer.querySelector('.vclose').addEventListener('click', function () { viewer.close(); });
      viewer.querySelector('.vprev').addEventListener('click', function () { show(current - 1); });
      viewer.querySelector('.vnext').addEventListener('click', function () { show(current + 1); });
      viewer.addEventListener('close', function () { document.body.style.overflow = ''; });
      viewer.addEventListener('click', function (e) { if (e.target === viewer) viewer.close(); });
      viewer.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') show(current - 1);
        if (e.key === 'ArrowRight') show(current + 1);
      });
      var x0 = null;
      viewer.addEventListener('touchstart', function (e) { x0 = e.changedTouches[0].clientX; }, { passive: true });
      viewer.addEventListener('touchend', function (e) {
        if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
        if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
      }, { passive: true });
    }
    function show(i) {
      current = (i + items.length) % items.length;
      vimg.src = items[current].src; vimg.alt = items[current].alt;
      vcount.textContent = (current + 1) + ' of ' + items.length;
    }
    function openAt(i) {
      if (!viewer) buildViewer();
      show(i);
      if (typeof viewer.showModal === 'function') viewer.showModal(); else viewer.setAttribute('open', '');
      document.body.style.overflow = 'hidden';
    }
    discover().then(function (list) {
      items = list;
      var empty = document.querySelector('.empty');
      if (!items.length) { if (empty) empty.hidden = false; return; }
      items.forEach(function (it, idx) {
        var fig = document.createElement('figure'); fig.className = 'shot';
        var btn = document.createElement('button'); btn.type = 'button';
        btn.setAttribute('aria-label', 'Open photo ' + (idx + 1) + ' of ' + items.length);
        var img = document.createElement('img');
        img.loading = 'lazy'; img.decoding = 'async'; img.alt = it.alt;
        if (it.w && it.h) { img.width = it.w; img.height = it.h; }
        else { img.style.aspectRatio = '4 / 5'; img.addEventListener('load', function () { img.style.aspectRatio = ''; }); }
        img.src = it.src;
        btn.appendChild(img);
        btn.addEventListener('click', function () { openAt(idx); });
        fig.appendChild(btn); gallery.appendChild(fig);
      });
    });
  }

  window.__aketch = { toggleTheme: toggleTheme, openPanel: openPanel, openCredits: openCredits, copy: copy };

  /* ---------------- CV: cv.html#print opens the save-as-PDF dialog ---------------- */
  document.querySelectorAll('.print-cv').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });
  if (document.querySelector('.cv') && location.hash === '#print') {
    var go = function () { setTimeout(function () { window.print(); }, 300); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else window.addEventListener('load', go);
  }
})();

/* ===================== round 3: palette, skills, braille, simulator ===================== */
(function () {
  'use strict';
  var A = window.__aketch || {};
  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  document.querySelectorAll('.kmod').forEach(function (k) { k.textContent = isMac ? '⌘' : 'Ctrl'; });
  function reduced() { return document.documentElement.getAttribute('data-motion') === 'reduced' || window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  /* ---------- command palette ---------- */
  var CITE = 'Aketch, J. R. (2026). Is housing like Irish weather? Volatility regimes and asymmetric transmission in the Irish housing market [Undergraduate thesis]. University College Dublin.';
  var ENTRIES = [
    { t: 'Home', k: 'start top index', go: 'index.html' },
    { t: 'About', k: 'bio me', go: 'index.html#about' },
    { t: 'Research', k: 'thesis papers housing brexit', go: 'research.html' },
    { t: 'Regime simulator', k: 'model play markov switching interactive', go: 'research.html#simulator' },
    { t: 'Skills', k: 'python code methods tools', go: 'index.html#skills' },
    { t: 'Beyond the work', k: 'rugby braille languages interests', go: 'index.html#beyond' },
    { t: 'Education', k: 'ucd degree certificates bloomberg', go: 'index.html#education' },
    { t: 'Photography', k: 'photos gallery instagram', go: 'photography.html' },
    { t: 'CV', k: 'resume', go: 'cv.html' },
    { t: 'Angular Momentum Capital', k: 'amc quant fund', go: 'index.html#amc' },
    { t: 'Contact', k: 'email reach', go: 'index.html#contact' },
    { t: 'Copy email address', k: 'mail', act: function () { A.copy && A.copy('hello@aketch.ie'); }, hint: 'Action' },
    { t: 'Copy thesis citation', k: 'cite reference apa', act: function () { A.copy && A.copy(CITE); }, hint: 'Action' },
    { t: 'Download CV as PDF', k: 'print resume', go: 'cv.html#print', hint: 'Action' },
    { t: 'Switch light or dark', k: 'theme mode', act: function () { A.toggleTheme && A.toggleTheme(); }, hint: 'Action' },
    { t: 'Accessibility options', k: 'contrast text font motion', act: function () { setTimeout(function () { A.openPanel && A.openPanel(); }, 0); }, hint: 'Action' },
    { t: 'Site credits', k: 'about site fonts', act: function () { A.openCredits && A.openCredits(); }, hint: 'Action' }
  ];
  var pal = null, input, list, shown = [], sel = 0;
  function render() {
    var q = input.value.trim().toLowerCase();
    shown = ENTRIES.filter(function (e) { return !q || (e.t + ' ' + e.k).toLowerCase().indexOf(q) > -1; });
    sel = 0;
    list.innerHTML = shown.length ? '' : '<li class="none">Nothing matches that. Try "thesis" or "email".</li>';
    shown.forEach(function (e, i) {
      var li = document.createElement('li');
      li.id = 'pal-' + i; li.setAttribute('role', 'option');
      li.innerHTML = '<span>' + e.t + '</span><small>' + (e.hint || 'Go to') + '</small>';
      li.addEventListener('click', function () { run(i); });
      li.addEventListener('mousemove', function () { mark(i); });
      list.appendChild(li);
    });
    mark(0);
  }
  function mark(i) {
    sel = i;
    list.querySelectorAll('li[role="option"]').forEach(function (li, j) { li.setAttribute('aria-selected', j === i ? 'true' : 'false'); });
    var cur = document.getElementById('pal-' + i);
    if (cur) { input.setAttribute('aria-activedescendant', cur.id); cur.scrollIntoView({ block: 'nearest' }); }
  }
  function run(i) {
    var e = shown[i]; if (!e) return;
    pal.close();
    if (e.act) e.act(); else location.href = e.go;
  }
  function openPalette() {
    if (!pal) {
      pal = document.createElement('dialog');
      pal.className = 'palette'; pal.setAttribute('aria-label', 'Jump anywhere');
      pal.innerHTML = '<input type="text" placeholder="Jump to a page or action" aria-label="Search the site" role="combobox" aria-expanded="true" aria-controls="pal-list" autocomplete="off"><ul id="pal-list" role="listbox"></ul>';
      document.body.appendChild(pal);
      input = pal.querySelector('input'); list = pal.querySelector('ul');
      input.addEventListener('input', render);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); mark(Math.min(sel + 1, shown.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); mark(Math.max(sel - 1, 0)); }
        else if (e.key === 'Enter') { e.preventDefault(); run(sel); }
      });
      pal.addEventListener('click', function (e) { if (e.target === pal) pal.close(); });
    }
    input.value = ''; render();
    if (typeof pal.showModal === 'function') pal.showModal(); else pal.setAttribute('open', '');
    input.focus();
  }
  A.palette = openPalette; window.__aketch = A;
  document.addEventListener('keydown', function (e) {
    var typing = /INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '') || (e.target && e.target.isContentEditable);
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); openPalette(); }
    else if (e.key === '/' && !typing) { e.preventDefault(); openPalette(); }
  });
  document.querySelectorAll('.palette-open').forEach(function (b) { b.addEventListener('click', openPalette); });

  /* ---------- skills: filter and "where I used it" ---------- */
  var skills = document.querySelector('.skills');
  if (skills) {
    var used = document.querySelector('.used');
    var filters = document.querySelectorAll('.filters .chip');
    filters.forEach(function (f) {
      f.addEventListener('click', function () {
        var g = f.getAttribute('data-f');
        filters.forEach(function (x) { x.setAttribute('aria-pressed', x === f ? 'true' : 'false'); });
        skills.querySelectorAll('li').forEach(function (li) { li.hidden = g !== 'all' && li.getAttribute('data-g') !== g; });
        used.innerHTML = '&nbsp;';
      });
    });
    var say = function (btn) {
      skills.querySelectorAll('.skill').forEach(function (b) { b.classList.toggle('on', b === btn); });
      used.innerHTML = '<b>' + btn.firstChild.textContent + '</b>: ' + btn.getAttribute('data-used');
    };
    skills.querySelectorAll('.skill').forEach(function (b) {
      b.addEventListener('mouseenter', function () { say(b); });
      b.addEventListener('focus', function () { say(b); });
      b.addEventListener('click', function () { say(b); });
    });
  }

  /* ---------- braille name (uncontracted, standard six-dot cells) ---------- */
  var DOTS = { a: '1', b: '12', c: '14', d: '145', e: '15', f: '124', g: '1245', h: '125', i: '24', j: '245', k: '13', l: '123', m: '134', n: '1345', o: '135', p: '1234', q: '12345', r: '1235', s: '234', t: '2345', u: '136', v: '1236', w: '2456', x: '1346', y: '13456', z: '1356' };
  var POS = { 1: [9, 9], 2: [9, 25], 3: [9, 41], 4: [25, 9], 5: [25, 25], 6: [25, 41] };
  document.querySelectorAll('.braille[data-word]').forEach(function (box) {
    var word = box.getAttribute('data-word').toLowerCase();
    box.setAttribute('role', 'img'); box.setAttribute('aria-label', word + ' written in braille');
    word.split('').forEach(function (ch) {
      var on = DOTS[ch] || '';
      var svg = '<svg viewBox="0 0 34 50" aria-hidden="true">';
      for (var d = 1; d <= 6; d++) svg += '<circle class="dot' + (on.indexOf(String(d)) > -1 ? ' up' : '') + '" cx="' + POS[d][0] + '" cy="' + POS[d][1] + '" r="5"/>';
      svg += '</svg>';
      var cell = document.createElement('span'); cell.className = 'cell';
      cell.innerHTML = svg + '<span class="lt" aria-hidden="true">' + ch.toUpperCase() + '</span>';
      box.appendChild(cell);
    });
    box.addEventListener('click', function () { box.classList.toggle('read'); });
  });

  /* ---------- regime-switching simulator ---------- */
  var sim = document.querySelector('.sim');
  if (sim) {
    var T = 300, W = 800, H = 260;
    var pc = sim.querySelector('#p-calm'), pv = sim.querySelector('#p-vol');
    var oc = sim.querySelector('#o-calm'), ov = sim.querySelector('#o-vol');
    var bands = sim.querySelector('.bands'), line = sim.querySelector('.line'), clip = sim.querySelector('#sim-clip rect');
    var summary = sim.querySelector('.sim-summary');
    var seed = 20260101, U = [], Z = [];
    function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    function draws() {
      var r = rng(seed); U = []; Z = [];
      for (var i = 0; i < T; i++) { U.push(r()); var u1 = r() || 1e-9, u2 = r(); Z.push(Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)); }
    }
    function simulate() {
      var p11 = +pc.value, p22 = +pv.value;
      var pi2 = (1 - p11) / ((1 - p11) + (1 - p22));
      var mu = [0.18, -0.25], sg = [0.55, 2.1];
      var s = U[0] < pi2 ? 1 : 0, x = 0, xs = [], ss = [], switches = 0;
      for (var t = 0; t < T; t++) {
        if (t > 0) { var stay = s === 0 ? p11 : p22; if (U[t] >= stay) { s = 1 - s; switches++; } }
        x += mu[s] + sg[s] * Z[t]; xs.push(x); ss.push(s);
      }
      return { xs: xs, ss: ss, p11: p11, p22: p22, pi2: pi2, switches: switches };
    }
    function draw(animate) {
      var r = simulate();
      var lo = Math.min.apply(null, r.xs), hi = Math.max.apply(null, r.xs), pad = (hi - lo) * 0.08 || 1;
      lo -= pad; hi += pad;
      var X = function (t) { return (t / (T - 1)) * W; }, Y = function (v) { return H - ((v - lo) / (hi - lo)) * H; };
      var d = '';
      r.xs.forEach(function (v, t) { d += (t ? 'L' : 'M') + X(t).toFixed(1) + ' ' + Y(v).toFixed(1); });
      line.setAttribute('d', d);
      var b = '', start = null;
      for (var t = 0; t <= T; t++) {
        var vol = t < T && r.ss[t] === 1;
        if (vol && start === null) start = t;
        if (!vol && start !== null) { b += '<rect class="band" x="' + X(start).toFixed(1) + '" y="0" width="' + Math.max(2, X(t) - X(start)).toFixed(1) + '" height="' + H + '"/>'; start = null; }
      }
      bands.innerHTML = b;
      var dc = 1 / (1 - r.p11), dv = 1 / (1 - r.p22);
      oc.textContent = r.p11.toFixed(3) + ', calm spells last about ' + Math.round(dc) + ' periods';
      ov.textContent = r.p22.toFixed(3) + ', volatile spells last about ' + Math.round(dv) + ' periods';
      summary.textContent = 'In the long run this market spends ' + Math.round(r.pi2 * 100) + '% of its time in the volatile regime. This draw switched regime ' + r.switches + ' times.';
      if (animate && !reduced()) {
        var t0 = null;
        var step = function (ts) { if (!t0) t0 = ts; var k = Math.min(1, (ts - t0) / 1100); clip.setAttribute('width', (W * (1 - Math.pow(1 - k, 3))).toFixed(1)); if (k < 1) requestAnimationFrame(step); };
        clip.setAttribute('width', '0'); requestAnimationFrame(step);
      } else clip.setAttribute('width', W);
    }
    draws(); draw(true);
    pc.addEventListener('input', function () { draw(false); });
    pv.addEventListener('input', function () { draw(false); });
    sim.querySelector('.redraw').addEventListener('click', function () { seed = (seed * 1103515245 + 12345) >>> 0; draws(); draw(true); });
    sim.querySelector('.reset-sim').addEventListener('click', function () { pc.value = 0.97; pv.value = 0.9; draw(false); });
  }
})();
