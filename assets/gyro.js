/* AmC gyroscope: a small dedicated WebGL renderer. Lit metal with real normals,
   a proper gimbal chain on a stand, contact shadow, inertia and scroll wind-up.
   Falls back to the static SVG if WebGL is unavailable. */
(function () {
'use strict';
var svg = document.querySelector('.amc .orbit');
if (!svg) return;
var root = document.documentElement, mq = matchMedia('(prefers-reduced-motion: reduce)');
function still() { return mq.matches || root.dataset.motion === 'reduced'; }

/* ---------- colour ---------- */
var probe = document.createElement('canvas').getContext('2d');
function rgb(css) {
  probe.fillStyle = '#000'; probe.fillStyle = css; var h = probe.fillStyle;
  if (h[0] === '#') return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16) / 255; });
  var m = h.match(/[\d.]+/g); return m ? m.slice(0, 3).map(function (n) { return n / 255; }) : [.6, .4, .25];
}
function v(name) { return rgb(getComputedStyle(root).getPropertyValue(name).trim()); }
function mix(a, b, k) { return a.map(function (x, i) { return x * (1 - k) + b[i] * k; }); }
var WHITE = [1, 1, 1], INK = [.1, .065, .045];

/* ---------- 4x4 matrices, column-major ---------- */
var M = {
  id: function () { return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]; },
  mul: function (a, b) { var o = new Array(16); for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) { var s = 0; for (var k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; },
  tr: function (x, y, z) { var m = M.id(); m[12] = x; m[13] = y; m[14] = z; return m; },
  rx: function (a) { var c = Math.cos(a), s = Math.sin(a); return [1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]; },
  ry: function (a) { var c = Math.cos(a), s = Math.sin(a); return [c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]; },
  rz: function (a) { var c = Math.cos(a), s = Math.sin(a); return [c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]; },
  persp: function (f, asp, n, fa) { var t = 1 / Math.tan(f / 2); return [t / asp,0,0,0, 0,t,0,0, 0,0,(fa + n) / (n - fa),-1, 0,0,2 * fa * n / (n - fa),0]; },
  chain: function () { var a = arguments, m = a[0]; for (var i = 1; i < a.length; i++) m = M.mul(m, a[i]); return m; }
};
function apply(m, p) { var x = p[0], y = p[1], z = p[2]; return [m[0]*x+m[4]*y+m[8]*z+m[12], m[1]*x+m[5]*y+m[9]*z+m[13], m[2]*x+m[6]*y+m[10]*z+m[14], m[3]*x+m[7]*y+m[11]*z+m[15]]; }

/* ---------- geometry: position + normal, indexed ---------- */
function torus(R, r, nu, nv) {
  var vs = [], is = [];
  for (var a = 0; a <= nu; a++) { var u = a / nu * 2 * Math.PI, cu = Math.cos(u), su = Math.sin(u);
    for (var b = 0; b <= nv; b++) { var w = b / nv * 2 * Math.PI, cw = Math.cos(w), sw = Math.sin(w);
      vs.push((R + r * cw) * cu, r * sw, (R + r * cw) * su, cu * cw, sw, su * cw); } }
  for (a = 0; a < nu; a++) for (b = 0; b < nv; b++) { var p = a * (nv + 1) + b, q = p + nv + 1; is.push(p, q, p + 1, q, q + 1, p + 1); }
  return { v: vs, i: is };
}
/* surface of revolution about Y; each profile is a smooth strip, profiles meet at hard edges */
function lathe(profiles, seg) {
  seg = seg || 40; var vs = [], is = [];
  profiles.forEach(function (pts) {
    var base = vs.length / 6, n = pts.length;
    for (var k = 0; k < n; k++) {
      var a = pts[Math.max(0, k - 1)], b = pts[Math.min(n - 1, k + 1)], tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      for (var s = 0; s <= seg; s++) { var t = s / seg * 2 * Math.PI, c = Math.cos(t), si = Math.sin(t); vs.push(pts[k][0] * c, pts[k][1], pts[k][0] * si, ty * c, -tx, ty * si); }
    }
    for (k = 0; k < n - 1; k++) for (var s2 = 0; s2 < seg; s2++) { var p = base + k * (seg + 1) + s2, q = p + seg + 1; is.push(p, q, p + 1, q, q + 1, p + 1); }
  });
  return { v: vs, i: is };
}
function cylinder(r, y0, y1, seg) { return lathe([[[0, y0], [r, y0]], [[r, y0], [r, y1]], [[r, y1], [0, y1]]], seg || 20); }
function sphere(r, n) { n = n || 18; var p = []; for (var k = 0; k <= n; k++) { var t = k / n * Math.PI; p.push([r * Math.sin(t), -r * Math.cos(t)]); } return lathe([p], n * 2); }
function cone(r, y0, y1) { return lathe([[[0, y0], [r, y0]], [[r, y0], [0, y1]]], 28); }

