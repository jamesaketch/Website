/* Clear protective sleeve over paper covers. Click (or drag the corner) to peel it off;
   once peeled, the cover links straight to the PDF. Geometry: the fold line is the
   perpendicular bisector between the sleeve corner and where it has been pulled to. */
(function () {
'use strict';
var mq = matchMedia('(prefers-reduced-motion: reduce)');
function still() { return mq.matches || document.documentElement.dataset.motion === 'reduced'; }
var NS = 'http://www.w3.org/2000/svg', uid = 0;

function side(X, M, n) { return (X[0] - M[0]) * n[0] + (X[1] - M[1]) * n[1]; }
function clip(poly, M, n, sign) {
  var out = [];
  for (var i = 0; i < poly.length; i++) {
    var a = poly[i], b = poly[(i + 1) % poly.length], da = sign * side(a, M, n), db = sign * side(b, M, n);
    if (da >= 0) out.push(a);
    if ((da >= 0) !== (db >= 0)) { var t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
function pts(p) { return p.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' '); }
function poly(p, W, H) {
  if (p.length < 3) return 'polygon(0 0, 0 0, 0 0)';
  return 'polygon(' + p.map(function (q) { return (q[0] / W * 100).toFixed(2) + '% ' + (q[1] / H * 100).toFixed(2) + '%'; }).join(', ') + ')';
}
function ease(k) { return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }

document.querySelectorAll('.cover-real').forEach(function (cover) {
  var link = cover.closest('a'), id = 'sl' + (uid++);
  if (link) { link.setAttribute('draggable', 'false'); link.addEventListener('dragstart', function (e) { e.preventDefault(); }); }
  var img = cover.querySelector('img'); if (img) img.setAttribute('draggable', 'false');
  var frost = document.createElement('div'); frost.className = 'sleeve-frost';
  var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'sleeve-svg'); svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML =
    '<defs>' +
    '<linearGradient id="' + id + 's" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset=".34" stop-color="#fff" stop-opacity="0"/><stop offset=".44" stop-color="#fff" stop-opacity=".38"/><stop offset=".5" stop-color="#fff" stop-opacity=".07"/><stop offset=".72" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".16"/></linearGradient>' +
    '<linearGradient id="' + id + 'b" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3a2618" stop-opacity=".32"/><stop offset=".18" stop-color="#fff" stop-opacity=".78"/><stop offset=".6" stop-color="#fff" stop-opacity=".52"/><stop offset="1" stop-color="#fff" stop-opacity=".66"/></linearGradient>' +
    '<filter id="' + id + 'f" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>' +
    '</defs><polygon class="film" fill="url(#' + id + 's)"/><polygon class="cast" filter="url(#' + id + 'f)"/><polygon class="flap" fill="url(#' + id + 'b)"/><line class="crease"/>';
  var tab = document.createElement('span'); tab.className = 'sleeve-tab'; tab.setAttribute('aria-hidden', 'true'); tab.textContent = 'Peel';
  var hint = document.createElement('span'); hint.className = 'sr-only'; hint.textContent = ' (in a protective sleeve: activate once to peel it, again to open)';
  cover.append(frost, svg, tab); if (link) link.appendChild(hint);
  var film = svg.querySelector('.film'), cast = svg.querySelector('.cast'), flap = svg.querySelector('.flap'), crease = svg.querySelector('.crease'), sheen = svg.querySelector('#' + id + 's'), back = svg.querySelector('#' + id + 'b');

  var p = [1, 1], peeled = false, raf = 0, dragging = false, moved = false, swallow = false, start = null;

  function render() {
    var W = cover.clientWidth, H = cover.clientHeight; if (!W) return;
    var A = [W, H], P = [p[0] * W, p[1] * H], dx = A[0] - P[0], dy = A[1] - P[1], d = Math.hypot(dx, dy);
    var rect = [[0, 0], [W, 0], [W, H], [0, H]];
    sheen.setAttribute('x1', 0); sheen.setAttribute('y1', 0); sheen.setAttribute('x2', W); sheen.setAttribute('y2', H);
    tab.style.opacity = d > 4 ? 0 : '';
    if (d < .5) { film.setAttribute('points', pts(rect)); frost.style.clipPath = ''; flap.setAttribute('points', ''); cast.setAttribute('points', ''); crease.setAttribute('x1', 0); crease.setAttribute('x2', 0); crease.setAttribute('y1', 0); crease.setAttribute('y2', 0); return; }
    var n = [dx / d, dy / d], M = [(A[0] + P[0]) / 2, (A[1] + P[1]) / 2];
    var keep = clip(rect, M, n, -1), lifted = clip(rect, M, n, 1);
    var folded = lifted.map(function (X) { var k = 2 * side(X, M, n); return [X[0] - k * n[0], X[1] - k * n[1]]; });
    film.setAttribute('points', pts(keep)); frost.style.clipPath = poly(keep, W, H);
    flap.setAttribute('points', pts(folded));
    cast.setAttribute('points', pts(folded.map(function (X) { return [X[0] - n[0] * 7, X[1] - n[1] * 7 + 3]; })));
    back.setAttribute('x1', M[0]); back.setAttribute('y1', M[1]); back.setAttribute('x2', P[0]); back.setAttribute('y2', P[1]);
    var edge = keep.filter(function (X) { return Math.abs(side(X, M, n)) < .6; });
    if (edge.length >= 2) { crease.setAttribute('x1', edge[0][0]); crease.setAttribute('y1', edge[0][1]); crease.setAttribute('x2', edge[1][0]); crease.setAttribute('y2', edge[1][1]); }
  }
  function to(q, dur, done, fade) {
    cancelAnimationFrame(raf); var s = p.slice(), t0 = performance.now();
    (function f(t) {
      var k = Math.min(1, (t - t0) / dur), e = ease(k);
      p = [s[0] + (q[0] - s[0]) * e, s[1] + (q[1] - s[1]) * e - Math.sin(e * Math.PI) * .05 * (fade ? 1 : 0)];
      if (fade) svg.style.opacity = frost.style.opacity = String(1 - Math.max(0, (e - .55) / .45));
      render(); if (k < 1) raf = requestAnimationFrame(f); else if (done) done();
    })(t0);
  }
  function peel() {
    if (peeled) return; peeled = true; cover.classList.add('peeling');
    var done = function () { cover.classList.add('peeled'); frost.remove(); svg.remove(); tab.remove(); hint.textContent = ' (PDF)'; };
    if (still()) { cover.classList.add('peeled-fade'); setTimeout(done, 260); return; }
    to([-1.05, -.55], 1050, done, true);
  }

  cover.addEventListener('pointerenter', function (e) { if (!peeled && !dragging && e.pointerType === 'mouse' && !still()) to([.84, .9], 380); });
  cover.addEventListener('pointerleave', function () { if (!peeled && !dragging) to([1, 1], 420); });
  cover.addEventListener('pointerdown', function (e) {
    if (peeled || e.pointerType === 'touch' || e.button !== 0) return;
    dragging = true; moved = false; start = [e.clientX, e.clientY]; cover.setPointerCapture(e.pointerId);
  });
  cover.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    if (!moved && Math.hypot(e.clientX - start[0], e.clientY - start[1]) < 6) return;
    moved = true; cancelAnimationFrame(raf);
    var r = cover.getBoundingClientRect();
    p = [Math.max(-.6, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(-.6, Math.min(1, (e.clientY - r.top) / r.height))];
    render();
  });
  function up() {
    if (!dragging) return; dragging = false;
    if (!moved) return; swallow = true;
    if (Math.hypot(1 - p[0], 1 - p[1]) > .55) peel(); else to([1, 1], 420);
  }
  cover.addEventListener('pointerup', up); cover.addEventListener('pointercancel', up);
  (link || cover).addEventListener('click', function (e) {
    if (swallow) { swallow = false; e.preventDefault(); return; }
    if (!peeled) { e.preventDefault(); peel(); }
  });
  new ResizeObserver(render).observe(cover); render();
});
})();