/* ---------- set up DOM ---------- */
var holder = document.createElement('div'); holder.className = 'orbital';
holder.innerHTML = '<div class="scene"><canvas tabindex="0" role="img" aria-label="Angular Momentum Capital gyroscope. Drag to orbit it, scroll the page to spin it up, press space for a kick, Home to reset."></canvas></div>' +
  '<div class="orbit-stages" role="group" aria-label="Explore Angular Momentum Capital"><button type="button" class="chip" aria-pressed="true">Research</button><button type="button" class="chip" aria-pressed="false">Signals</button><button type="button" class="chip" aria-pressed="false">Risk</button></div>' +
  '<p class="orbit-description" aria-live="polite"></p><p class="scene-caption">Drag to orbit · scroll to spin it up</p>';
svg.after(holder);
var canvas = holder.querySelector('canvas');
var gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
function fallback() { holder.remove(); svg.style.display = ''; }
if (!gl) { fallback(); return; }

function compile(vsSrc, fsSrc) {
  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s)); return s; }
  var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vsSrc)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fsSrc)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw Error('link'); return p;
}
var LIT, SHADOW;
try {
  LIT = compile(
    'attribute vec3 aP;attribute vec3 aN;uniform mat4 uMV,uPr;varying vec3 vN,vV;' +
    'void main(){vec4 p=uMV*vec4(aP,1.0);vV=p.xyz;vN=(uMV*vec4(aN,0.0)).xyz;gl_Position=uPr*p;}',
    'precision mediump float;varying vec3 vN,vV;' +
    'uniform vec3 uBase,uSpec,uSky,uGround,uGlowC;uniform float uAlpha,uShine,uMetal,uGlass,uGlow;' +
    'void main(){vec3 N=normalize(vN);if(!gl_FrontFacing)N=-N;vec3 V=normalize(-vV);' +
    'vec3 L1=normalize(vec3(-.5,.85,.6)),L2=normalize(vec3(.8,.2,.35)),L3=normalize(vec3(.2,.4,-.9));' +
    'float d1=max(dot(N,L1),0.),d2=max(dot(N,L2),0.),d3=max(dot(N,L3),0.);' +
    'float s1=pow(max(dot(N,normalize(L1+V)),0.),uShine),s2=pow(max(dot(N,normalize(L2+V)),0.),uShine*.5);' +
    'float fr=pow(1.-max(dot(N,V),0.),3.);' +
    'vec3 R=reflect(-V,N);float e=smoothstep(-.25,.65,R.y);vec3 env=mix(uGround,uSky,e);' +
    'vec3 amb=mix(uGround,uSky,N.y*.5+.5);' +
    'vec3 diff=uBase*(amb*.45+d1*.8+d2*.28)*(1.-uMetal*.5);' +
    'vec3 refl=env*mix(vec3(1.),uBase*1.6,uMetal)*(.18+.55*uMetal);' +
    'vec3 c=diff+refl*mix(.35,1.,fr)+uSpec*(s1*1.15+s2*.45)+uSky*d3*fr*.6+uGlowC*uGlow;' +
    'float a=uAlpha*mix(1.,.35+fr*.9,uGlass);gl_FragColor=vec4(c,a);}'
  );
  SHADOW = compile(
    'attribute vec2 aU;uniform mat4 uMVP;uniform vec3 uS;uniform vec2 uO;varying vec2 vU;void main(){vU=aU;gl_Position=uMVP*vec4(aU.x*uS.x+uO.x,uS.y,aU.y*uS.z+uO.y,1.0);}',
    'precision mediump float;varying vec2 vU;uniform vec3 uC;uniform float uA;void main(){float d=clamp(length(vU),0.,1.);float a=uA*pow(1.-d,2.2);gl_FragColor=vec4(uC,a);}'
  );
} catch (err) { fallback(); return; }
svg.style.display = 'none';

function locs(p, names) { var o = {}; names.forEach(function (n) { o[n] = gl.getUniformLocation(p, n); }); return o; }
var U = locs(LIT, ['uMV', 'uPr', 'uBase', 'uSpec', 'uSky', 'uGround', 'uGlowC', 'uAlpha', 'uShine', 'uMetal', 'uGlass', 'uGlow']);
var US = locs(SHADOW, ['uMVP', 'uS', 'uO', 'uC', 'uA']);
var aP = gl.getAttribLocation(LIT, 'aP'), aN = gl.getAttribLocation(LIT, 'aN'), aU = gl.getAttribLocation(SHADOW, 'aU');

var G = {};
function upload(name, mesh) {
  var vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.v), gl.STATIC_DRAW);
  var ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.i), gl.STATIC_DRAW);
  G[name] = { vb: vb, ib: ib, n: mesh.i.length };
}
/* a caged gyroscope balanced on a pedestal, tilted by THETA0 and precessing about the pivot */
var THETA0 = .5, PIVOT = -.5, TIP = 2.5, MID = .95;
var traceR = TIP * Math.sin(THETA0), traceY = PIVOT + TIP * Math.cos(THETA0);
function buildGeometry() {
  upload('base', lathe([
    [[0, -1.46], [.6, -1.46]],
    [[.6, -1.46], [.625, -1.447], [.632, -1.42], [.62, -1.395], [.58, -1.382]],
    [[.58, -1.382], [.15, -1.382]],
    [[.15, -1.382], [.1, -1.365], [.068, -1.31], [.052, -1.2], [.046, -.66]],
    [[.046, -.66], [.07, -.6], [.092, -.545], [.088, -.52]],
    [[.088, -.52], [.03, -.528], [0, -.532]]
  ], 64));
  upload('ring', torus(.78, .024, 128, 14));
  upload('rim', torus(.5, .046, 96, 18));
  upload('trace', torus(traceR, .006, 128, 6));
  upload('hub', lathe([[[0, -.075], [.045, -.07], [.07, -.04], [.075, 0], [.07, .04], [.045, .07], [0, .075]]], 32));
  upload('disc', cylinder(.48, -.008, .008, 64));
  upload('spoke', cylinder(.015, -.2, .2, 12));
  upload('axle', cylinder(.016, .1, 1.88, 14));
  upload('point', cone(.034, .12, 0));
  upload('shaft', cylinder(.013, 1.9, 2.32, 14));
  upload('tip', cone(.05, 2.3, TIP));
  upload('ball', sphere(.036));
  upload('bead', sphere(.028));
  var q = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, q); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW); G.quad = q;
}
buildGeometry();

/* ---------- scene graph: [geometry, frame, local matrix, material, part] ---------- */
var I = M.id(), PI = Math.PI, pulseY = .2;
var parts = [
  ['base', 'world', I, 'stand', 'risk'],
  ['ring', 'cage', M.chain(M.tr(0, MID, 0), M.rx(PI / 2)), 'brass', 'risk'],
  ['ring', 'cage', M.chain(M.tr(0, MID, 0), M.ry(PI / 2), M.rx(PI / 2)), 'brass', 'risk'],
  ['ball', 'cage', M.tr(0, MID + .78, 0), 'brass', 'risk'],
  ['ball', 'cage', M.tr(0, MID - .78, 0), 'brass', 'risk'],
  ['axle', 'cage', I, 'stand', null],
  ['point', 'cage', I, 'stand', null],
  ['ball', 'cage', M.tr(0, 1.9, 0), 'stand', null],
  ['shaft', 'cage', I, 'signal', 'signals'],
  ['tip', 'cage', I, 'signal', 'signals'],
  ['bead', 'cage', function () { return M.tr(0, pulseY, 0); }, 'glow', 'signals'],
  ['rim', 'rotor', I, 'brass', 'research'],
  ['hub', 'rotor', I, 'brass', 'research'],
  ['bead', 'rotor', M.tr(.5, .052, 0), 'glow', 'research']
];
for (var k = 0; k < 6; k++) parts.push(['spoke', 'rotor', M.chain(M.ry(k * PI / 3), M.tr(.27, 0, 0), M.rz(PI / 2)), 'brass', 'research']);
var glassParts = [
  ['disc', 'rotor', I, 'glass', 'research'],
  ['trace', 'world', M.tr(0, traceY, 0), 'traceMat', 'signals']
];

/* ---------- materials from the site palette ---------- */
var mats = {}, sky, ground, shadowC, dark;
function palette() {
  var A = v('--accent'), bg = v('--bg'), surf = v('--surface');
  dark = (bg[0] * .3 + bg[1] * .59 + bg[2] * .11) < .35;
  var glowC = mix(A, [1, .86, .6], .55);
  sky = mix(surf, WHITE, dark ? .35 : .65); ground = mix(bg, INK, dark ? .4 : .55);
  shadowC = dark ? [0, 0, 0] : mix(bg, INK, .85);
  var brass = dark ? A : mix(A, [.78, .52, .3], .35), standC = mix(brass, INK, .62);
  mats.brass = { base: brass, spec: mix(brass, WHITE, .6), shine: 70, metal: 1 };
  mats.stand = { base: standC, spec: mix(brass, WHITE, .35), shine: 50, metal: .85 };
  mats.signal = { base: mix(brass, glowC, .4), spec: [1, .95, .85], shine: 90, metal: .9 };
  mats.glow = { base: glowC, spec: WHITE, shine: 60, metal: .2, glow: .55, glowC: glowC };
  mats.glass = { base: mix(brass, WHITE, .55), spec: WHITE, shine: 120, metal: 0, alpha: .14, glass: 1 };
  mats.traceMat = { base: glowC, spec: WHITE, shine: 40, metal: 0, alpha: dark ? .55 : .45, glass: 1, glow: .4, glowC: glowC };
  mats.glowC = glowC;
}
palette();

/* ---------- state ---------- */
var stage = 0, STAGES = ['research', 'signals', 'risk'];
var descriptions = [
  'Start with a question and gather the evidence. The rotor is the engine that keeps the idea turning.',
  'Turn the idea into an explicit, testable rule. Like the vector L, a good signal holds its direction.',
  'Know the exposure and how a strategy can fail. The frame and stand keep everything upright.'
];
var YAW0 = .55, PITCH0 = .3;
var yaw = YAW0, pitch = PITCH0, yawVel = 0, spin = 0, prec = .8, nut = 0, nutAmp = .03, boost = 0, hoverX = 0, hoverY = 0, hx = 0, hy = 0, t0 = performance.now();
var W = 1, H = 1, visible = true, dirty = true, raf = 0, last = 0, lost = false;

var labels = [['L', 'cage', [.1, TIP + .12, 0]], ['ω', 'cage', [.0, MID + .2, .68]], ['Ω', 'world', [-traceR - .14, traceY, 0]]].map(function (l) {
  var s = document.createElement('span'); s.className = 'scene-label orbit-glyph'; s.textContent = l[0]; s.setAttribute('aria-hidden', 'true');
  canvas.parentElement.appendChild(s); return { el: s, frame: l[1], p: l[2] };
});

/* ---------- render ---------- */
function resize() {
  var r = canvas.getBoundingClientRect(); if (!r.width) return;
  W = r.width; H = r.height; var d = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(W * d); canvas.height = Math.round(H * d); dirty = true;
}
new ResizeObserver(resize).observe(canvas); resize();
if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) dirty = true; }).observe(canvas);

function draw(time) {
  if (lost) return;
  var asp = W / H, fov = asp < 1 ? .58 / Math.max(asp, .6) : .52;
  var P = M.persp(fov, asp, .1, 40);
  var V = M.chain(M.tr(0, -.06, -8.2), M.rx(pitch + hy), M.ry(yaw + hx));
  var tilt = THETA0 + nutAmp * Math.sin(nut);
  var F = { world: I, cage: M.chain(M.tr(0, PIVOT, 0), M.ry(prec), M.rz(tilt)) };
  F.rotor = M.chain(F.cage, M.tr(0, MID, 0), M.ry(spin));
  var body = apply(F.cage, [0, MID, 0]);
  var pulse = still() ? 0 : .5 + .5 * Math.sin(time * .004);

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  /* contact shadow: wide soft pass then a tight dark one */
  gl.disable(gl.DEPTH_TEST); gl.useProgram(SHADOW);
  gl.bindBuffer(gl.ARRAY_BUFFER, G.quad); gl.enableVertexAttribArray(aU); gl.vertexAttribPointer(aU, 2, gl.FLOAT, false, 0, 0);
  gl.uniformMatrix4fv(US.uMVP, false, M.mul(P, V)); gl.uniform3fv(US.uC, shadowC);
  gl.uniform2f(US.uO, body[0] * .9, body[2] * .9); gl.uniform3f(US.uS, 1.05, -1.466, .9); gl.uniform1f(US.uA, dark ? .4 : .2); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.uniform2f(US.uO, 0, 0); gl.uniform3f(US.uS, 1.25, -1.465, 1.05); gl.uniform1f(US.uA, dark ? .45 : .24); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.uniform3f(US.uS, .78, -1.464, .7); gl.uniform1f(US.uA, dark ? .6 : .42); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.disableVertexAttribArray(aU);

  gl.enable(gl.DEPTH_TEST); gl.useProgram(LIT);
  gl.uniformMatrix4fv(U.uPr, false, P); gl.uniform3fv(U.uSky, sky); gl.uniform3fv(U.uGround, ground);
  gl.enableVertexAttribArray(aP); gl.enableVertexAttribArray(aN);
  function render(list, transparent) {
    gl.depthMask(!transparent);
    list.forEach(function (p) {
      var g = G[p[0]], m = mats[p[3]], local = typeof p[2] === 'function' ? p[2]() : p[2];
      var hot = p[4] && p[4] === STAGES[stage];
      gl.uniformMatrix4fv(U.uMV, false, M.chain(V, F[p[1]], local));
      gl.uniform3fv(U.uBase, hot && !m.glow ? mix(m.base, mats.glowC, .25) : m.base); gl.uniform3fv(U.uSpec, m.spec);
      gl.uniform1f(U.uShine, m.shine); gl.uniform1f(U.uMetal, m.metal); gl.uniform1f(U.uGlass, m.glass || 0);
      gl.uniform1f(U.uAlpha, (m.alpha || 1) * (hot && m.glass ? 1.5 : 1));
      gl.uniform3fv(U.uGlowC, m.glowC || mats.glowC);
      gl.uniform1f(U.uGlow, (m.glow || 0) + (hot ? .1 + .12 * pulse : 0));
      gl.bindBuffer(gl.ARRAY_BUFFER, g.vb);
      gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 24, 0); gl.vertexAttribPointer(aN, 3, gl.FLOAT, false, 24, 12);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.ib); gl.drawElements(gl.TRIANGLES, g.n, gl.UNSIGNED_SHORT, 0);
    });
  }
  render(parts, false); render(glassParts, true); gl.depthMask(true);

  var VP = M.mul(P, V);
  labels.forEach(function (l) {
    var c = apply(M.mul(VP, F[l.frame]), l.p);
    if (c[3] <= 0) { l.el.style.opacity = 0; return; }
    l.el.style.opacity = '';
    l.el.style.left = Math.max(14, Math.min(W - 14, (c[0] / c[3] * .5 + .5) * W)) + 'px';
    l.el.style.top = Math.max(12, Math.min(H - 12, (1 - (c[1] / c[3] * .5 + .5)) * H)) + 'px';
  });
  dirty = false;
}

/* ---------- motion ---------- */
function step(dt, time) {
  var spinRate = 3.4 + boost;
  spin += spinRate * dt;
  prec += (1.7 / spinRate) * dt;                 /* faster spin, slower precession */
  nut += (5 + spinRate * .6) * dt;
  nutAmp = Math.max(.022, nutAmp * Math.pow(.35, dt));
  boost *= Math.pow(.42, dt);
  pulseY = pulseY + dt * 1.2; if (pulseY > TIP - .2) pulseY = .15;
}
function tick(time) {
  raf = requestAnimationFrame(tick);
  if (!visible || document.hidden) { last = time; return; }
  var dt = Math.min(.05, (time - last) / 1000 || 0); last = time;
  if (!dragging && Math.abs(yawVel) > .001) { yaw += yawVel * dt; yawVel *= Math.pow(.08, dt); dirty = true; }
  hx += (hoverX - hx) * Math.min(1, dt * 6); hy += (hoverY - hy) * Math.min(1, dt * 6);
  if (!still()) { step(dt, time); dirty = true; }
  if (dirty) draw(time);
}
raf = requestAnimationFrame(tick);

/* ---------- interaction ---------- */
var dragging = false, lx = 0, ly = 0, lt = 0;
canvas.addEventListener('pointerdown', function (e) {
  if (e.button !== 0) return; dragging = true; lx = e.clientX; ly = e.clientY; lt = performance.now(); yawVel = 0;
  canvas.setPointerCapture(e.pointerId); canvas.classList.add('grabbing');
});
canvas.addEventListener('pointermove', function (e) {
  if (!dragging) {
    if (e.pointerType === 'mouse') { var r = canvas.getBoundingClientRect(); hoverX = ((e.clientX - r.left) / r.width - .5) * .18; hoverY = ((e.clientY - r.top) / r.height - .5) * .1; dirty = true; }
    return;
  }
  var now = performance.now(), dx = e.clientX - lx, dy = e.clientY - ly, dt = Math.max(1, now - lt) / 1000;
  yaw += dx * .009; if (e.pointerType === 'mouse') pitch = Math.max(-.05, Math.min(.95, pitch + dy * .005));
  yawVel = yawVel * .5 + (dx * .009 / dt) * .5; lx = e.clientX; ly = e.clientY; lt = now; dirty = true;
});
function release() { dragging = false; canvas.classList.remove('grabbing'); if (performance.now() - lt > 80) yawVel = 0; }
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (n) { canvas.addEventListener(n, release); });
canvas.addEventListener('pointerleave', function () { hoverX = hoverY = 0; });
canvas.addEventListener('keydown', function (e) {
  var used = true;
  if (e.key === 'ArrowLeft') yaw -= .15; else if (e.key === 'ArrowRight') yaw += .15;
  else if (e.key === 'ArrowUp') pitch = Math.max(-.05, pitch - .1); else if (e.key === 'ArrowDown') pitch = Math.min(.95, pitch + .1);
  else if (e.key === 'Home') { yaw = YAW0; pitch = PITCH0; yawVel = 0; }
  else if (e.key === ' ') { boost = Math.min(20, boost + 9); nutAmp = Math.min(.14, nutAmp + .06); }
  else used = false;
  if (used) { e.preventDefault(); dirty = true; }
});
var lastY = window.scrollY;
window.addEventListener('scroll', function () {
  var dy = window.scrollY - lastY; lastY = window.scrollY;
  if (!visible || still() || dragging) return;
  boost = Math.min(20, boost + Math.abs(dy) * .035);
  nutAmp = Math.min(.12, nutAmp + Math.abs(dy) * .00025);
  yaw += dy * .0016; dirty = true;
}, { passive: true });

var buttons = holder.querySelectorAll('.orbit-stages button'), desc = holder.querySelector('.orbit-description');
desc.textContent = descriptions[0];
buttons.forEach(function (b, i) {
  function pick() { stage = i; buttons.forEach(function (x, j) { x.setAttribute('aria-pressed', String(i === j)); }); desc.textContent = descriptions[i]; dirty = true; }
  b.addEventListener('click', pick); b.addEventListener('focus', pick);
  b.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') pick(); });
});

new MutationObserver(function () { palette(); dirty = true; }).observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-contrast'] });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { palette(); dirty = true; });
canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; cancelAnimationFrame(raf); fallback(); });
window.addEventListener('pagehide', function () { cancelAnimationFrame(raf); });
window.addEventListener('pageshow', function (e) { if (e.persisted) { last = performance.now(); raf = requestAnimationFrame(tick); } });
})();
